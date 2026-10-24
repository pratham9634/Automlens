"""FastAPI Route Handlers for Dataset Statistical Profiling and Quality Reports."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.common import ErrorResponse
from app.api.v1.schemas.profiling import DatasetProfileResponse
from app.db.session import get_db
from app.services.profiling import ProfilingService

router = APIRouter(prefix="/projects/{project_id}/profile", tags=["Profiling"])


@router.post(
    "",
    response_model=DatasetProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def generate_profile(
    project_id: str,
    db: Session = Depends(get_db),
) -> DatasetProfileResponse:
    """Compute comprehensive statistical profile, correlations, and data quality metrics."""
    service = ProfilingService(db)
    return service.generate_profile(project_id)


@router.get(
    "",
    response_model=DatasetProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_profile(
    project_id: str,
    db: Session = Depends(get_db),
) -> DatasetProfileResponse:
    """Fetch previously computed statistical profile artifact from disk."""
    service = ProfilingService(db)
    return service.get_profile(project_id)
