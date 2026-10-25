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

    def reset_project(self, project_id: str) -> Project:
        """Reset workspace by clearing runs, models, and predictions while keeping raw data."""
        project = self.get_project(project_id)

        from app.db.models import ModelRun, PredictionLog, TrainingRun
        from app.db.repositories.datasets import DatasetRepository

        # Query and delete all training runs and their child model runs
        runs = (
            self.repo.db.query(TrainingRun).filter(TrainingRun.project_id == project_id).all()
        )
        for r in runs:
            self.repo.db.query(ModelRun).filter(ModelRun.run_id == r.id).delete(
                synchronize_session=False
            )
            self.repo.db.delete(r)

        # Clear prediction inference logs
        self.repo.db.query(PredictionLog).filter(
            PredictionLog.project_id == project_id
        ).delete(synchronize_session=False)
        self.repo.db.commit()

        # Clean filesystem models, exports, and profiles folders
        project_artifact_dir = os.path.join(settings.AUTOMLENS_ARTIFACT_DIR, project_id)
        for folder in ("models", "exports", "config"):
            target_path = os.path.join(project_artifact_dir, folder)
            if os.path.exists(target_path):
                shutil.rmtree(target_path)
                os.makedirs(target_path, exist_ok=True)

        # Determine new status based on dataset presence
        has_dataset = (
            DatasetRepository(self.repo.db).get_latest_by_project_id(project_id) is not None
        )
        project.status = "dataset_uploaded" if has_dataset else "created"
        updated = self.repo.update(project)

        try:
            from app.services.audit import AuditService

            AuditService(self.repo.db).record_event(
                project_id=project_id,
                action="project_reset",
                reason="Reset workspace models and predictions for re-evaluation",
                evidence={"has_dataset": has_dataset, "cleared_runs": len(runs)},
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record project_reset audit event: %s", audit_err)

        logger.info("Reset project workspace '%s' (%s)", project.name, project_id)
        return updated

    def clone_project(self, project_id: str, new_name: str | None = None) -> Project:
        """Clone an existing project workspace, copying the active dataset if present."""
        import uuid

        from app.db.models import Dataset
        from app.db.repositories.datasets import DatasetRepository

        source = self.get_project(project_id)
        base_name = new_name.strip() if new_name else f"{source.name} (Copy)"

        # Ensure uniqueness
        candidate_name = base_name
        counter = 1
        while self.repo.get_by_name(candidate_name):
            counter += 1
            candidate_name = f"{base_name} {counter}"

        # Create new project workspace
        cloned = self.create_project(
            ProjectCreate(name=candidate_name, description=source.description)
        )

        # Copy dataset if source has one
        source_dataset = DatasetRepository(self.repo.db).get_latest_by_project_id(project_id)
        if (
            source_dataset
            and source_dataset.storage_path
            and os.path.exists(source_dataset.storage_path)
        ):
            new_dataset_id = str(uuid.uuid4())
            ext = os.path.splitext(source_dataset.filename)[1]
            new_filename = f"{new_dataset_id}{ext}"
            new_storage_path = os.path.join(
                settings.AUTOMLENS_ARTIFACT_DIR, cloned.id, "datasets", new_filename
            )

            shutil.copy2(source_dataset.storage_path, new_storage_path)

            cloned_dataset = Dataset(
                id=new_dataset_id,
                project_id=cloned.id,
                filename=source_dataset.filename,
                file_size_bytes=source_dataset.file_size_bytes,
                row_count=source_dataset.row_count,
                column_count=source_dataset.column_count,
                columns_metadata=source_dataset.columns_metadata,
                sha256_hash=source_dataset.sha256_hash,
                storage_path=new_storage_path,
            )
            DatasetRepository(self.repo.db).create(cloned_dataset)
            cloned.status = "dataset_uploaded"
            self.repo.update(cloned)

        logger.info("Cloned project '%s' -> '%s' (ID: %s)", source.name, cloned.name, cloned.id)
        return cloned
