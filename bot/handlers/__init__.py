from aiogram import Router
from bot.handlers.start import router as start_router
from bot.handlers.admin import router as admin_router

main_router = Router(name="main_bot_router")
main_router.include_router(start_router)
main_router.include_router(admin_router)

__all__ = ["main_router"]
