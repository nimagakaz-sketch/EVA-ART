import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import settings
from database.connection import init_db
from api import api_router
from bot.instance import get_bot, dp
from bot.handlers import main_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("eva_art")

# Background polling task reference
bot_task: asyncio.Task | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Initialize Database
    logger.info("Starting EVA-ART backend service...")
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    # 2. Register bot routers
    dp.include_router(main_router)

    # 3. Start Telegram Bot Polling in background task
    bot = get_bot()
    global bot_task

    async def start_polling():
        while True:
            try:
                logger.info("Starting Telegram Bot polling...")
                await bot.delete_webhook(drop_pending_updates=False)
                await dp.start_polling(bot, handle_signals=False)
            except asyncio.CancelledError:
                logger.info("Telegram Bot polling stopped.")
                break
            except Exception as e:
                logger.error(f"Error in bot polling: {e}. Retrying in 4s...")
                await asyncio.sleep(4)

    bot_task = asyncio.create_task(start_polling())
    logger.info(f"EVA-ART WebApp and API running on port {settings.APP_PORT}...")

    yield

    # Shutdown
    logger.info("Shutting down EVA-ART services...")
    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
    if bot and bot.session:
        await bot.session.close()
    logger.info("Services stopped.")

app = FastAPI(
    title="EVA-ART Telegram WebApp & Bot API",
    description="Backend for EVA-ART car mats workshop in Kemerovo",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Telegram WebApp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "webapp", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "webapp", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "EVA-ART WebApp Backend is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.COMPANY_NAME, "city": settings.CITY}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=False,
    )
