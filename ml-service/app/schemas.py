from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class NGOInput(StrictInput):
    worker_experience_years: int = Field(ge=0, le=60)
    days_since_last_visit: int = Field(ge=0, le=730)
    pending_followups: int = Field(ge=0, le=1000)
    completed_assessments_pct: float = Field(ge=0, le=100)


class ParentInput(StrictInput):
    portal_logins_last_month: int = Field(ge=0, le=1000)
    materials_accessed_pct: float = Field(ge=0, le=100)
    completed_milestone_reports: int = Field(ge=0, le=100)


class ChildInput(StrictInput):
    age_months: int = Field(ge=6, le=59)
    motor_milestones_pct: float = Field(ge=20, le=100)
    cognitive_milestones_pct: float = Field(ge=20, le=100)
    language_milestones_pct: float = Field(ge=20, le=100)
    social_milestones_pct: float = Field(ge=20, le=100)


class PredictionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_id: Literal["ngo", "parent", "child"]
    model_version: str
    target: str
    prediction: int
    label: str
    experimental: Literal[True] = True
    training_source: str
    limitations: str
