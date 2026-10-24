"""SQLAlchemy repository for TrainingRun and ModelRun entities."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ModelRun, TrainingRun


class RunRepository:
    """Repository handling database operations for multi-model training runs."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, run: TrainingRun) -> TrainingRun:
        """Persist a new TrainingRun entity."""
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get_by_id(self, run_id: str) -> TrainingRun | None:
        """Fetch a TrainingRun by its UUID."""
        stmt = select(TrainingRun).where(TrainingRun.id == run_id)
        return self.db.execute(stmt).scalars().first()

    def list_by_project_id(self, project_id: str, limit: int = 50) -> list[TrainingRun]:
        """List training runs for a specific project, ordered newest first."""
        stmt = (
            select(TrainingRun)
            .where(TrainingRun.project_id == project_id)
            .order_by(TrainingRun.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def update(self, run: TrainingRun) -> TrainingRun:
        """Save updates to an existing TrainingRun entity."""
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def create_model_run(self, model_run: ModelRun) -> ModelRun:
        """Persist a new ModelRun entity."""
        self.db.add(model_run)
        self.db.commit()
        self.db.refresh(model_run)
        return model_run

    def get_model_run_by_id(self, model_run_id: str) -> ModelRun | None:
        """Fetch an individual ModelRun by ID."""
        stmt = select(ModelRun).where(ModelRun.id == model_run_id)
        return self.db.execute(stmt).scalars().first()

    def list_model_runs_by_run_id(self, run_id: str) -> list[ModelRun]:
        """Fetch all model runs associated with a training run."""
        stmt = (
            select(ModelRun)
            .where(ModelRun.run_id == run_id)
            .order_by(ModelRun.is_baseline.desc(), ModelRun.primary_metric_score.desc().nullslast())
        )
        return list(self.db.execute(stmt).scalars().all())

    def update_model_run(self, model_run: ModelRun) -> ModelRun:
        """Update metrics and state of a ModelRun."""
        self.db.add(model_run)
        self.db.commit()
        self.db.refresh(model_run)
        return model_run
