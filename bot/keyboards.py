from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from config import settings

def get_main_reply_keyboard() -> ReplyKeyboardMarkup:
    """Persistent main keyboard at bottom of chat."""
    kb = [
        [
            KeyboardButton(
                text="🚀 Открыть конфигуратор EVA-ART",
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )
        ],
        [
            KeyboardButton(text="📍 Адрес и как проехать"),
            KeyboardButton(text="📞 Позвонить"),
        ],
        [
            KeyboardButton(text="📋 Мои заказы"),
            KeyboardButton(text="📅 Запись в бокс", web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}#appointment")),
        ],
    ]
    return ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)

def get_start_inline_keyboard() -> InlineKeyboardMarkup:
    """Inline buttons under welcome message."""
    buttons = [
        [
            InlineKeyboardButton(
                text="✨ Собрать коврики в Mini App",
                web_app=WebAppInfo(url=settings.WEBAPP_URL),
            )
        ],
        [
            InlineKeyboardButton(
                text="📅 Записаться на замер",
                web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}#appointment"),
            ),
        ],
        [
            InlineKeyboardButton(
                text="🗺 Яндекс.Карты",
                url=settings.MAPS_YANDEX,
            ),
            InlineKeyboardButton(
                text="🏢 2ГИС",
                url=settings.MAPS_2GIS,
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать мастеру в TG",
                url="https://t.me/youngyannniii",
            ),
            InlineKeyboardButton(
                text="📞 Телефон",
                callback_data="show_phone",
            ),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_order_admin_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Inline buttons for admin notifications to quickly change order status."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="⚙️ В работу", callback_data=f"status:{order_id}:in_progress"),
                InlineKeyboardButton(text="✅ Готово (в боксе)", callback_data=f"status:{order_id}:ready"),
            ],
            [
                InlineKeyboardButton(text="📦 Выдан / Оплачен", callback_data=f"status:{order_id}:completed"),
                InlineKeyboardButton(text="❌ Отменить", callback_data=f"status:{order_id}:cancelled"),
            ],
        ]
    )
