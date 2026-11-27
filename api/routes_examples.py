import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.connection import get_db
from database.models import WorkExample
from api.routes_admin import verify_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/examples", tags=["examples"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "webapp", "static", "uploads")

@router.get("")
async def get_work_examples(db: AsyncSession = Depends(get_db)):
    """Public endpoint to get all active portfolio works."""
    stmt = (
        select(WorkExample)
        .where(WorkExample.is_active == True)
        .order_by(WorkExample.id.desc())
    )
    res = (await db.execute(stmt)).scalars().all()
    return {"examples": [e.to_dict() for e in res]}

@router.post("")
async def add_work_example(
    car_name: str = Form(...),
    description: str = Form(...),
    badge: Optional[str] = Form(None),
    mat_color: Optional[str] = Form("black"),
    edge_color: Optional[str] = Form("red"),
    cell_type: Optional[str] = Form("romb"),
    image_url: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    """Admin endpoint to create a new portfolio work with optional photo upload."""
    final_image_url = (image_url or "").strip()

    if image_file and image_file.filename:
        try:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            # Create unique filename
            ext = os.path.splitext(image_file.filename)[1].lower()
            if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"]:
                ext = ".jpg"
            unique_name = f"eva_{uuid.uuid4().hex[:10]}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)

            content = await image_file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            final_image_url = f"/static/uploads/{unique_name}"
            logger.info(f"Uploaded new portfolio photo: {final_image_url}")
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}")
            raise HTTPException(status_code=500, detail="Ошибка при сохранении фотографии")

    if not final_image_url:
        final_image_url = "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&auto=format&fit=crop&q=80"

    example = WorkExample(
        car_name=car_name.strip(),
        badge=badge.strip() if badge else None,
        description=description.strip(),
        image_url=final_image_url,
        mat_color=mat_color or "black",
        edge_color=edge_color or "red",
        cell_type=cell_type or "romb",
        is_active=True,
    )
    db.add(example)
    await db.commit()
    await db.refresh(example)

    return {"success": True, "example": example.to_dict()}

@router.delete("/{example_id}")
async def delete_work_example(
    example_id: int,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    """Admin endpoint to delete a portfolio work."""
    example = await db.get(WorkExample, example_id)
    if not example:
        raise HTTPException(status_code=404, detail="Пример работы не найден")

    # If it was a local uploaded file, delete it
    if example.image_url and example.image_url.startswith("/static/uploads/"):
        filename = os.path.basename(example.image_url)
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.warning(f"Failed to remove file {file_path}: {e}")

    await db.delete(example)
    await db.commit()
    return {"success": True, "message": "Пример работы удален"}
