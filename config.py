import os
from typing import List
from dotenv import load_dotenv

# Загружаем переменные окружения из .env если файл существует
load_dotenv()

class Settings:
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    _admin_ids_raw: str = os.getenv("ADMIN_CHAT_ID", "0")
    
    @property
    def ADMIN_CHAT_IDS(self) -> List[int]:
        ids = []
        for x in self._admin_ids_raw.replace(";", ",").split(","):
            x = x.strip()
            if x.isdigit():
                ids.append(int(x))
        return ids if ids else [0]
    
    @property
    def PRIMARY_ADMIN_ID(self) -> int:
        return self.ADMIN_CHAT_IDS[0]

    # Database connection parameters
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "eva_art_db")
    DB_USER: str = os.getenv("DB_USER", "eva_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "eva_password")

    @property
    def DATABASE_URL(self) -> str:
        # Default asyncpg connection string
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    # Web application settings
    WEBAPP_URL: str = os.getenv("WEBAPP_URL", "https://eva-art42.ru").rstrip("/")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")

    # Company contacts & data
    COMPANY_NAME: str = "Автоковрики EVA-ART"
    SLOGAN: str = "Если ЕВА коврики, то EVA-ART"
    CITY: str = "Кемерово"
    ADDRESS: str = "ул. Карболитовская, д. 12, бокс №3, въезд в арку"
    HINT: str = "Въезд в арку, бокс №3"
    PHONE: str = "+7 951 222 9999"
    PHONE_TEL: str = "tel:+79512229999"
    MAPS_YANDEX: str = "https://yandex.ru/maps/?text=Кемерово,+ул.+Карболитовская,+12"
    MAPS_2GIS: str = "https://2gis.ru/kemerovo/search/Кемерово,%20ул.%20Карболитовская,%2012"

settings = Settings()
