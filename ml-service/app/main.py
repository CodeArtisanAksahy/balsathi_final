from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, HTTPException, Request

from .model_loader import ModelRegistry
from .schemas import ChildInput, NGOInput, ParentInput, PredictionResponse


def _enabled(value: str | None) -> bool:
    return (value or "").strip().lower() in {"true", "1", "yes"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_dir = Path(os.environ.get("ML_MODEL_DIR", "./models")).expanduser().resolve()
    app.state.registry = ModelRegistry(
        model_dir,
        allow_experimental=_enabled(os.environ.get("ML_ALLOW_EXPERIMENTAL")),
        production=os.environ.get("ENVIRONMENT", "development").lower() == "production",
    )
    yield


app = FastAPI(title="Balsathi Experimental Model Service", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "service": "balsathi-tabular-models"}


@app.get("/models/status")
def models_status(request: Request):
    return request.app.state.registry.status()


def _predict(request: Request, model_id: str, payload: BaseModel, features: list[str]) -> dict:
    frame = pd.DataFrame([payload.model_dump()], columns=features)
    try:
        return request.app.state.registry.predict(model_id, frame)
    except PermissionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"{model_id} model unavailable: {exc} No prediction was generated.") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Model inference failed; no prediction was generated.") from exc


@app.post("/predict/ngo", response_model=PredictionResponse)
def predict_ngo(request: Request, payload: NGOInput):
    return _predict(request, "ngo", payload, ["worker_experience_years", "days_since_last_visit", "pending_followups", "completed_assessments_pct"])


@app.post("/predict/parent", response_model=PredictionResponse)
def predict_parent(request: Request, payload: ParentInput):
    return _predict(request, "parent", payload, ["portal_logins_last_month", "materials_accessed_pct", "completed_milestone_reports"])


@app.post("/predict/child", response_model=PredictionResponse)
def predict_child(request: Request, payload: ChildInput):
    return _predict(request, "child", payload, ["age_months", "motor_milestones_pct", "cognitive_milestones_pct", "language_milestones_pct", "social_milestones_pct"])
