"""Business logic service for Project management."""

import os
import shutil

from sqlalchemy.orm import Session

from app.api.v1.schemas.projects import ProjectCreate, ProjectUpdate
from app.core.config import get_settings
from app.core.errors import ProjectAlreadyExistsError, ProjectNotFoundError
from app.core.logging import get_logger
from app.db.models import Project
from app.db.repositories.projects import ProjectRepository

logger = get_logger("services.projects")
settings = get_settings()


class ProjectService:
    """Service encapsulating all Project business logic."""

    def __init__(self, db: Session):
        self.repo = ProjectRepository(db)

    def create_project(self, data: ProjectCreate) -> Project:
        """Create a new project workspace after verifying name uniqueness."""
        existing = self.repo.get_by_name(data.name.strip())
        if existing:
            logger.warning("Attempted to create duplicate project: %s", data.name)
            raise ProjectAlreadyExistsError(data.name.strip())

        project = Project(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            status="created",
        )
        saved = self.repo.create(project)

        # Create isolated artifact directories for this project
        project_artifact_dir = os.path.join(settings.AUTOMLENS_ARTIFACT_DIR, saved.id)
        os.makedirs(os.path.join(project_artifact_dir, "datasets"), exist_ok=True)
        os.makedirs(os.path.join(project_artifact_dir, "models"), exist_ok=True)
        os.makedirs(os.path.join(project_artifact_dir, "profiles"), exist_ok=True)
        os.makedirs(os.path.join(project_artifact_dir, "exports"), exist_ok=True)

        logger.info("Created project '%s' (ID: %s)", saved.name, saved.id)
        try:
            from app.services.audit import AuditService

            AuditService(self.repo.db).record_event(
                project_id=saved.id,
                action="project_created",
                reason=f"Initialized new project workspace '{saved.name}'",
                evidence={"project_name": saved.name, "description": saved.description},
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record project_created audit event: %s", audit_err)

        return saved

    def get_project(self, project_id: str) -> Project:
        """Fetch project or raise not found."""
        project = self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        return project

    def list_projects(self, skip: int = 0, limit: int = 50) -> tuple[list[Project], int]:
        """Return list of projects and total count."""
        items = self.repo.list_all(skip=skip, limit=limit)
        total = self.repo.count()
        return items, total

    def update_project(self, project_id: str, data: ProjectUpdate) -> Project:
        """Update project metadata."""
        project = self.get_project(project_id)

        if data.name is not None:
            new_name = data.name.strip()
            if new_name != project.name:
                existing = self.repo.get_by_name(new_name)
                if existing:
                    raise ProjectAlreadyExistsError(new_name)
                project.name = new_name

        if data.description is not None:
            project.description = data.description.strip() if data.description else None

        updated = self.repo.update(project)
        logger.info("Updated project %s", project_id)
        return updated

    def delete_project(self, project_id: str) -> None:
        """Delete project entity and purge associated filesystem artifacts."""
        project = self.get_project(project_id)
        self.repo.delete(project)

        # Purge filesystem artifacts
        project_artifact_dir = os.path.join(settings.AUTOMLENS_ARTIFACT_DIR, project_id)
        if os.path.exists(project_artifact_dir):
            try:
                shutil.rmtree(project_artifact_dir)
                logger.info("Purged artifacts for project %s", project_id)
            except Exception as exc:
                logger.error("Failed to clean artifacts directory: %s", exc)

        logger.info("Deleted project '%s' (%s)", project.name, project_id)
