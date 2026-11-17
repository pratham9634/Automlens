"""FastAPI route handlers for the Tabular AI Analyst copilot."""

from fastapi import APIRouter, Depends, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.schemas.analyst import ChatRequest, ChatSuggestion
from app.core.auth import get_current_user, get_gemini_api_key
from app.db.session import get_db
from app.services.analyst import AnalystService

router = APIRouter(prefix="/projects/{project_id}/chat", tags=["AI Analyst"])


@router.get(
    "/suggestions",
    response_model=list[ChatSuggestion],
    status_code=status.HTTP_200_OK,
    summary="Get contextual prompt suggestion pills for this project",
)
def get_chat_suggestions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> list[ChatSuggestion]:
    """Return tailored suggestion prompts based on the project's data quality and leaderboard."""
    service = AnalystService(db)
    return service.get_suggestions(project_id)


@router.post(
    "",
    summary="Stream conversational analysis via Server-Sent Events (SSE)",
)
async def chat_with_analyst(
    project_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    gemini_key: str | None = Depends(get_gemini_api_key),
) -> StreamingResponse:
    """Stream token-by-token responses from Gemini 2.0 Flash or deterministic engine."""
    service = AnalystService(db)
    stream_generator = service.stream_chat(
        project_id=project_id,
        question=request.message,
        history=request.history,
        gemini_api_key=gemini_key,
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
