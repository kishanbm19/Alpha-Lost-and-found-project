from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Claim, Item, Notification, User
from app.schemas import AdminClaimDecision, AdminClaimOut, ClaimCreate, ClaimOut

router = APIRouter(tags=["Claims & Verification"])


@router.post("/claims", response_model=ClaimOut, status_code=status.HTTP_201_CREATED)
def submit_claim(
    payload: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    if item.report_type != "found":
        raise HTTPException(status_code=400, detail="Claims can only be submitted on found items.")
    if item.status == "resolved":
        raise HTTPException(status_code=400, detail="This item has already been returned.")

    existing = (
        db.query(Claim)
        .filter(Claim.item_id == payload.item_id, Claim.claimant_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"You have already submitted a claim for this item (Current status: {existing.status}).",
        )

    claim = Claim(
        item_id=payload.item_id,
        claimant_id=current_user.id,
        proof_description=payload.proof_description,
    )
    item.status = "under_review"
    db.add(claim)
    if item.reporter_id != current_user.id:
        db.add(
            Notification(
                user_id=item.reporter_id,
                item_id=item.id,
                type="claim_submitted",
                message=f"A student has submitted an ownership claim for your found item '{item.title}'.",
            )
        )
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/claims/my", response_model=list[ClaimOut])
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Claim)
        .filter(Claim.claimant_id == current_user.id)
        .order_by(Claim.created_at.desc())
        .all()
    )


@router.get("/admin/claims", response_model=list[AdminClaimOut])
def list_admin_claims(
    status_filter: str = "pending",
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    claims = (
        db.query(Claim)
        .filter(Claim.status == status_filter)
        .order_by(Claim.created_at.asc())
        .all()
    )
    results = []
    for c in claims:
        results.append(
            AdminClaimOut(
                id=c.id,
                item_id=c.item_id,
                claimant_id=c.claimant_id,
                proof_description=c.proof_description,
                status=c.status,
                admin_notes=c.admin_notes,
                created_at=c.created_at,
                item_title=c.item.title,
                item_image_url=c.item.image_url,
                item_hidden_details=c.item.hidden_details,
                claimant_name=c.claimant.full_name,
                claimant_email=c.claimant.email,
            )
        )
    return results


@router.patch("/admin/claims/{claim_id}", response_model=ClaimOut)
def decide_claim(
    claim_id: UUID,
    decision: AdminClaimDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    claim.status = decision.status
    claim.admin_notes = decision.admin_notes

    if decision.status == "approved":
        claim.item.status = "resolved"
        competing = (
            db.query(Claim)
            .filter(Claim.item_id == claim.item_id, Claim.id != claim.id, Claim.status == "pending")
            .all()
        )
        for other in competing:
            other.status = "rejected"
            db.add(
                Notification(
                    user_id=other.claimant_id,
                    item_id=claim.item_id,
                    type="claim_rejected",
                    message=f"Another claimant was verified as the owner of '{claim.item.title}'.",
                )
            )
        msg = f"Your claim for '{claim.item.title}' was APPROVED! Visit the campus desk for handover."
        notif_type = "claim_approved"
    else:
        still_pending = (
            db.query(Claim)
            .filter(Claim.item_id == claim.item_id, Claim.id != claim.id, Claim.status == "pending")
            .count()
        )
        if still_pending == 0:
            claim.item.status = "open"
        msg = f"Your claim for '{claim.item.title}' was rejected due to insufficient proof."
        notif_type = "claim_rejected"

    db.add(
        Notification(
            user_id=claim.claimant_id,
            item_id=claim.item_id,
            type=notif_type,
            message=msg,
        )
    )
    db.commit()
    db.refresh(claim)
    return claim
