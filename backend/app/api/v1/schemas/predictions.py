"""Pydantic schemas for Single and Batch Predictions, Confusion Matrix, and Model Inspection."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SinglePredictionRequest(BaseModel):
    """User input values for individual row inference."""

    inputs: dict[str, Any] = Field(
        ...,
        description="Feature name-value pairs matching training dataset columns",
        json_schema_extra={"example": {"Age": 29.0, "Fare": 50.0, "Pclass": 1, "Sex": "female"}},
    )


class ClassProbability(BaseModel):
    """Class label and calibrated prediction probability."""

    label: str
    probability: float = Field(..., ge=0.0, le=1.0)


class SinglePredictionResponse(BaseModel):
    """Result of single-row inference including class confidence distribution."""

    model_config = ConfigDict(from_attributes=True)

    model_id: str
    model_name: str
    task_type: str
    target_column: str
    prediction: Any
    probabilities: list[ClassProbability] | None = None
    confidence: float | None = None


class BatchPredictionResponse(BaseModel):
    """Summary and 10-row preview of batch inference results."""

    model_config = ConfigDict(from_attributes=True)

    model_id: str
    model_name: str
    task_type: str
    target_column: str
    total_rows: int
    preview_rows: list[dict[str, Any]]
    download_url: str


class ConfusionMatrixResponse(BaseModel):
    """Evaluation confusion matrix and per-class precision/recall breakdown."""

    model_id: str
    model_name: str
    classes: list[str]
    matrix: list[list[int]] = Field(
        ...,
        description=(
            "2D matrix where rows represent actual classes and columns represent predicted"
        ),
    )
    overall_accuracy: float
    per_class_metrics: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="Precision, recall, and f1 score per individual class",
    )


class ModelDetailResponse(BaseModel):
    """Detailed inspection report for an individual trained estimator."""

    model_config = ConfigDict(from_attributes=True)

    model_id: str
    model_name: str
    is_baseline: bool
    task_type: str
    primary_metric_name: str
    primary_metric_score: float | None = None
    primary_metric_std: float | None = None
    all_metrics: dict[str, Any] | None = None
    train_time_seconds: float | None = None
    artifact_exists: bool = False
    artifact_path: str | None = None
