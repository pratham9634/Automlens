"""Audit service for recording, querying, and exporting platform lifecycle events."""

from typing import Any

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.models import AuditEvent
from app.db.repositories.audit import AuditRepository

logger = get_logger("services.audit")


class AuditService:
    """Service encapsulating the immutable audit ledger and decision rationale (Rules 5, 9, 10)."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditRepository(db)

    def record_event(
        self,
        project_id: str,
        action: str,
        reason: str,
        evidence: dict[str, Any] | None = None,
        result: str = "success",
    ) -> AuditEvent:
        """Persist a structured audit trail event.

        Args:
            project_id: Workspace identifier.
            action: Standard action verb (e.g. 'dataset_uploaded', 'target_confirmed').
            reason: Plain-text engineering justification/intent.
            evidence: Contextual metrics, parameters, or summary dict.
            result: 'success', 'failure', or 'warning'.
        """
        # Ensure evidence is JSON serializable and sanitize large nested data if needed
        clean_evidence = self._sanitize_evidence(evidence)

        event = AuditEvent(
            project_id=project_id,
            action=action,
            reason=reason,
            evidence=clean_evidence,
            result=result,
        )

        saved = self.repo.create(event)
        logger.info(
            "Audit event recorded: [%s] project=%s action=%s result=%s",
            saved.id,
            project_id,
            action,
            result,
        )
        return saved

    def get_timeline(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 50,
        action: str | None = None,
        result: str | None = None,
    ) -> tuple[list[AuditEvent], int]:
        """Fetch paginated audit events with optional action and result filtering."""
        events = self.repo.list_by_project(
            project_id=project_id,
            skip=skip,
            limit=limit,
            action=action,
            result=result,
        )
        total = self.repo.count_by_project(
            project_id=project_id,
            action=action,
            result=result,
        )
        return events, total

    def get_full_project_history(self, project_id: str) -> list[AuditEvent]:
        """Return all historical audit events for a project (chronological order)."""
        return self.repo.list_all_for_project(project_id)

    def _sanitize_evidence(self, evidence: dict[str, Any] | None) -> dict[str, Any] | None:
        """Sanitize evidence payload to prevent storing secrets or excessively large values."""
        if not evidence or not isinstance(evidence, dict):
            return None

        sanitized: dict[str, Any] = {}
        for key, val in evidence.items():
            # Redact common secret keys
            if any(
                secret_term in key.lower() for secret_term in ["token", "key", "password", "secret"]
            ):
                sanitized[key] = "[REDACTED]"
            elif isinstance(val, list) and len(val) > 100:
                # Truncate overly long sample lists
                sanitized[key] = val[:100] + [f"... ({len(val) - 100} items truncated)"]
            else:
                sanitized[key] = val
        return sanitized
