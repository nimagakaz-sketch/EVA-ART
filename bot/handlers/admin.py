import io
import logging
from datetime import datetime
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, BufferedInputFile
from aiogram.filters import Command
from sqlalchemy import select
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from database.connection import AsyncSessionLocal
from database.models import Order, Appointment
from bot.notifications import notify_user_status_changed, STATUS_NAMES
from config import settings

logger = logging.getLogger(__name__)

router = Router(name="admin_router")

def is_admin(user_id: int | None) -> bool:
    if not user_id:
        return False
    return user_id in settings.ADMIN_CHAT_IDS

@router.message(Command("export"))
async def cmd_export_orders(message: Message):
    """Admin-only command to export orders to an Excel file."""
    user_id = message.from_user.id if message.from_user else 0
    if not is_admin(user_id):
        await message.answer("⛔ У вас нет доступа к команде администратора.")
        return

    await message.answer("⏳ Формирую отчет по заказам и записям...")

    async with AsyncSessionLocal() as session:
        # Fetch orders
        stmt_orders = select(Order).order_by(Order.id.desc())
        orders = (await session.execute(stmt_orders)).scalars().all()

        # Fetch appointments
        stmt_app = select(Appointment).order_by(Appointment.id.desc())
        appointments = (await session.execute(stmt_app)).scalars().all()

    wb = openpyxl.Workbook()

    # --- Sheet 1: Orders ---
    ws_orders = wb.active
    ws_orders.title = "Заказы"

    headers_orders = [
        "№ Заказа", "Дата", "Статус", "Клиент", "Телефон",
        "Марка", "Модель", "Год", "Наличие лекал",
        "Комплектация", "Ячейка", "Цвет материала", "Цвет канта",
        "Подпятник", "Шильдики", "Сумма (₽)", "Доставка / Выдача", "Комментарий"
    ]
    ws_orders.append(headers_orders)

    # Header styling
    header_fill = PatternFill(start_color="1C1E24", end_color="1C1E24", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    
    for col_idx in range(1, len(headers_orders) + 1):
        cell = ws_orders.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    thin_border = Border(
        left=Side(style='thin', color='DDDDDD'),
        right=Side(style='thin', color='DDDDDD'),
        top=Side(style='thin', color='DDDDDD'),
        bottom=Side(style='thin', color='DDDDDD'),
    )

    for o in orders:
        ws_orders.append([
            o.order_number,
            o.created_at.strftime("%d.%m.%Y %H:%M") if o.created_at else "",
            STATUS_NAMES.get(o.status, o.status),
            o.user_name,
            o.phone,
            o.car_make,
            o.car_model,
            o.car_year or "",
            "Есть" if o.has_pattern else "Нужен замер",
            o.package_type,
            o.cell_type,
            o.mat_color,
            o.edge_color,
            o.heel_pad,
            o.badges_count,
            o.total_price,
            o.delivery_type,
            o.comment or "",
        ])

    for row in ws_orders.iter_rows(min_row=2, max_row=ws_orders.max_row, min_col=1, max_col=len(headers_orders)):
        for cell in row:
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

    # --- Sheet 2: Appointments ---
    ws_app = wb.create_sheet(title="Записи в бокс")
    headers_app = ["ID", "Дата создания", "Дата замера", "Время", "Клиент", "Телефон", "Авто", "Цель", "Статус", "Комментарий"]
    ws_app.append(headers_app)

    for col_idx in range(1, len(headers_app) + 1):
        cell = ws_app.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for a in appointments:
        ws_app.append([
            a.id,
            a.created_at.strftime("%d.%m.%Y %H:%M") if a.created_at else "",
            a.date,
            a.time_slot,
            a.user_name,
            a.phone,
            a.car_info,
            a.purpose,
            a.status,
            a.comment or "",
        ])

    for row in ws_app.iter_rows(min_row=2, max_row=ws_app.max_row, min_col=1, max_col=len(headers_app)):
        for cell in row:
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

    # Auto-adjust column widths
    for sheet in [ws_orders, ws_app]:
        for col in sheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            sheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"eva_art_orders_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    input_file = BufferedInputFile(output.getvalue(), filename=filename)

    await message.answer_document(
        document=input_file,
        caption=f"📊 <b>Выгрузка заказов и записей EVA-ART</b>\nВсего заказов: {len(orders)} | Записей: {len(appointments)}",
    )

@router.callback_query(F.data.startswith("status:"))
async def handle_status_callback(call: CallbackQuery):
    """Admin quick status change button click in Telegram."""
    user_id = call.from_user.id if call.from_user else 0
    if not is_admin(user_id):
        await call.answer("У вас нет прав администратора", show_alert=True)
        return

    parts = call.data.split(":")
    if len(parts) != 3:
        await call.answer("Неверные данные")
        return

    order_id = int(parts[1])
    new_status = parts[2]

    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if not order:
            await call.answer("Заказ не найден", show_alert=True)
            return

        order.status = new_status
        await session.commit()
        order_dict = order.to_dict()
        user_tg_id = order.user_id

    # Notify user
    await notify_user_status_changed(user_tg_id, order_dict, new_status)

    status_ru = STATUS_NAMES.get(new_status, new_status)
    await call.answer(f"Статус изменён: {status_ru}")
    if call.message:
        await call.message.reply(f"✅ Статус заказа <b>{order_dict['order_number']}</b> изменён на <b>{status_ru}</b>.")
