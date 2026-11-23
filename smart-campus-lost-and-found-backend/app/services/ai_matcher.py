import logging
import io
import re
from typing import Optional, List, Set
from uuid import UUID
import httpx
import numpy as np
from PIL import Image
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError
from app.config import settings
from app.database import SessionLocal
from app.models import Item, Match, Notification

logger = logging.getLogger(__name__)

# Model configuration
TEXT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"  # 384-dimensional
IMAGE_MODEL_ID = "openai/clip-vit-base-patch32"           # 512-dimensional

# Expected strict vector dimensions
EXPECTED_TEXT_DIM = 384
EXPECTED_IMAGE_DIM = 512

# Calibrated similarity threshold and configurable weights
MATCH_THRESHOLD = 0.65  # Calibrated for campus lost & found pairs
WEIGHT_TEXT_WITH_IMAGE = 0.50
WEIGHT_IMAGE = 0.35
WEIGHT_METADATA_WITH_IMAGE = 0.15

WEIGHT_TEXT_ONLY = 0.80
WEIGHT_METADATA_TEXT_ONLY = 0.20


hf_client = InferenceClient(token=settings.HF_TOKEN if settings.HF_TOKEN else None)

# Lazy-loaded local models for resilient offline execution
_local_text_model = None
_local_clip_model = None
_local_clip_processor = None


def _get_local_text_model():
    """Lazy-loads SentenceTransformer for local execution if remote API is unavailable."""
    global _local_text_model
    if _local_text_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Initializing local SentenceTransformer (%s)...", TEXT_MODEL_ID)
            _local_text_model = SentenceTransformer(TEXT_MODEL_ID)
        except Exception as exc:
            logger.error("Failed to load local SentenceTransformer: %s", exc)
            _local_text_model = False
    return _local_text_model if _local_text_model is not False else None


def _get_local_clip():
    """Lazy-loads CLIPModel and CLIPProcessor for local execution."""
    global _local_clip_model, _local_clip_processor
    if _local_clip_model is None:
        try:
            from transformers import CLIPModel, CLIPProcessor
            logger.info("Initializing local CLIP model (%s)...", IMAGE_MODEL_ID)
            _local_clip_processor = CLIPProcessor.from_pretrained(IMAGE_MODEL_ID)
            _local_clip_model = CLIPModel.from_pretrained(IMAGE_MODEL_ID)
        except Exception as exc:
            logger.error("Failed to load local CLIP model: %s", exc)
            _local_clip_model = False
            _local_clip_processor = False
    if _local_clip_model is not False and _local_clip_processor is not False:
        return _local_clip_model, _local_clip_processor
    return None, None


def l2_normalize(vec: list[float] | np.ndarray) -> list[float]:
    """Applies L2 normalization to ensure unit length."""
    arr = np.asarray(vec, dtype=np.float32).flatten()
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


def cosine_similarity(u: list[float] | np.ndarray, v: list[float] | np.ndarray) -> float:
    """Calculates cosine similarity between two numeric vectors in [0.0, 1.0]."""
    arr_u = np.asarray(u, dtype=np.float32).flatten()
    arr_v = np.asarray(v, dtype=np.float32).flatten()
    norm_u = np.linalg.norm(arr_u)
    norm_v = np.linalg.norm(arr_v)
    if norm_u == 0.0 or norm_v == 0.0:
        return 0.0
    dot = float(np.dot(arr_u, arr_v))
    sim = dot / (norm_u * norm_v)
    return float(np.clip(sim, 0.0, 1.0))


def get_text_embedding(title: str, category: str, description: str) -> Optional[List[float]]:
    """
    Generates a 384-dimensional L2-normalized text embedding.
    Uses Hugging Face InferenceClient, falling back to local SentenceTransformer if API is unavailable.
    Returns None if embedding could not be generated. Never generates fake hash vectors.
    """
    clean_title = (title or "").strip()
    clean_category = (category or "").strip()
    clean_description = (description or "").strip()
    prompt = f"{clean_title} | Category: {clean_category} | {clean_description}".strip()

    if not prompt:
        return None

    # Step 1: Try Hugging Face InferenceClient
    if settings.HF_TOKEN:
        try:
            raw = hf_client.feature_extraction(prompt, model=TEXT_MODEL_ID)
            arr = np.asarray(raw, dtype=np.float32)

            # Handle token-level embeddings vs pooled sentence embeddings
            if arr.ndim == 3:  # (batch_size, seq_len, 384)
                arr = arr[0].mean(axis=0)
            elif arr.ndim == 2:  # (seq_len, 384)
                arr = arr.mean(axis=0)

            arr = arr.flatten()
            if arr.shape[0] == EXPECTED_TEXT_DIM:
                return l2_normalize(arr)
            else:
                logger.warning(
                    "HF API returned unexpected dimension %d (expected %d)",
                    arr.shape[0],
                    EXPECTED_TEXT_DIM,
                )
        except (HfHubHTTPError, httpx.HTTPError, Exception) as exc:
            logger.info("HF Inference API text embedding unavailable (%s). Using local engine.", exc)

    # Step 2: Local fallback with SentenceTransformer
    local_model = _get_local_text_model()
    if local_model is not None:
        try:
            vec = local_model.encode(prompt, normalize_embeddings=True)
            arr = np.asarray(vec, dtype=np.float32).flatten()
            if arr.shape[0] == EXPECTED_TEXT_DIM:
                return arr.tolist()
        except Exception as exc:
            logger.error("Local text model encoding failed: %s", exc)

    logger.warning("Could not generate valid text embedding for item '%s'", title)
    return None


def get_image_embedding(image_url: str) -> Optional[List[float]]:
    """
    Downloads an image from Cloudinary/URL and generates a 512-dimensional L2-normalized CLIP embedding.
    Returns None if image is missing, corrupt, or model is unavailable. Never generates fake hash vectors.
    """
    if not image_url or not image_url.strip():
        return None

    try:
        resp = httpx.get(image_url.strip(), timeout=15.0)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception as exc:
        logger.warning("Failed to download or parse image from '%s': %s", image_url, exc)
        return None

    clip_model, clip_processor = _get_local_clip()
    if clip_model is not None and clip_processor is not None:
        try:
            import torch
            inputs = clip_processor(images=img, return_tensors="pt")
            with torch.no_grad():
                out = clip_model.get_image_features(**inputs)

            if hasattr(out, "pooler_output") and out.pooler_output is not None:
                tensor = out.pooler_output
            elif hasattr(out, "last_hidden_state") and out.last_hidden_state is not None:
                tensor = out.last_hidden_state[:, 0]
            elif isinstance(out, torch.Tensor):
                tensor = out
            else:
                tensor = out[0]

            arr = tensor.squeeze().detach().cpu().numpy().astype(np.float32).flatten()
            if arr.shape[0] == EXPECTED_IMAGE_DIM:
                return l2_normalize(arr)
            else:
                logger.warning(
                    "CLIP image embedding returned dimension %d (expected %d)",
                    arr.shape[0],
                    EXPECTED_IMAGE_DIM,
                )
        except Exception as exc:
            logger.error("Local CLIP image embedding extraction failed: %s", exc)

    return None


def extract_keywords(text: str) -> Set[str]:
    """Extracts distinctive brand, color, or descriptive keywords from text."""
    if not text:
        return set()
    stopwords = {
        "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with",
        "of", "by", "from", "is", "was", "are", "were", "my", "it", "this", "that"
    }
    words = re.findall(r"[a-z0-9]{3,}", text.lower())
    return {w for w in words if w not in stopwords}


def compute_metadata_similarity(lost_item: Item, found_item: Item) -> float:
    """
    Computes metadata similarity using category, location, and title/description keywords (brand/color).
    Returns a score between 0.0 and 1.0.
    """
    score = 0.0
    components = 0

    # 1. Category match (exact match gives high confidence)
    cat_lost = (lost_item.category or "").strip().lower()
    cat_found = (found_item.category or "").strip().lower()
    if cat_lost and cat_found:
        components += 1
        if cat_lost == cat_found:
            score += 1.0

    # 2. Location match (same campus zone or partial overlap)
    loc_lost = (lost_item.location or "").strip().lower()
    loc_found = (found_item.location or "").strip().lower()
    if loc_lost and loc_found:
        components += 1
        if loc_lost == loc_found:
            score += 1.0
        elif loc_lost in loc_found or loc_found in loc_lost:
            score += 0.6

    # 3. Keyword / Brand / Color overlap between titles and descriptions
    text_lost = f"{lost_item.title} {lost_item.description}"
    text_found = f"{found_item.title} {found_item.description}"
    kw_lost = extract_keywords(text_lost)
    kw_found = extract_keywords(text_found)
    if kw_lost and kw_found:
        components += 1
        intersection = kw_lost.intersection(kw_found)
        union = kw_lost.union(kw_found)
        jaccard = len(intersection) / len(union) if union else 0.0
        score += min(1.0, jaccard * 2.0)

    return float(score / components) if components > 0 else 0.0


def compute_hybrid_score(
    text_score: float,
    image_score: Optional[float],
    metadata_score: float,
) -> float:
    """
    Computes final weighted hybrid score.
    Uses configurable weights depending on whether image similarity is available.
    """
    if image_score is not None:
        combined = (
            (WEIGHT_TEXT_WITH_IMAGE * text_score)
            + (WEIGHT_IMAGE * image_score)
            + (WEIGHT_METADATA_WITH_IMAGE * metadata_score)
        )
    else:
        combined = (
            (WEIGHT_TEXT_ONLY * text_score)
            + (WEIGHT_METADATA_TEXT_ONLY * metadata_score)
        )

    return round(float(np.clip(combined, 0.0, 1.0)), 4)


def run_matching_pipeline(item_id: UUID):
    """
    Background matching pipeline triggered after a lost or found report is submitted:
    1. Computes and saves true semantic embeddings (MiniLM 384-dim text, CLIP 512-dim image).
    2. Compares against active opposite-type candidates in PostgreSQL.
    3. Ranks matches by hybrid similarity.
    4. Prevents duplicate match records and duplicate notifications.
    """
    db = SessionLocal()
    try:
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            logger.warning("Matching pipeline: item %s not found.", item_id)
            return

        # 1. Compute and validate text embedding (384-dim)
        text_vec = get_text_embedding(item.title, item.category, item.description)
        if text_vec and len(text_vec) == EXPECTED_TEXT_DIM:
            item.text_embedding = text_vec
        else:
            item.text_embedding = None

        # 2. Compute and validate image embedding (512-dim)
        if item.image_url:
            img_vec = get_image_embedding(item.image_url)
            if img_vec and len(img_vec) == EXPECTED_IMAGE_DIM:
                item.image_embedding = img_vec
            else:
                item.image_embedding = None
        else:
            item.image_embedding = None

        db.commit()
        db.refresh(item)

        # If item has no valid text embedding, do not attempt to match
        if item.text_embedding is None:
            logger.info("Item %s has no text embedding; skipping candidate matching.", item.id)
            return

        # 3. Retrieve opposite active items that have valid text embeddings
        opposite_type = "found" if item.report_type == "lost" else "lost"
        candidates = (
            db.query(Item)
            .filter(
                Item.report_type == opposite_type,
                Item.status == "open",
                Item.text_embedding.isnot(None),
                Item.id != item.id,
            )
            .all()
        )

        for cand in candidates:
            # Validate candidate text embedding
            if cand.text_embedding is None or len(cand.text_embedding) != EXPECTED_TEXT_DIM:
                continue

            # Calculate cosine similarities
            text_sim = cosine_similarity(item.text_embedding, cand.text_embedding)

            img_sim = None
            if item.image_embedding is not None and cand.image_embedding is not None:
                if len(item.image_embedding) == EXPECTED_IMAGE_DIM and len(cand.image_embedding) == EXPECTED_IMAGE_DIM:
                    img_sim = cosine_similarity(item.image_embedding, cand.image_embedding)

            # Metadata similarity (category, location, keywords)
            lost_ref = item if item.report_type == "lost" else cand
            found_ref = cand if item.report_type == "lost" else item
            metadata_sim = compute_metadata_similarity(lost_ref, found_ref)

            # Combined score
            combined = compute_hybrid_score(text_sim, img_sim, metadata_sim)

            if combined >= MATCH_THRESHOLD:
                lost_item = lost_ref
                found_item = found_ref

                # Prevent duplicate match record
                existing_match = (
                    db.query(Match)
                    .filter(
                        Match.lost_item_id == lost_item.id,
                        Match.found_item_id == found_item.id,
                    )
                    .first()
                )

                if not existing_match:
                    match_row = Match(
                        lost_item_id=lost_item.id,
                        found_item_id=found_item.id,
                        image_score=round(img_sim, 4) if img_sim is not None else None,
                        text_score=round(text_sim, 4),
                        combined_score=combined,
                        is_dismissed=False,
                    )
                    db.add(match_row)

                    # Prevent duplicate notification
                    existing_notif = (
                        db.query(Notification)
                        .filter(
                            Notification.user_id == lost_item.reporter_id,
                            Notification.item_id == found_item.id,
                            Notification.type == "match_found",
                        )
                        .first()
                    )

                    if not existing_notif:
                        notif = Notification(
                            user_id=lost_item.reporter_id,
                            item_id=found_item.id,
                            type="match_found",
                            message=f"Potential match ({int(combined * 100)}%) found for your lost '{lost_item.title}'!",
                        )
                        db.add(notif)

        db.commit()
    except Exception as exc:
        logger.error("Matching pipeline error for item %s: %s", item_id, exc, exc_info=True)
        db.rollback()
    finally:
        db.close()
