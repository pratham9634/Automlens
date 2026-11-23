"""Pydantic schemas for the Tabular AI Analyst copilot (Lens)."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single message in the analyst conversation."""

    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: str | None = None


class ChatRequest(BaseModel):
    """Payload to query the Tabular AI Analyst (Lens)."""

    message: str = Field(..., min_length=1, max_length=2000, description="User question")
    history: list[ChatMessage] = Field(
        default_factory=list, description="Recent conversation turns"
    )


class ChatSuggestion(BaseModel):
    """Contextual prompt suggestions generated for this project."""

    title: str
    prompt: str
    category: Literal["quality", "models", "features", "executive", "guidance", "security"]


class PersistedMessageResponse(BaseModel):
    """Persisted conversation turn returned to client."""

    id: str
    role: str
    content: str
    mode: str | None = None
    created_at: str | None = None


class ClearChatResponse(BaseModel):
    """Confirmation of deleted session messages."""

    cleared_count: int
    message: str = "Chat history cleared successfully."
