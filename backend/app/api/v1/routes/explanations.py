"""FastAPI endpoints for Model Explainability & Interpretability (Phase 7).

Provides:
- Global feature importance & downsampled SHAP values
- Single-observation local SHAP attribution waterfall
- Rule 10 academic causation disclaimer
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.schemas.explanations import (
    GlobalExplanationResponse,
    LocalExplanationRequest,
    LocalExplanationResponse,
)
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import get_db
from app.services.explainability import ExplainabilityService
from app.storage.local import LocalStorageBackend

router = APIRouter(tags=["explanations"])


def get_explainability_service(db: Session = Depends(get_db)) -> ExplainabilityService:
    """Dependency provider for ExplainabilityService."""
    project_repo = ProjectRepository(db)
    dataset_repo = DatasetRepository(db)
    run_repo = RunRepository(db)
    storage = LocalStorageBackend()
    return ExplainabilityService(
        project_repo=project_repo,
        dataset_repo=dataset_repo,
        run_repo=run_repo,
        storage=storage,
    )


@router.get(
    "/projects/{project_id}/models/{model_id}/explanations/global",
    response_model=GlobalExplanationResponse,
    summary="Compute global feature importance and mean |SHAP| values",
)
def get_global_explanation(
    project_id: str,
    model_id: str,
    service: ExplainabilityService = Depends(get_explainability_service),
) -> GlobalExplanationResponse:
    """Retrieve global model interpretability report with Tree/Linear SHAP and native weights."""
    return service.get_global_explanation(
        project_id=project_id,
        model_id=model_id,
    )


@router.post(
    "/projects/{project_id}/models/{model_id}/explanations/local",
    response_model=LocalExplanationResponse,
    summary="Compute local SHAP attribution for a single observation",
)
def get_local_explanation(
    project_id: str,
    model_id: str,
    payload: LocalExplanationRequest,
    service: ExplainabilityService = Depends(get_explainability_service),
) -> LocalExplanationResponse:
    """Calculate single observation waterfall attribution showing positive and negative drivers."""
    return service.get_local_explanation(
        project_id=project_id,
        model_id=model_id,
        inputs=payload.inputs,
    )
