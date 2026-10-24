"""SQLAlchemy database models for AutoMLens."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Project(Base):
    """Project entity representing an isolated AutoML workspace."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="created",
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    datasets: Mapped[list["Dataset"]] = relationship(
        "Dataset",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(Dataset.created_at)",
    )
    training_runs: Mapped[list["TrainingRun"]] = relationship(
        "TrainingRun",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(TrainingRun.created_at)",
    )

    def __repr__(self) -> str:
        return f"<Project(id='{self.id}', name='{self.name}', status='{self.status}')>"


class Dataset(Base):
    """Dataset metadata record tied to an uploaded tabular file."""

    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    row_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    column_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    columns_metadata: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    storage_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="datasets")

    def __repr__(self) -> str:
        return f"<Dataset(id='{self.id}', filename='{self.filename}', rows={self.row_count})>"


class TrainingRun(Base):
    """Metadata and execution lifecycle state for a multi-model training run."""

    __tablename__ = "training_runs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_column: Mapped[str] = mapped_column(String(255), nullable=False)
    task_type: Mapped[str] = mapped_column(String(50), nullable=False)
    primary_metric: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        index=True,
    )  # pending, running, completed, failed
    total_models: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_models: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_model_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    best_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="training_runs")
    model_runs: Mapped[list["ModelRun"]] = relationship(
        "ModelRun",
        back_populates="training_run",
        cascade="all, delete-orphan",
        order_by="desc(ModelRun.primary_metric_score)",
    )

    def __repr__(self) -> str:
        return (
            f"<TrainingRun(id='{self.id}', status='{self.status}', "
            f"target='{self.target_column}')>"
        )


class ModelRun(Base):
    """Evaluation result and artifact reference for an individual estimator within a run."""

    __tablename__ = "model_runs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("training_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_id: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="queued",
        nullable=False,
        index=True,
    )  # queued, training, completed, failed
    primary_metric_name: Mapped[str] = mapped_column(String(50), nullable=False)
    primary_metric_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    primary_metric_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    all_metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    train_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    training_run: Mapped["TrainingRun"] = relationship("TrainingRun", back_populates="model_runs")

    def __repr__(self) -> str:
        return (
            f"<ModelRun(id='{self.id}', model='{self.model_id}', "
            f"score={self.primary_metric_score})>"
        )
