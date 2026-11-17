"""Project repository handling database operations."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Project


class ProjectRepository:
    """Data access repository for Project entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: str, user_id: str | None = None) -> Project | None:
        """Fetch project by primary key and optional user scope."""
        stmt = select(Project).where(Project.id == project_id)
        if user_id:
            stmt = stmt.where(Project.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_name(self, name: str, user_id: str | None = None) -> Project | None:
        """Fetch project by name within user scope."""
        stmt = select(Project).where(Project.name == name)
        if user_id:
            stmt = stmt.where(Project.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(
        self, user_id: str | None = None, skip: int = 0, limit: int = 50
    ) -> list[Project]:
        """List projects ordered by creation date descending within user scope."""
        stmt = select(Project)
        if user_id:
            stmt = stmt.where(Project.user_id == user_id)
        stmt = stmt.order_by(Project.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def count(self, user_id: str | None = None) -> int:
        """Return total number of projects for user."""
        stmt = select(func.count(Project.id))
        if user_id:
            stmt = stmt.where(Project.user_id == user_id)
        return self.db.execute(stmt).scalar() or 0

    def create(self, project: Project) -> Project:
        """Persist a new project entity."""
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update(self, project: Project) -> Project:
        """Update and commit an existing project."""
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        """Delete project entity from database."""
        self.db.delete(project)
        self.db.commit()
