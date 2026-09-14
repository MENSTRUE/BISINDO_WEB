from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.inference.model_runtime import model_runtime

router = APIRouter(prefix="/model", tags=["Model"])


class ModelSelectRequest(BaseModel):
    version: str


@router.get("/status")
async def model_status():
    return model_runtime.get_status()


@router.get("/versions")
async def model_versions():
    return {
        "active_version": model_runtime.active_version,
        "versions": model_runtime.get_versions(),
    }


@router.post("/reload")
async def reload_model():
    success = model_runtime.load()
    return {"success": success, **model_runtime.get_status()}


@router.post("/select")
async def select_model(payload: ModelSelectRequest):
    success = model_runtime.switch(payload.version)
    if not success:
        raise HTTPException(status_code=400, detail=model_runtime.error or "Model gagal dimuat.")
    return {"success": True, **model_runtime.get_status()}


# Handy alias if the frontend prefers /switch/v2.
@router.post("/switch/{version}")
async def switch_model(version: str):
    success = model_runtime.switch(version)
    if not success:
        raise HTTPException(status_code=400, detail=model_runtime.error or "Model gagal dimuat.")
    return {"success": True, **model_runtime.get_status()}
