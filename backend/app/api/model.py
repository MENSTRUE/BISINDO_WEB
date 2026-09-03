from fastapi import APIRouter

from app.inference.model_runtime import (
    model_runtime,
)


router = APIRouter(
    prefix="/model",
    tags=["Model"],
)


# =========================
# STATUS
# =========================

@router.get(
    "/status"
)
async def model_status():
    return (
        model_runtime
        .get_status()
    )


# =========================
# RELOAD
# =========================

@router.post(
    "/reload"
)
async def reload_model():
    success = (
        model_runtime.load()
    )

    return {
        "success":
            success,

        **model_runtime
        .get_status(),
    }