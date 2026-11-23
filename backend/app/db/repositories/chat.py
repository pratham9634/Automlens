"""Database repository for AI Analyst persistent chat sessions and messages."""

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.db.models import AnalystMessage, ChatSession


class ChatRepository:
    """Repository handling database operations for AI Analyst conversation threads."""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_active_session(self, project_id: str, user_id: str) -> ChatSession:
        """Fetch the most recent chat session for this project and tenant, or create one."""
        stmt = (
            select(ChatSession)
            .where(ChatSession.project_id == project_id, ChatSession.user_id == user_id)
            .order_by(desc(ChatSession.updated_at))
            .limit(1)
        )
        session = self.db.scalars(stmt).first()
        if not session:
            session = ChatSession(
                project_id=project_id,
                user_id=user_id,
                title="AI Analyst Discussion",
            )
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
        return session

    def list_messages(self, session_id: str, limit: int = 100) -> list[AnalystMessage]:
        """List messages in chronological order for the given session."""
        stmt = (
            select(AnalystMessage)
            .where(AnalystMessage.session_id == session_id)
            .order_by(AnalystMessage.created_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def append_message(
        self,
        session_id: str,
        role: str,
        content: str,
        mode: str | None = None,
        tool_calls: dict | None = None,
    ) -> AnalystMessage:
        """Persist a single user or assistant message turn to the database."""
        msg = AnalystMessage(
            session_id=session_id,
            role=role,
            content=content,
            mode=mode,
            tool_calls=tool_calls,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def clear_session_messages(self, session_id: str) -> int:
        """Delete all messages associated with the given session."""
        stmt = delete(AnalystMessage).where(AnalystMessage.session_id == session_id)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0
