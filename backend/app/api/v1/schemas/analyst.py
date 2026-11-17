"""Pydantic schemas for the Tabular AI Analyst copilot."""

from typing import Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single message in the analyst conversation."""

    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Payload to query the Tabular AI Analyst."""

    message: str = Field(..., min_length=1, max_length=2000, description="User question")
    history: list[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")


class ChatSuggestion(BaseModel):
    """Contextual prompt suggestions generated for this project."""

    title: str
    prompt: str
    category: Literal["quality", "models", "features", "executive"]
