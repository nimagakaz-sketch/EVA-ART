import logging
from bot.instance import get_bot
from config import settings

logger = logging.getLogger(__name__)

STATUS_NAMES = {
    "new": "Новый",
    "in_progress": "В работе / Раскрой",
    "ready": "Готово (ждёт в боксе №3)",
    "completed": "Выдан и оплачен",
    "cancelled": "Отменён",
}

STATUS_MESSAGES = {
    "in_progress": (
        "⚙️ <b>Ваш заказ {order_number} передан в работу!</b>\n\n"
        "Мастер приступил к раскрою и пошиву комплекта на <b>{car}</b>.\n"
        "Срок изготовления: {estimated_days}.\n"
        "Мы пришлём уведомление сразу, как только комплект будет готов к выдаче или установке."
    ),
    "ready": (
        "🎉 <b>Ваш комплект EVA-ART готов!</b>\n\n"
        "Заказ: <b>{order_number}</b> ({car})\n"
        "Ждём вас на бесплатную примерку и установку по адресу:\n"
        "📍 <b>г. Кемерово, ул. Карболитовская, д. 12, бокс №3</b> (въезд в арку).\n\n"
        "📞 Контактный телефон: <a href='tel:+79512229999'>+7 951 222 9999</a>\n"
        "Если вы заказывали доставку, трек-номер будет отправлен в ближайшее время."
    ),
    "completed": (
        "🤝 <b>Спасибо за заказ в мастерской EVA-ART!</b>\n\n"
        "Заказ <b>{order_number}</b> отмечен как выданный. "
        "Пусть коврики радуют вас чистотой и комфортом в любую сибирскую погоду!\n\n"
        "Гарантия на изделие: 12 месяцев. "
        "Будем благодарны за отзыв и рекомендацию друзьям!"
    ),
    "cancelled": (
        "❌ <b>Заказ {order_number} отменён</b>.\n\n"
        "Если у вас возникли вопросы или вы хотите изменить параметры заказа, "
        "позвоните нам по телефону: <a href='tel:+79512229999'>+7 951 222 9999</a>."
    ),
}

async def notify_user_order_created(user_id: int | None, order: dict):
    if not user_id:
        return
    bot = get_bot()
    try:
        text = (
            f"🎉 <b>Заявка принята в работу!</b>\n\n"
            f"Номер заказа: <b>{order['order_number']}</b>\n"
            f"Автомобиль: <b>{order['car_make']} {order['car_model']} ({order['car_year'] or 'год не указан'})</b>\n"
            f"Комплектация: <b>{order['package_type']}</b>\n"
            f"Цвет: <b>{order['mat_color']}</b>, кант: <b>{order['edge_color']}</b>\n"
            f"Ячейка: <b>{order['cell_type']}</b>\n"
            f"Подпятник: <b>{order['heel_pad']}</b> | Шильдики: <b>{order['badges_count']} шт.</b>\n"
            f"Итоговая стоимость: <b>{order['total_price']} ₽</b>\n"
            f"Срок: <b>{order['estimated_days']}</b>\n"
            f"Получение: <b>{order['delivery_type']}</b>\n\n"
            f"Мастер уже получил вашу заявку. Мы пришлём уведомление, когда заказ будет готов!"
        )
        await bot.send_message(chat_id=user_id, text=text)
    except Exception as e:
        logger.error(f"Failed to send order notification to user {user_id}: {e}")

async def notify_admin_order_created(order: dict):
    bot = get_bot()
    from bot.keyboards import get_order_admin_keyboard

    pattern_badge = "✅ Есть в базе лекал" if order.get("has_pattern") else "📏 ТРЕБУЕТСЯ ЗАМЕР В БОКСЕ"
    text = (
        f"🚨 <b>НОВЫЙ ЗАКАЗ: {order['order_number']}</b>\n\n"
        f"👤 Клиент: <b>{order['user_name']}</b>\n"
        f"📞 Телефон: <a href='tel:{order['phone']}'>{order['phone']}</a>\n"
        f"🚗 Авто: <b>{order['car_make']} {order['car_model']} ({order.get('car_year') or '–'})</b>\n"
        f"📋 Лекала: <b>{pattern_badge}</b>\n\n"
        f"🎨 Параметры:\n"
        f"• Комплект: {order['package_type']}\n"
        f"• Структура: {order['cell_type']}\n"
        f"• Материал: {order['mat_color']}, Кант: {order['edge_color']}\n"
        f"• Подпятник: {order['heel_pad']}, Шильдики: {order['badges_count']} шт.\n"
        f"• Способ получения: {order['delivery_type']}\n"
        f"• Комментарий: {order.get('comment') or 'нет'}\n\n"
        f"💰 <b>Сумма к оплате: {order['total_price']} ₽</b>"
    )

    for admin_id in settings.ADMIN_CHAT_IDS:
        if admin_id <= 0:
            continue
        try:
            await bot.send_message(
                chat_id=admin_id,
                text=text,
                reply_markup=get_order_admin_keyboard(order["id"]),
            )
        except Exception as e:
            logger.error(f"Failed to send order alert to admin {admin_id}: {e}")

async def notify_user_status_changed(user_id: int | None, order: dict, new_status: str):
    if not user_id:
        return
    template = STATUS_MESSAGES.get(new_status)
    if not template:
        return
    bot = get_bot()
    try:
        car_str = f"{order.get('car_make', '')} {order.get('car_model', '')}".strip()
        text = template.format(
            order_number=order.get("order_number", ""),
            car=car_str,
            estimated_days=order.get("estimated_days", "1-2 дня"),
        )
        await bot.send_message(chat_id=user_id, text=text)
    except Exception as e:
        logger.error(f"Failed to notify user {user_id} of status {new_status}: {e}")

async def notify_appointment_created(appointment: dict):
    bot = get_bot()
    # 1. To Admin
    admin_text = (
        f"📅 <b>НОВАЯ ЗАПИСЬ НА ЗАМЕР / УСТАНОВКУ</b>\n\n"
        f"👤 Клиент: <b>{appointment['user_name']}</b>\n"
        f"📞 Телефон: <a href='tel:{appointment['phone']}'>{appointment['phone']}</a>\n"
        f"🚗 Авто: <b>{appointment['car_info']}</b>\n"
        f"📆 Дата: <b>{appointment['date']}</b> в <b>{appointment['time_slot']}</b>\n"
        f"Цель: <b>{appointment['purpose']}</b>\n"
        f"Комментарий: {appointment.get('comment') or 'нет'}\n\n"
        f"📍 Бокс №3, ул. Карболитовская, 12"
    )
    for admin_id in settings.ADMIN_CHAT_IDS:
        if admin_id <= 0:
            continue
        try:
            await bot.send_message(chat_id=admin_id, text=admin_text)
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id} about appointment: {e}")

    # 2. To Client
    if appointment.get("user_id"):
        try:
            user_text = (
                f"✅ <b>Вы успешно записаны в мастерскую EVA-ART!</b>\n\n"
                f"🚗 Авто: <b>{appointment['car_info']}</b>\n"
                f"📆 Дата: <b>{appointment['date']}</b>\n"
                f"⏰ Время: <b>{appointment['time_slot']}</b>\n"
                f"📍 Адрес: <b>г. Кемерово, ул. Карболитовская, д. 12, бокс №3 (въезд в арку)</b>\n"
                f"📞 Телефон для связи: <a href='tel:+79512229999'>+7 951 222 9999</a>\n\n"
                f"Ждём вас! Мастер будет готов к вашему приезду."
            )
            await bot.send_message(chat_id=appointment["user_id"], text=user_text)
        except Exception as e:
            logger.error(f"Failed to notify user about appointment: {e}")
