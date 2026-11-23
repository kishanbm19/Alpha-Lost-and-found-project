from datetime import date
from typing import Literal, Optional
from uuid import UUID
from fastapi import (
    APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
)
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.auth import get_current_user, get_optional_current_user
from app.database import get_db
from app.models import Item, Match, User, Claim, Notification
from app.schemas import CategoryEnum, ItemPublicOut, MatchOut, PaginatedItemsOut, ItemUpdate
from app.services.ai_matcher import run_matching_pipeline
from app.services.cloudinary_svc import upload_item_image

router = APIRouter(prefix="/items", tags=["Lost & Found Items"])


@router.post("", response_model=ItemPublicOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    background_tasks: BackgroundTasks,
    report_type: Literal["lost", "found"] = Form(...),
    title: str = Form(..., min_length=2, max_length=120),
    description: str = Form(..., min_length=5),
    category: CategoryEnum = Form(...),
    location: str = Form(..., min_length=2, max_length=100),
    event_date: date = Form(...),
    hidden_details: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if report_type == "found" and not image:
        raise HTTPException(
            status_code=400,
            detail="An image upload is required when reporting a found item.",
        )

    image_url = await upload_item_image(image) if image else None

    item = Item(
        reporter_id=current_user.id,
        report_type=report_type,
        title=title,
        description=description,
        category=category,
        location=location,
        event_date=event_date,
        image_url=image_url,
        hidden_details=hidden_details,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    background_tasks.add_task(run_matching_pipeline, item.id)
    return item


@router.get("", response_model=PaginatedItemsOut)
def list_items(
    report_type: Optional[Literal["lost", "found"]] = Query(None),
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("open", alias="status"),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    query = db.query(Item)
    if report_type:
        query = query.filter(Item.report_type == report_type)
    if category:
        query = query.filter(Item.category == category)
    if location:
        query = query.filter(Item.location.ilike(f"%{location}%"))
    if status_filter:
        query = query.filter(Item.status == status_filter)
    if q:
        query = query.filter(
            or_(Item.title.ilike(f"%{q}%"), Item.description.ilike(f"%{q}%"))
        )

    total = query.count()
    items = (
        query.order_by(Item.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return PaginatedItemsOut(total=total, page=page, limit=limit, items=items)


@router.get("/my", response_model=list[ItemPublicOut])
def get_my_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Item)
        .filter(Item.reporter_id == current_user.id)
        .order_by(Item.created_at.desc())
        .all()
    )


@router.get("/{item_id}", response_model=ItemPublicOut)
def get_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return item


@router.patch("/{item_id}", response_model=ItemPublicOut)
def update_item(
    item_id: UUID,
    payload: ItemUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    if item.reporter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this report.")

    recompute = False
    if payload.title is not None and payload.title.strip() != item.title:
        item.title = payload.title.strip()
        recompute = True
    if payload.description is not None and payload.description.strip() != item.description:
        item.description = payload.description.strip()
        recompute = True
    if payload.category is not None and payload.category != item.category:
        item.category = payload.category
        recompute = True
    if payload.location is not None:
        item.location = payload.location.strip()
    if payload.event_date is not None:
        item.event_date = payload.event_date
    if payload.status is not None:
        item.status = payload.status
    if payload.hidden_details is not None:
        item.hidden_details = payload.hidden_details.strip()

    db.commit()
    db.refresh(item)

    if recompute:
        background_tasks.add_task(run_matching_pipeline, item.id)

    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    if item.reporter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this report.")

    db.query(Match).filter(or_(Match.lost_item_id == item_id, Match.found_item_id == item_id)).delete()
    db.query(Claim).filter(Claim.item_id == item_id).delete()
    db.query(Notification).filter(Notification.item_id == item_id).delete()
    db.delete(item)
    db.commit()
    return None


@router.get("/{item_id}/matches", response_model=list[MatchOut])
def get_item_matches(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    if item.reporter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view matches for this item.")

    matches = (
        db.query(Match)
        .filter(
            or_(Match.lost_item_id == item_id, Match.found_item_id == item_id),
            Match.is_dismissed == False,  # noqa: E712
        )
        .order_by(Match.combined_score.desc())
        .all()
    )
    return matches


@router.patch("/{item_id}/matches/{match_id}/dismiss", response_model=MatchOut)
def dismiss_match(
    item_id: UUID,
    match_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    if match.lost_item_id != item_id and match.found_item_id != item_id:
        raise HTTPException(status_code=400, detail="Match does not belong to this item.")

    item = db.query(Item).filter(Item.id == item_id).first()
    if item and item.reporter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to dismiss this match.")

    match.is_dismissed = True
    db.commit()
    db.refresh(match)
    return match
