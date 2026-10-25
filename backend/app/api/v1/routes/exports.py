"""FastAPI Route Handlers for Export Hub."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.common import ErrorResponse
from app.api.v1.schemas.exports import ExportStatusResponse
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import get_db
from app.services.audit import AuditService
from app.services.exports import ExportService
from app.storage.local import LocalStorageBackend

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["Exports Hub"])


def _get_export_service(db: Session = Depends(get_db)) -> ExportService:
    """Dependency provider for ExportService."""
    return ExportService(
        db=db,
        project_repo=ProjectRepository(db),
        dataset_repo=DatasetRepository(db),
        run_repo=RunRepository(db),
        storage=LocalStorageBackend(),
    )


@router.get(
    "",
    response_model=ExportStatusResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_export_status(
    project_id: str,
    export_service: ExportService = Depends(_get_export_service),
) -> ExportStatusResponse:
    """List availability, format details, and readiness for all exportable artifacts."""
    return export_service.get_export_status(project_id)


@router.get(
    "/{export_type}",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def download_export(
    project_id: str,
    export_type: str,
    db: Session = Depends(get_db),
    export_service: ExportService = Depends(_get_export_service),
) -> Response:
    """Download a specific artifact: quality report, leaderboard, manifest, or pipeline."""
    content_bytes, media_type, filename, sha256 = export_service.generate_export(
        project_id=project_id,
        export_type=export_type,
    )

    # Record download event in audit ledger
    try:
        audit_service = AuditService(db)
        audit_service.record_event(
            project_id=project_id,
            action="export_downloaded",
            reason=f"User downloaded export artifact '{filename}' ({export_type})",
            evidence={
                "export_type": export_type,
                "filename": filename,
                "size_bytes": len(content_bytes),
                "checksum_sha256": sha256,
            },
            result="success",
        )
    except Exception:
        pass  # Don't fail download if audit recording fails

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Length": str(len(content_bytes)),
    }
    if sha256:
        headers["X-Artifact-Checksum-SHA256"] = sha256

    return Response(content=content_bytes, media_type=media_type, headers=headers)
