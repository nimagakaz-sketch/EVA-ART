import logging
import socket
import aiohttp
from aiohttp import TCPConnector
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode
from config import settings

logger = logging.getLogger(__name__)

class IPv6AiohttpSession(AiohttpSession):
    """Custom session that uses IPv6 socket family to bypass IPv4 telegram routing timeouts on server."""
    async def create_session(self) -> aiohttp.ClientSession:
        return aiohttp.ClientSession(
            connector=TCPConnector(family=socket.AF_INET6),
            json_serialize=self.json_dumps,
        )

bot: Bot | None = None
dp: Dispatcher = Dispatcher()

def get_bot() -> Bot:
    global bot
    if bot is None:
        if not settings.BOT_TOKEN or settings.BOT_TOKEN == "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ":
            logger.warning("BOT_TOKEN is not configured or using default placeholder!")
        bot = Bot(
            token=settings.BOT_TOKEN,
            session=IPv6AiohttpSession(),
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
    return bot
