"""Dataset repository handling database operations."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Dataset


class DatasetRepository:
    """Data access repository for Dataset entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, dataset_id: str) -> Dataset | None:
        """Fetch dataset record by primary key."""
        stmt = select(Dataset).where(Dataset.id == dataset_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_latest_by_project_id(self, project_id: str) -> Dataset | None:
        """Fetch the most recently uploaded dataset for a project."""
        stmt = (
            select(Dataset)
            .where(Dataset.project_id == project_id)
            .order_by(Dataset.created_at.desc())
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, dataset: Dataset) -> Dataset:
        """Persist a new dataset entity."""
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def delete(self, dataset: Dataset) -> None:
        """Delete dataset entity from database."""
        self.db.delete(dataset)
        self.db.commit()
