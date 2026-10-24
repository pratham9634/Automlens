"""Pydantic schemas for Model Training and Execution Telemetry."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ModelRunResponse(BaseModel):
    """Execution status and evaluation metrics for an individual estimator."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    model_id: str
    model_name: str
    is_baseline: bool
    status: str
    primary_metric_name: str
    primary_metric_score: float | None = None
    primary_metric_std: float | None = None
    all_metrics: dict[str, Any] | None = None
    train_time_seconds: float | None = None
    artifact_path: str | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class TrainingRunResponse(BaseModel):
    """Aggregate lifecycle state of a parallel training run."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    target_column: str
    task_type: str
    primary_metric: str
    status: str
    total_models: int
    completed_models: int
    best_model_id: str | None = None
    best_score: float | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    model_runs: list[ModelRunResponse] = Field(default_factory=list)


class StartTrainingResponse(BaseModel):
    """Response returned immediately upon scheduling a background parallel run."""

    run_id: str
    project_id: str
    status: str
    total_models: int
    primary_metric: str
    stream_url: str
    message: str
