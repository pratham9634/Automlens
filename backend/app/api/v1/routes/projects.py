"""FastAPI Route Handlers for Projects."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.common import ErrorResponse
from app.api.v1.schemas.projects import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.db.session import get_db
from app.services.projects import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
    },
)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Create a new project workspace."""
    service = ProjectService(db)
    return service.create_project(data)


@router.get(
    "",
    response_model=ProjectListResponse,
    status_code=status.HTTP_200_OK,
)
def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ProjectListResponse:
    """List all projects sorted by newest first."""
    service = ProjectService(db)
    items, total = service.list_projects(skip=skip, limit=limit)
    return ProjectListResponse(items=items, total=total)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Retrieve details for a single project by ID."""
    service = ProjectService(db)
    return service.get_project(project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
    },
)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Update metadata for an existing project."""
    service = ProjectService(db)
    return service.update_project(project_id, data)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete a project and all associated dataset and model artifacts."""
    service = ProjectService(db)
    service.delete_project(project_id)


@router.post(
    "/{project_id}/reset",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def reset_project(
    project_id: str,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Reset workspace training runs, models, and predictions while preserving uploaded data."""
    service = ProjectService(db)
    return service.reset_project(project_id)


@router.post(
    "/{project_id}/clone",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def clone_project(
    project_id: str,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Clone an existing project workspace with its active dataset for parallel exploration."""
    service = ProjectService(db)
    return service.clone_project(project_id)
