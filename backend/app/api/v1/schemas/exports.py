"""Pydantic schemas for Export Hub API."""

from pydantic import BaseModel, ConfigDict, Field


class ExportItemStatus(BaseModel):
    """Status and availability descriptor for a single exportable artifact."""

    model_config = ConfigDict(from_attributes=True)

    export_type: str = Field(
        ...,
        description="Unique key: quality_report, leaderboard, manifest, pipeline, etc.",
    )
    title: str = Field(..., description="Human-friendly artifact name")
    description: str = Field(..., description="Summary of what this export contains")
    format: str = Field(..., description="File format extension: json, csv, joblib")
    is_available: bool = Field(..., description="Whether required prerequisite artifacts exist")
    filename: str | None = Field(default=None, description="Downloadable filename")
    file_size_bytes: int | None = Field(
        default=None, description="Estimated or actual file size in bytes"
    )
    checksum_sha256: str | None = Field(
        default=None, description="SHA256 checksum for binary verification"
    )
    reason_unavailable: str | None = Field(
        default=None, description="User guidance if prerequisites are missing"
    )


class ExportStatusResponse(BaseModel):
    """List of all platform export capabilities and their current generation readiness."""

    project_id: str
    exports: list[ExportItemStatus]
