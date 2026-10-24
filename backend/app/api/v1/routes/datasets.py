"""FastAPI Route Handlers for Dataset Upload and Previews."""

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.common import ErrorResponse
from app.api.v1.schemas.datasets import DatasetPreviewResponse
from app.db.session import get_db
from app.services.datasets import DatasetService

router = APIRouter(prefix="/projects/{project_id}/dataset", tags=["Datasets"])


@router.post(
    "/upload",
    response_model=DatasetPreviewResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: {"model": ErrorResponse},
    },
)
async def upload_dataset(
    project_id: str,
    file: UploadFile = File(..., description="CSV or Excel tabular dataset file"),
    db: Session = Depends(get_db),
) -> DatasetPreviewResponse:
    """Upload and validate a tabular dataset (CSV or Excel) for a project."""
    service = DatasetService(db)
    content = await file.read()
    filename = file.filename or "dataset.csv"
    return service.upload_dataset(project_id=project_id, filename=filename, content=content)


@router.get(
    "",
    response_model=DatasetPreviewResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_dataset(
    project_id: str,
    db: Session = Depends(get_db),
) -> DatasetPreviewResponse:
    """Fetch active dataset summary metadata and preview rows for a project."""
    service = DatasetService(db)
    return service.get_dataset(project_id)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def delete_dataset(
    project_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete the active dataset for a project and reset its status."""
    service = DatasetService(db)
    service.delete_dataset(project_id)
