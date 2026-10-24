"""FastAPI endpoints for Model Training and Server-Sent Events (SSE) streaming."""

from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.schemas.training import (
    ModelRunResponse,
    StartTrainingResponse,
    TrainingRunResponse,
)
from app.core.errors import AutoMLensError
from app.core.events import event_hub
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import get_db
from app.services.training import TrainingService
from app.storage.local import LocalStorageBackend

router = APIRouter(tags=["training"])


def get_training_service(db: Session = Depends(get_db)) -> TrainingService:
    """Dependency provider for TrainingService."""
    project_repo = ProjectRepository(db)
    dataset_repo = DatasetRepository(db)
    run_repo = RunRepository(db)
    storage = LocalStorageBackend()
    return TrainingService(
        project_repo=project_repo,
        dataset_repo=dataset_repo,
        run_repo=run_repo,
        storage=storage,
    )


@router.post(
    "/projects/{project_id}/training/start",
    response_model=StartTrainingResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a multi-core parallel model training run",
)
def start_training_run(
    project_id: str,
    background_tasks: BackgroundTasks,
    training_service: TrainingService = Depends(get_training_service),
) -> StartTrainingResponse:
    """Schedule parallel cross-validation model training in the background."""
    df, target_config = training_service._load_dataset_and_config(project_id)
    run = training_service.start_training_run(project_id)
    background_tasks.add_task(
        training_service.execute_training_run_background,
        run_id=run.id,
        project_id=project_id,
        target_config=target_config,
        df=df,
    )
    return StartTrainingResponse(
        run_id=run.id,
        project_id=run.project_id,
        status=run.status,
        total_models=run.total_models,
        primary_metric=run.primary_metric,
        stream_url=f"/api/v1/training/{run.id}/stream",
        message="Parallel model training launched across CPU worker pool.",
    )


@router.get(
    "/training/{run_id}/stream",
    summary="Stream live training progress via Server-Sent Events (SSE)",
)
async def stream_training_progress(run_id: str) -> StreamingResponse:
    """Server-Sent Events endpoint streaming fold-by-fold telemetry and final metrics."""
    return StreamingResponse(
        event_hub.subscribe(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/projects/{project_id}/runs",
    response_model=list[TrainingRunResponse],
    summary="Fetch training history for a project",
)
def list_training_runs(
    project_id: str,
    db: Session = Depends(get_db),
) -> list[TrainingRunResponse]:
    """Return all past training runs for a workspace, newest first."""
    run_repo = RunRepository(db)
    runs = run_repo.list_by_project_id(project_id)
    responses = []
    for r in runs:
        model_runs = run_repo.list_model_runs_by_run_id(r.id)
        r_resp = TrainingRunResponse.model_validate(r)
        r_resp.model_runs = [ModelRunResponse.model_validate(m) for m in model_runs]
        responses.append(r_resp)
    return responses


@router.get(
    "/runs/{run_id}",
    response_model=TrainingRunResponse,
    summary="Fetch detailed run telemetry and evaluated models",
)
def get_training_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> TrainingRunResponse:
    """Return individual run metrics, model leaderboard scores, and error status."""
    run_repo = RunRepository(db)
    run = run_repo.get_by_id(run_id)
    if not run:
        raise AutoMLensError(message=f"Training run '{run_id}' not found.", code="RUN_NOT_FOUND")

    model_runs = run_repo.list_model_runs_by_run_id(run_id)
    response = TrainingRunResponse.model_validate(run)
    response.model_runs = [ModelRunResponse.model_validate(m) for m in model_runs]
    return response
