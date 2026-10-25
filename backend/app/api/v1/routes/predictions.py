"""FastAPI endpoints for Model Predictions, Confusion Matrix, and Export Downloads (Phase 6)."""

import os

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.v1.schemas.predictions import (
    BatchPredictionResponse,
    ConfusionMatrixResponse,
    ModelDetailResponse,
    SinglePredictionRequest,
    SinglePredictionResponse,
)
from app.core.config import get_settings
from app.core.errors import AutoMLensError
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import get_db
from app.services.predictions import PredictionService
from app.storage.local import LocalStorageBackend

router = APIRouter(tags=["predictions"])
settings = get_settings()


def get_prediction_service(db: Session = Depends(get_db)) -> PredictionService:
    """Dependency provider for PredictionService."""
    project_repo = ProjectRepository(db)
    dataset_repo = DatasetRepository(db)
    run_repo = RunRepository(db)
    storage = LocalStorageBackend()
    return PredictionService(
        project_repo=project_repo,
        dataset_repo=dataset_repo,
        run_repo=run_repo,
        storage=storage,
    )


@router.post(
    "/projects/{project_id}/models/{model_id}/predict/single",
    response_model=SinglePredictionResponse,
    summary="Run inference on a single row of input feature values",
)
def predict_single(
    project_id: str,
    model_id: str,
    payload: SinglePredictionRequest,
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> SinglePredictionResponse:
    """Execute single-row prediction with confidence estimation and probability breakdown."""
    return prediction_service.predict_single(
        project_id=project_id,
        model_id=model_id,
        inputs=payload.inputs,
    )


@router.post(
    "/projects/{project_id}/models/{model_id}/predict/batch",
    response_model=BatchPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload a CSV/Excel file to run batch inference and generate annotated export",
)
async def predict_batch(
    project_id: str,
    model_id: str,
    file: UploadFile = File(...),
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> BatchPredictionResponse:
    """Perform batch predictions across all uploaded rows and prepare downloadable CSV."""
    file_bytes = await file.read()
    response, _ = prediction_service.predict_batch(
        project_id=project_id,
        model_id=model_id,
        file_bytes=file_bytes,
        filename=file.filename or "batch_input.csv",
    )
    return response


@router.get(
    "/projects/{project_id}/models/{model_id}/confusion-matrix",
    response_model=ConfusionMatrixResponse,
    summary="Compute confusion matrix and per-class precision/recall for classification",
)
def get_confusion_matrix(
    project_id: str,
    model_id: str,
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> ConfusionMatrixResponse:
    """Generate confusion matrix heatmap data and per-class metrics."""
    return prediction_service.get_confusion_matrix(
        project_id=project_id,
        model_id=model_id,
    )


@router.get(
    "/projects/{project_id}/models/{model_id}/details",
    response_model=ModelDetailResponse,
    summary="Fetch comprehensive model inspection metrics and fold stability",
)
def get_model_details(
    project_id: str,
    model_id: str,
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> ModelDetailResponse:
    """Return model details, all evaluation metrics, and artifact presence."""
    return prediction_service.get_model_details(
        project_id=project_id,
        model_id=model_id,
    )


@router.get(
    "/projects/{project_id}/models/{model_id}/download",
    summary="Download fitted Scikit-Learn Pipeline (.joblib)",
)
def download_model_artifact(
    project_id: str,
    model_id: str,
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> FileResponse:
    """Download the full pipeline artifact containing fitted preprocessors and estimator."""
    details = prediction_service.get_model_details(project_id, model_id)
    if not details.artifact_path or not os.path.exists(details.artifact_path):
        raise AutoMLensError(
            message=f"Model artifact for '{model_id}' does not exist on disk.",
            code="ARTIFACT_NOT_FOUND",
        )

    return FileResponse(
        path=details.artifact_path,
        media_type="application/octet-stream",
        filename=f"{project_id}_{model_id}.joblib",
    )

