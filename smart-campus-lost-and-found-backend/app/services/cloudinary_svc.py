import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def upload_item_image(file: UploadFile) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    contents = await file.read()
    try:
        result = cloudinary.uploader.upload(
            contents,
            folder="campus_lost_found",
            resource_type="image",
        )
        return result["secure_url"]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Image upload failed: {exc}")
