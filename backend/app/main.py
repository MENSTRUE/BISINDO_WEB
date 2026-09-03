from contextlib import (
    asynccontextmanager,
)

from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.api.health import (
    router as health_router,
)

from app.api.realtime import (
    router as realtime_router,
)

from app.api.model import (
    router as model_router,
)

from app.core.config import (
    API_PREFIX,
    APP_NAME,
    APP_VERSION,
)

from app.inference.model_runtime import (
    model_runtime,
)


# =========================
# LIFESPAN
# =========================

@asynccontextmanager
async def lifespan(
    app: FastAPI,
):
    print(
        "[Startup] Loading BISINDO model..."
    )

    model_runtime.load()

    yield

    print(
        "[Shutdown] Releasing BISINDO model..."
    )

    model_runtime.unload()


# =========================
# APP
# =========================

app = FastAPI(
    title=APP_NAME,

    version=APP_VERSION,

    description=(
        "Backend service for BISINDO AI "
        "real-time sign language recognition."
    ),

    lifespan=lifespan,
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# =========================
# REST API
# =========================

app.include_router(
    health_router,
    prefix=API_PREFIX,
)

app.include_router(
    model_router,
    prefix=API_PREFIX,
)


# =========================
# WEBSOCKET
# =========================

app.include_router(
    realtime_router,
)


# =========================
# ROOT
# =========================

@app.get("/")
async def root():
    return {
        "service":
            APP_NAME,

        "version":
            APP_VERSION,

        "status":
            "running",

        "realtime":
            "/ws/realtime",

        "model":
            model_runtime
            .get_status(),
    }