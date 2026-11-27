from fastapi import APIRouter
from api.routes_config import router as config_router
from api.routes_patterns import router as patterns_router
from api.routes_orders import router as orders_router
from api.routes_appointments import router as appointments_router
from api.routes_admin import router as admin_router

api_router = APIRouter(prefix="/api")

api_router.include_router(config_router)
api_router.include_router(patterns_router)
api_router.include_router(orders_router)
api_router.include_router(appointments_router)
api_router.include_router(admin_router)

__all__ = ["api_router"]
