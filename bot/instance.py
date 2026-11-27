import logging
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from config import settings

logger = logging.getLogger(__name__)

bot: Bot | None = None
dp: Dispatcher = Dispatcher()

def get_bot() -> Bot:
    global bot
    if bot is None:
        if not settings.BOT_TOKEN or settings.BOT_TOKEN == "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ":
            logger.warning("BOT_TOKEN is not configured or using default placeholder!")
        bot = Bot(
            token=settings.BOT_TOKEN,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
    return bot
