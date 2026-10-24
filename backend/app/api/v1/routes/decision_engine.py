"""FastAPI Route Handlers for Target Selection and Hybrid AI Decision Engine."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.common import ErrorResponse
from app.api.v1.schemas.decision_engine import (
    AnalyzeTargetRequest,
    ConfirmedTargetResponse,
    ConfirmTargetRequest,
    DecisionEngineResponse,
    TargetAnalysisDetailResponse,
    TargetSuggestResponse,
)
from app.db.session import get_db
from app.services.decision_engine import DecisionEngineService

router = APIRouter(prefix="/projects/{project_id}", tags=["AI Decision Engine"])


@router.get(
    "/target/suggest",
    response_model=TargetSuggestResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def suggest_targets(
    project_id: str,
    db: Session = Depends(get_db),
) -> TargetSuggestResponse:
    """Analyze all features and return heuristics-based target recommendations."""
    service = DecisionEngineService(db)
    return service.suggest_targets(project_id)


@router.post(
    "/target/analyze",
    response_model=TargetAnalysisDetailResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def analyze_target(
    project_id: str,
    payload: AnalyzeTargetRequest,
    db: Session = Depends(get_db),
) -> TargetAnalysisDetailResponse:
    """Inspect class frequencies or distribution statistics for a candidate target."""
    service = DecisionEngineService(db)
    return service.analyze_target(
        project_id,
        payload.target_column,
        payload.override_task_type,
    )


@router.post(
    "/decision",
    response_model=DecisionEngineResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def formulate_decisions(
    project_id: str,
    payload: AnalyzeTargetRequest,
    db: Session = Depends(get_db),
) -> DecisionEngineResponse:
    """Execute Hybrid Decision Engine (deterministic heuristics + OpenRouter LLM enrichment)."""
    service = DecisionEngineService(db)
    return service.formulate_decisions(
        project_id,
        payload.target_column,
        payload.override_task_type,
    )


@router.post(
    "/target/confirm",
    response_model=ConfirmedTargetResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def confirm_target(
    project_id: str,
    payload: ConfirmTargetRequest,
    db: Session = Depends(get_db),
) -> ConfirmedTargetResponse:
    """Lock confirmed target, task type, and candidate models for training."""
    service = DecisionEngineService(db)
    return service.confirm_target(project_id, payload)


@router.get(
    "/target/confirm",
    response_model=ConfirmedTargetResponse | None,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_confirmed_target(
    project_id: str,
    db: Session = Depends(get_db),
) -> ConfirmedTargetResponse | None:
    """Fetch previously confirmed target configuration if present."""
    service = DecisionEngineService(db)
    return service.get_confirmed_target(project_id)
