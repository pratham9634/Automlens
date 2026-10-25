"""FastAPI Route Handlers for Audit Ledger."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.schemas.audit import AuditTimelineResponse
from app.api.v1.schemas.common import ErrorResponse
from app.db.session import get_db
from app.services.audit import AuditService
from app.services.projects import ProjectService

router = APIRouter(prefix="/projects/{project_id}/audit", tags=["Audit Ledger"])


@router.get(
    "",
    response_model=AuditTimelineResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    },
)
def get_audit_timeline(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: str | None = Query(None, description="Filter by event action (e.g. dataset_uploaded)"),
    result: str | None = Query(None, description="Filter by result (success, failure, warning)"),
    db: Session = Depends(get_db),
) -> AuditTimelineResponse:
    """Retrieve chronologically ordered audit timeline for a project."""
    # Ensure project exists
    ProjectService(db).get_project(project_id)

    audit_service = AuditService(db)
    items, total = audit_service.get_timeline(
        project_id=project_id,
        skip=skip,
        limit=limit,
        action=action,
        result=result,
    )
    return AuditTimelineResponse(
        items=items,  # type: ignore[arg-type]
        total=total,
        skip=skip,
        limit=limit,
    )
