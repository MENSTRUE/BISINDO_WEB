from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.realtime import router as realtime_router

from app.core.config import (
    API_PREFIX,
    APP_NAME,
    APP_VERSION,
)


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "Backend service for BISINDO AI "
        "real-time sign language recognition."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    health_router,
    prefix=API_PREFIX,
)

app.include_router(
    realtime_router,
)


@app.get("/")
async def root():
    return {
        "service": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "realtime": "/ws/realtime",
    }