import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import CommandStart, Command
from sqlalchemy import select
from bot.keyboards import get_main_reply_keyboard, get_start_inline_keyboard
from database.connection import AsyncSessionLocal
from database.models import Order
from config import settings

logger = logging.getLogger(__name__)

router = Router(name="start_router")

WELCOME_TEXT = (
    "🚗 <b>Добро пожаловать в «Автоковрики EVA-ART»!</b>\n"
    "<i>«Если ЕВА коврики, то EVA-ART»</i>\n\n"
    "Мастерская индивидуального пошива автоковриков в городе <b>Кемерово</b>.\n\n"
    "✨ <b>Наши преимущества:</b>\n"
    "• Точные заводские и индивидуальные лекала под каждое авто\n"
    "• Глубокие ячейки <b>Ромб</b> и <b>Сота</b> — удерживают до 2.5 л воды и песка\n"
    "• <b>3D-формовка</b> с высокими бортами без единого разреза\n"
    "• 100+ комбинаций цветов материала и окантовки\n"
    "• Изготовление от 2 часов, официальная гарантия 12 месяцев\n\n"
    "📍 <b>Наш бокс:</b> г. Кемерово, ул. Карболитовская, д. 12, бокс №3 (въезд в арку)\n"
    "📞 <b>Телефон:</b> <a href='tel:+79512229999'>+7 951 222 9999</a>\n\n"
    "👇 <i>Нажмите кнопку ниже, чтобы открыть конфигуратор и рассчитать точную стоимость для вашего авто:</i>"
)

CONTACTS_TEXT = (
    "📍 <b>Мастерская «Автоковрики EVA-ART»</b>\n"
    "<i>«Если ЕВА коврики, то EVA-ART»</i>\n\n"
    "🏢 <b>Адрес:</b> г. Кемерово, ул. Карболитовская, д. 12, бокс №3\n"
    "🚪 <b>Как проехать:</b> Въезд в арку со стороны ул. Карболитовская, далее во дворе бокс №3 (вывеска EVA-ART).\n\n"
    "📞 <b>Телефон:</b> <a href='tel:+79512229999'>+7 951 222 9999</a>\n"
    "⏰ <b>График работы:</b> Пн-Сб с 10:00 до 19:00, Вс по предварительной записи.\n\n"
    "🗺 <b>Навигация:</b>\n"
    f"• <a href='{settings.MAPS_YANDEX}'>Открыть в Яндекс.Картах</a>\n"
    f"• <a href='{settings.MAPS_2GIS}'>Открыть в 2ГИС</a>"
)

@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        text=WELCOME_TEXT,
        reply_markup=get_start_inline_keyboard(),
    )
    # Also ensure the persistent reply keyboard is sent
    await message.answer(
        text="Используйте меню внизу для быстрого доступа к конфигуратору и контактам:",
        reply_markup=get_main_reply_keyboard(),
    )

@router.message(F.text == "📍 Адрес и как проехать")
async def show_contacts(message: Message):
    await message.answer(
        text=CONTACTS_TEXT,
        disable_web_page_preview=True,
    )
    # Send location coordinate of Karbolitovskaya 12, Kemerovo
    try:
        await message.answer_location(latitude=55.3725, longitude=86.0655)
    except Exception as e:
        logger.debug(f"Could not send location pin: {e}")

@router.message(F.text == "📞 Позвонить")
async def show_phone(message: Message):
    await message.answer(
        f"📞 <b>Связь с мастером EVA-ART:</b>\n\n"
        f"Телефон: <a href='tel:+79512229999'>+7 951 222 9999</a>\n"
        f"Адрес: г. Кемерово, ул. Карболитовская, д. 12, бокс №3 (въезд в арку)\n\n"
        f"Мы с радостью ответим на любые вопросы, поможем подобрать цвет и запишем на замер!"
    )

@router.message(F.text == "📋 Мои заказы")
async def show_my_orders(message: Message):
    user_id = message.from_user.id if message.from_user else 0
    if not user_id:
        await message.answer("Не удалось определить ваш Telegram ID.")
        return

    async with AsyncSessionLocal() as session:
        stmt = (
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.id.desc())
            .limit(10)
        )
        res = await session.execute(stmt)
        orders = res.scalars().all()

    if not orders:
        await message.answer(
            "У вас пока нет оформленных заказов.\n"
            "Нажмите кнопку <b>«🚀 Открыть конфигуратор EVA-ART»</b> ниже, чтобы выбрать авто и рассчитать стоимость!",
            reply_markup=get_start_inline_keyboard(),
        )
        return

    from bot.notifications import STATUS_NAMES
    lines = ["📋 <b>Ваши заказы в EVA-ART:</b>\n"]
    for o in orders:
        st_name = STATUS_NAMES.get(o.status, o.status)
        lines.append(
            f"🔹 <b>{o.order_number}</b> — {o.car_make} {o.car_model}\n"
            f"   Статус: <b>{st_name}</b>\n"
            f"   Сумма: {o.total_price} ₽ | Дата: {o.created_at.strftime('%d.%m.%Y')}\n"
        )
    await message.answer("\n".join(lines))
