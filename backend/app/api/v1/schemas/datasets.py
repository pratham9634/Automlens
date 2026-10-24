"""Pydantic schemas for Dataset upload, validation, and previews."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ColumnInfo(BaseModel):
    """Metadata for a single column in the dataset."""

    name: str = Field(..., description="Column header name")
    dtype: str = Field(..., description="Inferred data type (numeric, categorical, datetime, text)")
    non_null_count: int = Field(..., description="Number of non-empty values")
    null_count: int = Field(..., description="Number of missing/empty values")
    null_percentage: float = Field(..., description="Percentage of missing values (0-100)")


class DatasetResponse(BaseModel):
    """Summary metadata of an uploaded and validated dataset."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    filename: str
    file_size_bytes: int
    row_count: int
    column_count: int
    sha256_hash: str
    columns: list[ColumnInfo]
    created_at: datetime


class DatasetPreviewResponse(BaseModel):
    """Complete preview payload returning dataset metadata and head rows."""

    dataset: DatasetResponse
    preview_rows: list[dict[str, Any]] = Field(
        ...,
        description="First 10 sample rows formatted as key-value pairs",
    )
