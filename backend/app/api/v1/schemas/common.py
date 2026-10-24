"""Common API response and error schemas."""

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Structured error payload."""

    code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable error description")
    details: Any = Field(default=None, description="Optional extra error details")


class ErrorResponse(BaseModel):
    """Standardized API error envelope."""

    error: ErrorDetail
