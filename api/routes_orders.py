import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database.connection import get_db
from database.models import Order
from api.schemas import OrderCreateSchema
from bot.notifications import notify_user_order_created, notify_admin_order_created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])

async def generate_order_number(db: AsyncSession) -> str:
    """Generates unique friendly order number like EVA-2611-001."""
    now = datetime.utcnow()
    date_prefix = f"EVA-{now.strftime('%y%m')}"
    stmt = select(func.count(Order.id)).where(Order.order_number.like(f"{date_prefix}%"))
    count = (await db.execute(stmt)).scalar() or 0
    return f"{date_prefix}-{count + 1:03d}"

@router.post("")
async def create_order(payload: OrderCreateSchema, db: AsyncSession = Depends(get_db)):
    order_number = await generate_order_number(db)

    order = Order(
        order_number=order_number,
        user_id=payload.user_id,
        user_name=payload.user_name.strip(),
        phone=payload.phone.strip(),
        car_make=payload.car_make.strip(),
        car_model=payload.car_model.strip(),
        car_year=payload.car_year.strip() if payload.car_year else None,
        has_pattern=payload.has_pattern,
        package_type=payload.package_type,
        cell_type=payload.cell_type,
        mat_color=payload.mat_color,
        edge_color=payload.edge_color,
        heel_pad=payload.heel_pad,
        badges_count=payload.badges_count,
        total_price=payload.total_price,
        estimated_days=payload.estimated_days,
        delivery_type=payload.delivery_type,
        comment=payload.comment.strip() if payload.comment else None,
        status="new",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    order_dict = order.to_dict()

    # Async notifications to User and Admin
    try:
        await notify_user_order_created(order.user_id, order_dict)
    except Exception as e:
        logger.error(f"Error notifying user: {e}")

    try:
        await notify_admin_order_created(order_dict)
    except Exception as e:
        logger.error(f"Error notifying admin: {e}")

    return {
        "success": True,
        "message": "Заказ успешно оформлен",
        "order": order_dict,
    }

@router.get("/{order_id}")
async def get_order_by_id(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return {"order": order.to_dict()}

@router.get("/user/{user_id}")
async def get_user_orders(user_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Order).where(Order.user_id == user_id).order_by(Order.id.desc()).limit(20)
    orders = (await db.execute(stmt)).scalars().all()
    return {"orders": [o.to_dict() for o in orders]}
