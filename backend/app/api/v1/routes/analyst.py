"""FastAPI route handlers for the Tabular AI Analyst copilot (Lens)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.schemas.analyst import (
    ChatRequest,
    ChatSuggestion,
    ClearChatResponse,
    PersistedMessageResponse,
)
from app.api.v1.schemas.common import ErrorResponse
from app.core.auth import get_current_user, get_gemini_api_key, get_gemini_model
from app.core.config import get_settings
from app.core.errors import ProjectNotFoundError
from app.db.repositories.projects import ProjectRepository
from app.db.session import get_db
from app.services.analyst import AnalystService

router = APIRouter(prefix="/projects/{project_id}/chat", tags=["AI Analyst (Lens)"])
settings = get_settings()


def _verify_project_ownership(project_id: str, user_id: str, db: Session):
    """Ensure project exists and belongs to the authenticated user."""
    project_repo = ProjectRepository(db)
    project = project_repo.get_by_id(project_id)
    if not project:
        raise ProjectNotFoundError(project_id)

    # Multi-tenancy check: allow access if owner matches, or dev fallback
    is_dev = settings.AUTOMLENS_ENV in ("development", "test")
    is_dev_user = (
        user_id == settings.DEFAULT_DEV_USER_ID
        or project.user_id == settings.DEFAULT_DEV_USER_ID
    )
    if project.user_id != user_id and not (is_dev and is_dev_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to query this project's AI copilot.",
        )
    return project


@router.get(
    "/suggestions",
    response_model=list[ChatSuggestion],
    status_code=status.HTTP_200_OK,
    summary="Get contextual prompt suggestion pills for this project",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
    },
)
def get_chat_suggestions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> list[ChatSuggestion]:
    """Return tailored suggestion prompts based on the project's current lifecycle stage."""
    _verify_project_ownership(project_id, current_user, db)
    service = AnalystService(db)
    return service.get_suggestions(project_id, user_id=current_user)


@router.get(
    "/messages",
    response_model=list[PersistedMessageResponse],
    status_code=status.HTTP_200_OK,
    summary="Get persisted conversation history for this project",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
    },
)
def get_chat_messages(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> list[PersistedMessageResponse]:
    """Return all stored conversation messages for the current user and project session."""
    _verify_project_ownership(project_id, current_user, db)
    service = AnalystService(db)
    return service.get_messages(project_id, user_id=current_user)


@router.delete(
    "/messages",
    response_model=ClearChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Clear active conversation history for this project",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
    },
)
def clear_chat_messages(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> ClearChatResponse:
    """Wipe all persisted conversation messages for the current user in this project."""
    _verify_project_ownership(project_id, current_user, db)
    service = AnalystService(db)
    count = service.clear_messages(project_id, user_id=current_user)
    return ClearChatResponse(cleared_count=count)


@router.post(
    "",
    summary="Stream conversational analysis via Server-Sent Events (SSE)",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
    },
)
async def chat_with_analyst(
    project_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    gemini_key: str | None = Depends(get_gemini_api_key),
    gemini_model: str = Depends(get_gemini_model),
) -> StreamingResponse:
    """Stream token-by-token responses from Lens."""
    _verify_project_ownership(project_id, current_user, db)
    service = AnalystService(db)
    stream_generator = service.stream_chat(
        project_id=project_id,
        user_id=current_user,
        question=request.message,
        history=request.history,
        gemini_api_key=gemini_key,
        gemini_model=gemini_model,
    )
    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
