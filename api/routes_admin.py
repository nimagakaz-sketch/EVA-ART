import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from database.connection import get_db
from database.models import Order, Appointment, PriceConfig, Pattern, TimeSlot
from api.schemas import OrderStatusUpdateSchema, PriceUpdateSchema, PatternCreateSchema, SlotCreateSchema
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

@router.delete("/orders/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    await db.delete(order)
    await db.commit()
    return {"success": True, "message": f"Заказ {order.order_number} удалён"}

@router.get("/appointments")
async def list_admin_appointments(
    purpose: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    stmt = select(Appointment).order_by(Appointment.date.desc(), Appointment.time_slot.asc()).limit(150)
    if purpose and purpose != "all":
        # match substring: "замер", "установка", "консультация"
        stmt = stmt.where(Appointment.purpose.ilike(f"%{purpose}%"))
    if status and status != "all":
        stmt = stmt.where(Appointment.status == status)

    apps = (await db.execute(stmt)).scalars().all()
    return {"appointments": [a.to_dict() for a in apps]}

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    app = await db.get(Appointment, appointment_id)
    if not app:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    await db.delete(app)
    await db.commit()
    return {"success": True, "message": "Запись удалена"}

@router.post("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    payload: OrderStatusUpdateSchema,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    app = await db.get(Appointment, appointment_id)
    if not app:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    app.status = payload.status
    await db.commit()
    return {"success": True, "message": f"Статус записи обновлен: {payload.status}"}


@router.get("/slots")
async def get_all_slots(
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    stmt = select(TimeSlot).order_by(TimeSlot.order_num.asc(), TimeSlot.slot.asc())
    slots = (await db.execute(stmt)).scalars().all()
    return {"slots": [s.to_dict() for s in slots]}

@router.post("/slots")
async def add_slot(
    payload: SlotCreateSchema,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    clean_slot = payload.slot.strip()
    if len(clean_slot) == 4 and clean_slot[1] == ':':
        clean_slot = '0' + clean_slot

    stmt = select(TimeSlot).where(TimeSlot.slot == clean_slot)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.is_active = True
        await db.commit()
        return {"success": True, "slot": existing.to_dict()}

    new_slot = TimeSlot(slot=clean_slot, is_active=True)
    db.add(new_slot)
    await db.commit()
    await db.refresh(new_slot)
    return {"success": True, "slot": new_slot.to_dict()}

@router.post("/slots/{slot_id}/toggle")
async def toggle_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    slot = await db.get(TimeSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    slot.is_active = not slot.is_active
    await db.commit()
    return {"success": True, "slot": slot.to_dict()}

@router.delete("/slots/{slot_id}")
async def delete_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(verify_admin),
):
    slot = await db.get(TimeSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    await db.delete(slot)
    await db.commit()
    return {"success": True}

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
