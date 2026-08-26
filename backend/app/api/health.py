from fastapi import APIRouter

from app.core.config import (
    APP_NAME,
    APP_VERSION,
)


router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
async def health_check():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": APP_VERSION,
    }