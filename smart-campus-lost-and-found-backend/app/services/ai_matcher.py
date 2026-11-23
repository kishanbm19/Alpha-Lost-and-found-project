import logging
from uuid import UUID
import httpx
import numpy as np
from huggingface_hub import InferenceClient
from app.config import settings
from app.database import SessionLocal
from app.models import Item, Match, Notification

logger = logging.getLogger(__name__)

TEXT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # 384-dim
IMAGE_MODEL = "openai/clip-vit-base-patch32"           # 512-dim
MATCH_THRESHOLD = 0.72

hf_client = InferenceClient(token=settings.HF_TOKEN)


def _l2_normalize(vec: list[float]) -> list[float]:
    arr = np.asarray(vec, dtype=np.float32).flatten()
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


def get_text_embedding(title: str, category: str, description: str) -> list[float]:
    prompt = f"{title} | Category: {category} | {description}"
    raw = hf_client.feature_extraction(prompt, model=TEXT_MODEL)
    arr = np.asarray(raw, dtype=np.float32)
    if arr.ndim == 2:
        arr = arr.mean(axis=0)
    return _l2_normalize(arr.tolist())


def get_image_embedding(image_url: str) -> list[float]:
    resp = httpx.get(image_url, timeout=15.0)
    resp.raise_for_status()
    raw = hf_client.feature_extraction(resp.content, model=IMAGE_MODEL)
    arr = np.asarray(raw, dtype=np.float32)
    if arr.ndim == 2:
        arr = arr.mean(axis=0)
    return _l2_normalize(arr.tolist())


def compute_hybrid_score(
    image_score: float | None,
    text_score: float,
    same_category: bool,
) -> float:
    if image_score is not None:
        base = (0.60 * image_score) + (0.40 * text_score)
    else:
        base = text_score

    if same_category:
        base = min(1.0, base + 0.05)
    return round(float(base), 4)


def run_matching_pipeline(item_id: UUID):
    """Background task triggered after a new item is created."""
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            return

        item.text_embedding = get_text_embedding(item.title, item.category, item.description)
        if item.image_url:
            try:
                item.image_embedding = get_image_embedding(item.image_url)
            except Exception as img_err:
                logger.warning(f"Image embedding failed for {item_id}: {img_err}")

        db.commit()
        db.refresh(item)

        opposite_type = "found" if item.report_type == "lost" else "lost"
        candidates = (
            db.query(Item)
            .filter(
                Item.report_type == opposite_type,
                Item.status == "open",
                Item.text_embedding.isnot(None),
            )
            .all()
        )

        for cand in candidates:
            text_sim = float(np.dot(item.text_embedding, cand.text_embedding))
            img_sim = None
            if item.image_embedding is not None and cand.image_embedding is not None:
                img_sim = float(np.dot(item.image_embedding, cand.image_embedding))

            combined = compute_hybrid_score(
                image_score=img_sim,
                text_score=text_sim,
                same_category=(item.category == cand.category),
            )

            if combined >= MATCH_THRESHOLD:
                lost_item = item if item.report_type == "lost" else cand
                found_item = cand if item.report_type == "lost" else item

                exists = (
                    db.query(Match)
                    .filter(
                        Match.lost_item_id == lost_item.id,
                        Match.found_item_id == found_item.id,
                    )
                    .first()
                )
                if not exists:
                    match_row = Match(
                        lost_item_id=lost_item.id,
                        found_item_id=found_item.id,
                        image_score=round(img_sim, 4) if img_sim is not None else None,
                        text_score=round(text_sim, 4),
                        combined_score=combined,
                    )
                    db.add(match_row)

                    notif = Notification(
                        user_id=lost_item.reporter_id,
                        item_id=found_item.id,
                        type="match_found",
                        message=f"Potential match ({int(combined * 100)}%) found for your lost '{lost_item.title}'!",
                    )
                    db.add(notif)

        db.commit()
    except Exception as exc:
        logger.error(f"Matching pipeline error for item {item_id}: {exc}")
        db.rollback()
    finally:
        db.close()
