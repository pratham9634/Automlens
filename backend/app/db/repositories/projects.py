"""Project repository handling database operations."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Project


class ProjectRepository:
    """Data access repository for Project entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: str) -> Project | None:
        """Fetch project by primary key."""
        stmt = select(Project).where(Project.id == project_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_name(self, name: str) -> Project | None:
        """Fetch project by unique name."""
        stmt = select(Project).where(Project.name == name)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self, skip: int = 0, limit: int = 50) -> list[Project]:
        """List projects ordered by creation date descending."""
        stmt = select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def count(self) -> int:
        """Return total number of projects."""
        stmt = select(func.count(Project.id))
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
