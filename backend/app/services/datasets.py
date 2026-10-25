import hashlib
import io
import json
import os
import uuid
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.api.v1.schemas.datasets import (
    ColumnInfo,
    DatasetPreviewResponse,
    DatasetResponse,
)
from app.core.config import get_settings
from app.core.errors import (
    DatasetNotFoundError,
    DatasetValidationError,
    FileSizeExceededError,
    InvalidFileFormatError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger
from app.db.models import Dataset
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.storage.base import StorageBackend
from app.storage.local import LocalStorageBackend

logger = get_logger("services.datasets")
settings = get_settings()

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


class DatasetService:
    """Service encapsulating dataset validation, parsing, fingerprinting, and persistence."""

    def __init__(self, db: Session, storage: StorageBackend | None = None):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.project_repo = ProjectRepository(db)
        self.storage = storage or LocalStorageBackend()

    def _infer_column_type(self, series: pd.Series) -> str:
        """Categorize a Pandas series into standard ML types."""
        dtype_str = str(series.dtype).lower()
        if "int" in dtype_str or "float" in dtype_str:
            return "numeric"
        elif "datetime" in dtype_str:
            return "datetime"
        elif "bool" in dtype_str:
            return "boolean"
        else:
            # Check unique ratio to detect categorical vs free text
            unique_count = series.nunique(dropna=True)
            total_count = len(series.dropna())
            if total_count > 0 and (unique_count / total_count < 0.2 or unique_count <= 20):
                return "categorical"
            return "text"

    def _parse_and_validate(
        self, content: bytes, extension: str
    ) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
        """Parse raw file bytes into a DataFrame and extract column statistics."""
        # Check empty file
        if len(content) == 0:
            raise DatasetValidationError("Uploaded file is empty (0 bytes).")

        # Parse file based on extension
        try:
            if extension == ".csv":
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(io.BytesIO(content), encoding="latin1")
            else:
                df = pd.read_excel(io.BytesIO(content))
        except Exception as exc:
            logger.error("Failed to parse tabular file: %s", exc)
            msg = f"Could not parse tabular file. Error: {str(exc)}"
            raise DatasetValidationError(msg) from exc

        # Validate rows and columns
        row_count, col_count = df.shape
        if row_count == 0:
            raise DatasetValidationError("Dataset contains 0 rows of data.")
        if row_count > settings.AUTOMLENS_MAX_ROWS:
            max_r = settings.AUTOMLENS_MAX_ROWS
            raise DatasetValidationError(
                f"Dataset contains {row_count:,} rows, exceeding the limit of {max_r:,}."
            )
        if col_count == 0:
            raise DatasetValidationError("Dataset contains no columns.")
        if col_count > settings.AUTOMLENS_MAX_COLUMNS:
            max_c = settings.AUTOMLENS_MAX_COLUMNS
            raise DatasetValidationError(
                f"Dataset contains {col_count} columns, exceeding the limit of {max_c}."
            )

        # Validate column headers
        columns_meta: list[dict[str, Any]] = []
        seen_cols = set()

        for col in df.columns:
            col_str = str(col).strip()
            if not col_str or col_str.lower().startswith("unnamed:"):
                raise DatasetValidationError("Dataset contains empty or unnamed column headers.")
            if col_str in seen_cols:
                raise DatasetValidationError(f"Duplicate column header detected: '{col_str}'.")
            seen_cols.add(col_str)

            series = df[col]
            null_count = int(series.isna().sum())
            non_null_count = row_count - null_count
            null_pct = round((null_count / row_count) * 100, 2)
            col_type = self._infer_column_type(series)

            columns_meta.append(
                {
                    "name": col_str,
                    "dtype": col_type,
                    "non_null_count": non_null_count,
                    "null_count": null_count,
                    "null_percentage": null_pct,
                }
            )

        return df, columns_meta

    def upload_dataset(
        self,
        project_id: str,
        filename: str,
        content: bytes,
    ) -> DatasetPreviewResponse:
        """Validate, store, and fingerprint an uploaded tabular dataset."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        # Validate file extension
        ext = ""
        if "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise InvalidFileFormatError(filename)

        # Validate file size
        file_size_bytes = len(content)
        size_mb = file_size_bytes / (1024 * 1024)
        if size_mb > settings.AUTOMLENS_MAX_UPLOAD_MB:
            raise FileSizeExceededError(size_mb, settings.AUTOMLENS_MAX_UPLOAD_MB)

        # Parse with Pandas & extract metadata
        df, columns_meta = self._parse_and_validate(content, ext)

        # Compute SHA-256 fingerprint for academic reproducibility
        sha256_hash = hashlib.sha256(content).hexdigest()

        dataset_id = str(uuid.uuid4())
        safe_filename = f"{dataset_id}{ext}"

        # Save to storage backend (local filesystem abstraction)
        storage_path = self.storage.save_file(
            project_id=project_id,
            subfolder="datasets",
            filename=safe_filename,
            content=content,
        )

        # Persist to database
        dataset = Dataset(
            id=dataset_id,
            project_id=project_id,
            filename=filename,
            file_size_bytes=file_size_bytes,
            row_count=len(df),
            column_count=len(df.columns),
            sha256_hash=sha256_hash,
            columns_metadata=json.dumps(columns_meta),
            storage_path=storage_path,
        )
        saved_dataset = self.dataset_repo.create(dataset)

        # Update project status
        project.status = "dataset_uploaded"
        self.project_repo.update(project)

        logger.info(
            "Uploaded dataset '%s' for project %s (%d rows, %d cols, sha256=%s)",
            filename,
            project_id,
            len(df),
            len(df.columns),
            sha256_hash[:8],
        )

        try:
            from app.services.audit import AuditService

            AuditService(self.dataset_repo.db).record_event(
                project_id=project_id,
                action="dataset_uploaded",
                reason=(
                    f"Uploaded dataset '{filename}' ({len(df):,} rows × {len(df.columns)} columns)"
                ),
                evidence={
                    "filename": filename,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "file_size_bytes": file_size_bytes,
                    "sha256": sha256_hash,
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record dataset_uploaded audit event: %s", audit_err)

        # Extract first 10 preview rows
        preview_df = df.head(10).replace({np.nan: None})
        preview_rows = preview_df.to_dict(orient="records")

        return DatasetPreviewResponse(
            dataset=DatasetResponse(
                id=saved_dataset.id,
                project_id=saved_dataset.project_id,
                filename=saved_dataset.filename,
                file_size_bytes=saved_dataset.file_size_bytes,
                row_count=saved_dataset.row_count,
                column_count=saved_dataset.column_count,
                sha256_hash=saved_dataset.sha256_hash,
                columns=[ColumnInfo(**c) for c in columns_meta],
                created_at=saved_dataset.created_at,
            ),
            preview_rows=preview_rows,
        )

    def get_dataset(self, project_id: str) -> DatasetPreviewResponse:
        """Fetch the active dataset and preview rows for a project."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        columns_meta = json.loads(dataset.columns_metadata)

        # Read sample rows from storage
        try:
            content = self.storage.read_file(
                project_id=project_id,
                subfolder="datasets",
                filename=Path(dataset.storage_path).name,
            )
            ext = "." + dataset.filename.rsplit(".", 1)[-1].lower()
            if ext == ".csv":
                df = pd.read_csv(io.BytesIO(content), nrows=10)
            else:
                df = pd.read_excel(io.BytesIO(content), nrows=10)
            preview_rows = df.replace({np.nan: None}).to_dict(orient="records")
        except Exception as exc:
            logger.warning("Could not read preview from disk: %s", exc)
            preview_rows = []

        return DatasetPreviewResponse(
            dataset=DatasetResponse(
                id=dataset.id,
                project_id=dataset.project_id,
                filename=dataset.filename,
                file_size_bytes=dataset.file_size_bytes,
                row_count=dataset.row_count,
                column_count=dataset.column_count,
                sha256_hash=dataset.sha256_hash,
                columns=[ColumnInfo(**c) for c in columns_meta],
                created_at=dataset.created_at,
            ),
            preview_rows=preview_rows,
        )

    def delete_dataset(self, project_id: str) -> None:
        """Delete active dataset and reset project status."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        # Delete file from storage
        self.storage.delete_file(
            project_id=project_id,
            subfolder="datasets",
            filename=Path(dataset.storage_path).name,
        )

        # Delete database record
        self.dataset_repo.delete(dataset)

        # Revert project status if no remaining datasets
        project.status = "created"
        self.project_repo.update(project)

        logger.info("Deleted dataset for project %s", project_id)
        try:
            from app.services.audit import AuditService

            AuditService(self.dataset_repo.db).record_event(
                project_id=project_id,
                action="dataset_deleted",
                reason=f"Removed dataset '{dataset.filename}' from project workspace",
                evidence={"dataset_id": dataset.id, "filename": dataset.filename},
                result="warning",
            )
        except Exception as audit_err:
            logger.warning("Failed to record dataset_deleted audit event: %s", audit_err)

    def load_demo_dataset(self, project_id: str, sample_name: str) -> DatasetPreviewResponse:
        """Load a built-in benchmark demonstration dataset (Titanic or California Housing)."""
        demo_map = {
            "titanic": "titanic.csv",
            "california_housing": "california_housing.csv",
        }
        if sample_name not in demo_map:
            raise DatasetValidationError(
                f"Unknown demo dataset '{sample_name}'. Supported: {', '.join(demo_map.keys())}"
            )

        filename = demo_map[sample_name]
        demo_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "demo")
        )
        file_path = os.path.join(demo_dir, filename)

        if not os.path.exists(file_path):
            raise DatasetValidationError(
                f"Demo dataset file '{filename}' was not found at '{file_path}'."
            )

        with open(file_path, "rb") as f:
            content = f.read()

        return self.upload_dataset(project_id, filename, content)

