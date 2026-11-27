import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.connection import get_db
from database.models import Appointment
from api.schemas import AppointmentCreateSchema
from bot.notifications import notify_appointment_created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])

STANDARD_SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00"]

@router.get("/available-slots")
async def get_available_slots(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: AsyncSession = Depends(get_db),
):
    """Returns list of slots for a given date with booked status."""
    stmt = select(Appointment.time_slot).where(
        Appointment.date == date,
        Appointment.status != "cancelled",
    )
    booked_slots = set((await db.execute(stmt)).scalars().all())

    slots_info = []
    for slot in STANDARD_SLOTS:
        slots_info.append({
            "slot": slot,
            "is_available": slot not in booked_slots,
        })

    return {
        "date": date,
        "slots": slots_info,
    }

@router.post("")
async def create_appointment(payload: AppointmentCreateSchema, db: AsyncSession = Depends(get_db)):
    # Check if slot is already occupied
    stmt = select(Appointment).where(
        Appointment.date == payload.date,
        Appointment.time_slot == payload.time_slot,
        Appointment.status != "cancelled",
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Этот временной слот уже занят. Пожалуйста, выберите другое время.")

    appointment = Appointment(
        user_id=payload.user_id,
        user_name=payload.user_name.strip(),
        phone=payload.phone.strip(),
        car_info=payload.car_info.strip(),
        date=payload.date,
        time_slot=payload.time_slot,
        purpose=payload.purpose,
        comment=payload.comment.strip() if payload.comment else None,
        status="confirmed",
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    app_dict = appointment.to_dict()

    try:
        await notify_appointment_created(app_dict)
    except Exception as e:
        logger.error(f"Error sending appointment notification: {e}")

    return {
        "success": True,
        "message": "Вы успешно записаны на замер / установку",
        "appointment": app_dict,
    }
