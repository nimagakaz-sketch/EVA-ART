from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.connection import get_db
from database.models import PriceConfig, FAQ
from config import settings

router = APIRouter(prefix="/config", tags=["config"])

AVAILABLE_COLORS_MAT = [
    {"id": "black", "name": "Чёрный", "hex": "#1a1a1a", "border": "#333"},
    {"id": "graphite", "name": "Графит", "hex": "#2c2f36", "border": "#444"},
    {"id": "gray", "name": "Серый", "hex": "#6c727d", "border": "#888"},
    {"id": "beige", "name": "Бежевый", "hex": "#c2b280", "border": "#a89b6b"},
    {"id": "brown", "name": "Коричневый", "hex": "#503020", "border": "#6a402a"},
    {"id": "blue", "name": "Тёмно-синий", "hex": "#1b2a47", "border": "#283c66"},
    {"id": "red", "name": "Красный", "hex": "#8a1c1c", "border": "#a82424"},
]

AVAILABLE_COLORS_EDGE = [
    {"id": "black", "name": "Чёрный", "hex": "#111111"},
    {"id": "red", "name": "Красный", "hex": "#e02020"},
    {"id": "blue", "name": "Синий", "hex": "#2060e0"},
    {"id": "gray", "name": "Серый", "hex": "#888888"},
    {"id": "graphite", "name": "Тёмно-серый", "hex": "#404040"},
    {"id": "orange", "name": "Оранжевый", "hex": "#ff7700"},
    {"id": "yellow", "name": "Жёлтый", "hex": "#e6b800"},
    {"id": "beige", "name": "Бежевый", "hex": "#d4c59b"},
    {"id": "purple", "name": "Фиолетовый", "hex": "#7c3aed"},
    {"id": "white", "name": "Белый", "hex": "#f0f0f0"},
]

CELL_TYPES = [
    {"id": "romb", "name": "Ромб", "description": "Классическая строгая геометрия"},
    {"id": "sota", "name": "Сота", "description": "Современные шестигранные ячейки"},
]

@router.get("")
async def get_public_config(db: AsyncSession = Depends(get_db)):
    # Fetch active prices
    stmt_prices = select(PriceConfig).where(PriceConfig.is_active == True)
    prices_res = (await db.execute(stmt_prices)).scalars().all()
    prices = [p.to_dict() for p in prices_res]

    # Fetch FAQ
    stmt_faq = select(FAQ).order_by(FAQ.order_num.asc())
    faq_res = (await db.execute(stmt_faq)).scalars().all()
    faq = [f.to_dict() for f in faq_res]

    return {
        "company": {
            "name": settings.COMPANY_NAME,
            "slogan": settings.SLOGAN,
            "city": settings.CITY,
            "address": settings.ADDRESS,
            "hint": settings.HINT,
            "phone": settings.PHONE,
            "phone_tel": settings.PHONE_TEL,
            "maps_yandex": settings.MAPS_YANDEX,
            "maps_2gis": settings.MAPS_2GIS,
        },
        "prices": prices,
        "colors_mat": AVAILABLE_COLORS_MAT,
        "colors_edge": AVAILABLE_COLORS_EDGE,
        "cell_types": CELL_TYPES,
        "faq": faq,
        "admin_ids": settings.ADMIN_CHAT_IDS,
    }
