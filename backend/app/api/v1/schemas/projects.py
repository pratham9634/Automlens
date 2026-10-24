"""Pydantic schemas for Project operations."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    """Payload for creating a new project."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Unique name for the project",
        examples=["Titanic Survival Classifier"],
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Optional project summary or description",
        examples=["Predicting survival likelihood on the Titanic dataset."],
    )


class ProjectUpdate(BaseModel):
    """Payload for updating an existing project."""

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Updated project name",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Updated project description",
    )


class ProjectResponse(BaseModel):
    """Project schema returned by API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Paginated or listed projects response."""

    items: list[ProjectResponse]
    total: int
