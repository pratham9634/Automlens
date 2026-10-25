"""Audit repository handling database operations for the immutable audit ledger."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import AuditEvent


class AuditRepository:
    """Data access repository for AuditEvent entities."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, event: AuditEvent) -> AuditEvent:
        """Persist a new audit event."""
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list_by_project(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 50,
        action: str | None = None,
        result: str | None = None,
    ) -> list[AuditEvent]:
        """List audit events for a project ordered chronologically descending (newest first)."""
        stmt = select(AuditEvent).where(AuditEvent.project_id == project_id)
        if action:
            stmt = stmt.where(AuditEvent.action == action)
        if result:
            stmt = stmt.where(AuditEvent.result == result)

        stmt = stmt.order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def count_by_project(
        self,
        project_id: str,
        action: str | None = None,
        result: str | None = None,
    ) -> int:
        """Return total count of audit events matching optional filters."""
        stmt = select(func.count(AuditEvent.id)).where(AuditEvent.project_id == project_id)
        if action:
            stmt = stmt.where(AuditEvent.action == action)
        if result:
            stmt = stmt.where(AuditEvent.result == result)
        return self.db.execute(stmt).scalar() or 0

    def list_all_for_project(self, project_id: str) -> list[AuditEvent]:
        """Fetch all events for export (oldest first for chronological log)."""
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.project_id == project_id)
            .order_by(AuditEvent.created_at.asc())
        )
        return list(self.db.execute(stmt).scalars().all())
