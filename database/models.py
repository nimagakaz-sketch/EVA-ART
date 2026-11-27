from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    Boolean,
    DateTime,
    Date,
    Index,
)
from database.connection import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(BigInteger, nullable=True, index=True)
    user_name = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=False, index=True)
    
    # Car details
    car_make = Column(String(128), nullable=False, index=True)
    car_model = Column(String(128), nullable=False, index=True)
    car_year = Column(String(32), nullable=True)
    has_pattern = Column(Boolean, default=False)
    
    # Configuration
    package_type = Column(String(128), nullable=False) # standard, 3d_borders, trunk_only, full_set
    cell_type = Column(String(32), nullable=False) # romb, sota
    mat_color = Column(String(64), nullable=False) # black, graphite, gray, beige, red, blue, etc.
    edge_color = Column(String(64), nullable=False) # black, red, blue, gray, white, orange, etc.
    heel_pad = Column(String(64), default="none") # none, polymer, metal
    badges_count = Column(Integer, default=0) # 0, 2, 4
    
    # Pricing & Delivery
    total_price = Column(Integer, nullable=False)
    estimated_days = Column(String(128), default="1-2 рабочих дня")
    delivery_type = Column(String(255), nullable=False) # pickup_box3, delivery_cdek
    comment = Column(Text, nullable=True)
    
    # Status: new, in_progress, ready, completed, cancelled
    status = Column(String(32), default="new", nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "order_number": self.order_number,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "phone": self.phone,
            "car_make": self.car_make,
            "car_model": self.car_model,
            "car_year": self.car_year,
            "has_pattern": self.has_pattern,
            "package_type": self.package_type,
            "cell_type": self.cell_type,
            "mat_color": self.mat_color,
            "edge_color": self.edge_color,
            "heel_pad": self.heel_pad,
            "badges_count": self.badges_count,
            "total_price": self.total_price,
            "estimated_days": self.estimated_days,
            "delivery_type": self.delivery_type,
            "comment": self.comment,
            "status": self.status,
            "created_at": self.created_at.strftime("%d.%m.%Y %H:%M") if self.created_at else "",
            "updated_at": self.updated_at.strftime("%d.%m.%Y %H:%M") if self.updated_at else "",
        }


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=True, index=True)
    user_name = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    car_info = Column(String(128), nullable=False)
    date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    time_slot = Column(String(16), nullable=False) # 10:00, 12:00, 14:00, 16:00, 18:00
    purpose = Column(String(64), default="Замер и консультация") # Замер, Установка
    comment = Column(Text, nullable=True)
    status = Column(String(32), default="confirmed", nullable=False) # confirmed, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_appointment_date_slot", "date", "time_slot"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "phone": self.phone,
            "car_info": self.car_info,
            "date": self.date,
            "time_slot": self.time_slot,
            "purpose": self.purpose,
            "comment": self.comment,
            "status": self.status,
            "created_at": self.created_at.strftime("%d.%m.%Y %H:%M") if self.created_at else "",
        }


class PriceConfig(Base):
    __tablename__ = "prices_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(128), nullable=False)
    category = Column(String(32), nullable=False) # package, addon, heel_pad, badge
    price = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "title": self.title,
            "category": self.category,
            "price": self.price,
            "description": self.description,
            "is_active": self.is_active,
        }


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    car_make = Column(String(64), nullable=False, index=True)
    car_model = Column(String(64), nullable=False, index=True)
    year_from = Column(Integer, nullable=True)
    year_to = Column(Integer, nullable=True)
    has_3d = Column(Boolean, default=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_pattern_make_model", "car_make", "car_model"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "car_make": self.car_make,
            "car_model": self.car_model,
            "year_from": self.year_from,
            "year_to": self.year_to,
            "has_3d": self.has_3d,
            "notes": self.notes,
        }


class FAQ(Base):
    __tablename__ = "faq"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(String(255), nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(64), default="general")
    order_num = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "category": self.category,
            "order_num": self.order_num,
        }


class TimeSlot(Base):
    __tablename__ = "time_slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot = Column(String(16), unique=True, nullable=False, index=True) # e.g. "10:00"
    is_active = Column(Boolean, default=True, nullable=False)
    order_num = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "slot": self.slot,
            "is_active": self.is_active,
            "order_num": self.order_num,
        }
