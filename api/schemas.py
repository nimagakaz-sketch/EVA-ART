from typing import Optional, List
from pydantic import BaseModel, Field

class OrderCreateSchema(BaseModel):
    user_id: Optional[int] = None
    user_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    car_make: str = Field(..., min_length=1)
    car_model: str = Field(..., min_length=1)
    car_year: Optional[str] = None
    has_pattern: bool = False
    package_type: str = "Стандартный салон"
    cell_type: str = "Ромб" # Ромб / Сота
    mat_color: str = "Чёрный"
    edge_color: str = "Чёрный"
    heel_pad: str = "Без подпятника"
    badges_count: int = 0
    total_price: int = Field(..., ge=0)
    estimated_days: str = "1-2 рабочих дня"
    delivery_type: str = "Самовывоз / Установка в боксе №3"
    comment: Optional[str] = None

class OrderStatusUpdateSchema(BaseModel):
    status: str = Field(..., pattern="^(new|in_progress|ready|completed|cancelled)$")

class AppointmentCreateSchema(BaseModel):
    user_id: Optional[int] = None
    user_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    car_info: str = Field(..., min_length=2)
    date: str = Field(..., min_length=10, max_length=10) # YYYY-MM-DD
    time_slot: str = Field(..., min_length=4) # 10:00, 12:00, etc.
    purpose: str = "Замер и консультация"
    comment: Optional[str] = None

class AppointmentStatusUpdateSchema(BaseModel):
    status: str = Field(..., pattern="^(confirmed|completed|cancelled)$")

class PatternCreateSchema(BaseModel):
    car_make: str = Field(..., min_length=1)
    car_model: str = Field(..., min_length=1)
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    has_3d: bool = True
    notes: Optional[str] = None

class PriceUpdateSchema(BaseModel):
    price: int = Field(..., ge=0)
    is_active: Optional[bool] = True
