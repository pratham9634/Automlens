"""Pydantic schemas for Audit Ledger API."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditEventResponse(BaseModel):
    """Schema for an individual audit event."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique event identifier (UUID)")
    project_id: str = Field(..., description="Project workspace identifier")
    action: str = Field(..., description="Event action key (e.g. dataset_uploaded)")
    reason: str = Field(..., description="Engineering rationale or intent")
    evidence: dict[str, Any] | None = Field(
        default=None, description="Contextual parameters or metrics"
    )
    result: str = Field(default="success", description="Outcome status (success, failure, warning)")
    created_at: datetime = Field(..., description="Timestamp of event occurrence")


class AuditTimelineResponse(BaseModel):
    """Paginated timeline of audit events."""

    items: list[AuditEventResponse]
    total: int
    skip: int
    limit: int
