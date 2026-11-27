import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from database.connection import get_db
from database.models import Order, Appointment, PriceConfig, Pattern
from api.schemas import OrderStatusUpdateSchema, PriceUpdateSchema, PatternCreateSchema
from bot.notifications import notify_user_status_changed, STATUS_NAMES
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

def verify_admin(x_telegram_user_id: Optional[int] = Header(None, alias="X-Telegram-User-Id")):
    """Verifies that the request comes from an authorized admin."""
    # Note: in WebApp frontend, X-Telegram-User-Id is passed from initData
    if not x_telegram_user_id or x_telegram_user_id not in settings.ADMIN_CHAT_IDS:
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуется аккаунт администратора")
    return x_telegram_user_id

@router.get("/orders")
async def list_admin_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=200),
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    stmt = select(Order).order_by(Order.id.desc())
    if status and status != "all":
        stmt = stmt.where(Order.status == status)
    stmt = stmt.limit(limit)

    orders = (await db.execute(stmt)).scalars().all()
    return {"orders": [o.to_dict() for o in orders]}

@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateSchema,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    old_status = order.status
    order.status = payload.status
    await db.commit()
    await db.refresh(order)

    order_dict = order.to_dict()

    # Automatically notify client via Telegram bot on status change!
    if old_status != payload.status:
        try:
            await notify_user_status_changed(order.user_id, order_dict, payload.status)
        except Exception as e:
            logger.error(f"Error notifying client about status change: {e}")

    return {
        "success": True,
        "message": f"Статус обновлён: {STATUS_NAMES.get(payload.status, payload.status)}",
        "order": order_dict,
    }

@router.get("/appointments")
async def list_admin_appointments(
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    stmt = select(Appointment).order_by(Appointment.date.desc(), Appointment.time_slot.asc()).limit(100)
    apps = (await db.execute(stmt)).scalars().all()
    return {"appointments": [a.to_dict() for a in apps]}

@router.get("/prices")
async def get_all_prices(
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    stmt = select(PriceConfig).order_by(PriceConfig.id.asc())
    prices = (await db.execute(stmt)).scalars().all()
    return {"prices": [p.to_dict() for p in prices]}

@router.post("/prices/{price_id}")
async def update_price(
    price_id: int,
    payload: PriceUpdateSchema,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    price_obj = await db.get(PriceConfig, price_id)
    if not price_obj:
        raise HTTPException(status_code=404, detail="Позиция не найдена")

    price_obj.price = payload.price
    if payload.is_active is not None:
        price_obj.is_active = payload.is_active
    await db.commit()
    return {"success": True, "price": price_obj.to_dict()}

@router.post("/patterns")
async def add_pattern(
    payload: PatternCreateSchema,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    pattern = Pattern(
        car_make=payload.car_make.strip(),
        car_model=payload.car_model.strip(),
        year_from=payload.year_from,
        year_to=payload.year_to,
        has_3d=payload.has_3d,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(pattern)
    await db.commit()
    await db.refresh(pattern)
    return {"success": True, "pattern": pattern.to_dict()}

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    # Total and status counts
    new_orders = (await db.execute(select(func.count(Order.id)).where(Order.status == "new"))).scalar() or 0
    in_work = (await db.execute(select(func.count(Order.id)).where(Order.status == "in_progress"))).scalar() or 0
    ready = (await db.execute(select(func.count(Order.id)).where(Order.status == "ready"))).scalar() or 0
    completed = (await db.execute(select(func.count(Order.id)).where(Order.status == "completed"))).scalar() or 0
    total_appointments = (await db.execute(select(func.count(Appointment.id)).where(Appointment.status == "confirmed"))).scalar() or 0

    return {
        "new_orders": new_orders,
        "in_progress_orders": in_work,
        "ready_orders": ready,
        "completed_orders": completed,
        "active_appointments": total_appointments,
    }
