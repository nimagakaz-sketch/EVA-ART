from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database.connection import get_db
from database.models import Pattern

router = APIRouter(prefix="/patterns", tags=["patterns"])

@router.get("/check")
async def check_pattern(
    make: str = Query(..., min_length=1),
    model: str = Query(..., min_length=1),
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Checks whether ready patterns exist for given car make and model."""
    clean_make = make.strip().lower()
    clean_model = model.strip().lower()

    stmt = select(Pattern).where(
        func.lower(Pattern.car_make) == clean_make,
        func.lower(Pattern.car_model) == clean_model,
    )
    result = await db.execute(stmt)
    pattern = result.scalars().first()

    # If exact model not matched, try ILIKE search
    if not pattern:
        stmt_ilike = select(Pattern).where(
            func.lower(Pattern.car_make) == clean_make,
            func.lower(Pattern.car_model).ilike(f"%{clean_model}%"),
        )
        pattern = (await db.execute(stmt_ilike)).scalars().first()

    if pattern:
        # Check year range if provided
        year_valid = True
        if year:
            if pattern.year_from and year < pattern.year_from:
                year_valid = False
            if pattern.year_to and year > pattern.year_to:
                year_valid = False

        return {
            "has_pattern": year_valid,
            "badge_text": "Есть готовые лекала (изготовление без замера)" if year_valid else "Потребуется бесплатный замер в боксе №3",
            "pattern": pattern.to_dict(),
            "year_match": year_valid,
        }

    return {
        "has_pattern": False,
        "badge_text": "Потребуется бесплатный замер в боксе №3",
        "pattern": None,
        "year_match": False,
    }

@router.get("/makes")
async def get_popular_makes(db: AsyncSession = Depends(get_db)):
    """Returns distinct list of car makes in patterns table."""
    stmt = select(Pattern.car_make).distinct().order_by(Pattern.car_make.asc())
    makes = (await db.execute(stmt)).scalars().all()
    return {"makes": makes}

@router.get("/models")
async def get_models_by_make(make: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    """Returns list of models for a given car make."""
    stmt = select(Pattern).where(func.lower(Pattern.car_make) == make.strip().lower()).order_by(Pattern.car_model.asc())
    patterns = (await db.execute(stmt)).scalars().all()
    return {"models": [p.to_dict() for p in patterns]}
