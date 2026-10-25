"""Export generation service for models, predictions, manifests, and audit records."""

import csv
import hashlib
import io
import json
import os
import re
import sys
from datetime import UTC, datetime
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.schemas.exports import ExportItemStatus, ExportStatusResponse
from app.core.config import get_settings
from app.core.errors import AutoMLensError, ProjectNotFoundError
from app.core.logging import get_logger
from app.db.models import ModelRun, PredictionLog
from app.db.repositories.audit import AuditRepository
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.storage.base import StorageBackend

logger = get_logger("services.exports")
settings = get_settings()


class ExportService:
    """Service providing unified export generators and integrity verification (Rules 5, 8)."""

    def __init__(
        self,
        db: Session,
        project_repo: ProjectRepository,
        dataset_repo: DatasetRepository,
        run_repo: RunRepository,
        storage: StorageBackend,
    ) -> None:
        self.db = db
        self.project_repo = project_repo
        self.dataset_repo = dataset_repo
        self.run_repo = run_repo
        self.audit_repo = AuditRepository(db)
        self.storage = storage

    def _safe_filename_part(self, text: str) -> str:
        """Sanitize string for inclusion in export filenames."""
        return re.sub(r"[^a-zA-Z0-9_\-]", "_", text.strip().lower())[:40]

    def get_export_status(self, project_id: str) -> ExportStatusResponse:
        """Inspect and return the availability of all 6 exportable artifacts."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        runs = self.run_repo.list_by_project_id(project_id, limit=1)
        latest_run = runs[0] if runs else None

        # Check quality report profile existence
        has_profile = self.storage.file_exists(project_id, "profiles", "profile.json")

        # Check leaderboard / completed runs
        has_completed_run = False
        top_model: ModelRun | None = None
        if latest_run:
            model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)
            completed_runs = [m for m in model_runs if m.status == "completed"]
            has_completed_run = len(completed_runs) > 0
            if completed_runs:
                # Find best model run
                if latest_run.best_model_id:
                    for m in completed_runs:
                        if m.model_id == latest_run.best_model_id:
                            top_model = m
                            break
                if not top_model:
                    top_model = completed_runs[0]

        # Check predictions existence
        pred_stmt = select(PredictionLog.id).where(PredictionLog.project_id == project_id).limit(1)
        has_predictions = self.db.execute(pred_stmt).scalar_one_or_none() is not None

        # Check pipeline joblib file existence
        has_pipeline = False
        pipeline_size = None
        pipeline_sha = None
        if top_model and top_model.artifact_path and os.path.exists(top_model.artifact_path):
            has_pipeline = True
            pipeline_size = os.path.getsize(top_model.artifact_path)
            try:
                with open(top_model.artifact_path, "rb") as f:
                    pipeline_sha = hashlib.sha256(f.read()).hexdigest()
            except Exception as e:
                logger.warning("Could not compute checksum for %s: %s", top_model.artifact_path, e)

        # Audit events always available
        audit_count = self.audit_repo.count_by_project(project_id)

        exports = [
            ExportItemStatus(
                export_type="quality_report",
                title="Data Quality & Profile Report",
                description=(
                    "Comprehensive univariate statistical profile, outlier boundaries, "
                    "and quality flags."
                ),
                format="json",
                is_available=has_profile,
                reason_unavailable="Dataset profile has not been generated yet."
                if not has_profile
                else None,
            ),
            ExportItemStatus(
                export_type="leaderboard",
                title="Model Leaderboard & Evaluation",
                description=(
                    "Ranked candidate algorithm performance across 5-fold cross-validation metrics."
                ),
                format="csv",
                is_available=has_completed_run,
                reason_unavailable="No parallel training run completed yet."
                if not has_completed_run
                else None,
            ),
            ExportItemStatus(
                export_type="predictions",
                title="Prediction Inferences Ledger",
                description=(
                    "Complete log of single-row and batch inferences with input/output payloads."
                ),
                format="csv",
                is_available=has_predictions,
                reason_unavailable="No predictions have been generated yet."
                if not has_predictions
                else None,
            ),
            ExportItemStatus(
                export_type="manifest",
                title="Reproducibility Run Manifest",
                description=(
                    "Full runtime audit manifest with random seed, CV folds, dataset "
                    "fingerprint, and dependencies."
                ),
                format="json",
                is_available=latest_run is not None,
                reason_unavailable="Training has not been initiated for this project."
                if not latest_run
                else None,
            ),
            ExportItemStatus(
                export_type="pipeline",
                title="Trained Pipeline Artifact (.joblib)",
                description=(
                    "Serialized scikit-learn Pipeline (ColumnTransformer + Estimator) ready for "
                    "production inference."
                ),
                format="joblib",
                is_available=has_pipeline,
                file_size_bytes=pipeline_size,
                checksum_sha256=pipeline_sha,
                reason_unavailable="Trained pipeline artifact is not ready or missing from disk."
                if not has_pipeline
                else None,
            ),
            ExportItemStatus(
                export_type="audit_log",
                title="Immutable Audit Ledger",
                description=(
                    f"Full chronological event history ({audit_count} entries recorded) "
                    "with reasons and results."
                ),
                format="json",
                is_available=True,
            ),
        ]

        return ExportStatusResponse(project_id=project_id, exports=exports)

    def generate_export(
        self,
        project_id: str,
        export_type: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Generate and package export content.

        Returns:
            Tuple of (file_bytes, media_type, filename, sha256_checksum)
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        safe_project_name = self._safe_filename_part(project.name)
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")

        if export_type == "quality_report":
            return self._export_quality_report(project_id, safe_project_name, timestamp)
        elif export_type == "leaderboard":
            return self._export_leaderboard(project_id, safe_project_name, timestamp)
        elif export_type == "predictions":
            return self._export_predictions(project_id, safe_project_name, timestamp)
        elif export_type == "manifest":
            return self._export_manifest(project, safe_project_name, timestamp)
        elif export_type == "pipeline":
            return self._export_pipeline(project_id, safe_project_name)
        elif export_type == "audit_log":
            return self._export_audit_log(project_id, safe_project_name, timestamp)
        elif self.storage.file_exists(project_id, "exports", export_type):
            raw_bytes = self.storage.read_file(project_id, "exports", export_type)
            media_type = "text/csv" if export_type.endswith(".csv") else "application/octet-stream"
            sha = hashlib.sha256(raw_bytes).hexdigest()
            return raw_bytes, media_type, export_type, sha
        else:
            raise AutoMLensError(
                f"Unknown export type or file '{export_type}'. Supported: "
                "quality_report, leaderboard, predictions, manifest, pipeline, audit_log",
                code="INVALID_EXPORT_TYPE",
            )

    def _export_quality_report(
        self,
        project_id: str,
        safe_name: str,
        timestamp: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Export profile.json as formatted JSON."""
        if not self.storage.file_exists(project_id, "profiles", "profile.json"):
            raise AutoMLensError(
                "Data quality profile does not exist. Please generate profiling first.",
                code="EXPORT_NOT_FOUND",
            )

        raw_bytes = self.storage.read_file(project_id, "profiles", "profile.json")
        try:
            parsed = json.loads(raw_bytes.decode("utf-8"))
            formatted_bytes = json.dumps(parsed, indent=2).encode("utf-8")
        except Exception:
            formatted_bytes = raw_bytes

        filename = f"automlens_quality_report_{safe_name}_{timestamp}.json"
        sha = hashlib.sha256(formatted_bytes).hexdigest()
        return formatted_bytes, "application/json", filename, sha

    def _export_leaderboard(
        self,
        project_id: str,
        safe_name: str,
        timestamp: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Generate and export model comparison leaderboard as CSV."""
        runs = self.run_repo.list_by_project_id(project_id, limit=1)
        if not runs:
            raise AutoMLensError(
                "No training runs found. Please run model training first.", code="EXPORT_NOT_FOUND"
            )

        latest_run = runs[0]
        model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)
        if not model_runs:
            raise AutoMLensError(
                "No model results found in the latest training run.", code="EXPORT_NOT_FOUND"
            )

        # Sort: completed first, best score descending
        sorted_models = sorted(
            model_runs,
            key=lambda m: (m.status == "completed", m.primary_metric_score or -9999),
            reverse=True,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Rank",
                "Model ID",
                "Model Name",
                "Is Baseline",
                "Status",
                "Primary Metric",
                "Score (Mean)",
                "Score (Std Dev)",
                "Training Time (s)",
                "All Metrics Summary",
                "Artifact Path",
                "Completed At UTC",
            ]
        )

        for rank, m in enumerate(sorted_models, start=1):
            metrics_summary = json.dumps(m.all_metrics) if m.all_metrics else "{}"
            writer.writerow(
                [
                    rank if m.status == "completed" else "N/A",
                    m.model_id,
                    m.model_name,
                    "YES" if m.is_baseline else "NO",
                    m.status,
                    m.primary_metric_name,
                    f"{m.primary_metric_score:.4f}"
                    if m.primary_metric_score is not None
                    else "N/A",
                    f"{m.primary_metric_std:.4f}" if m.primary_metric_std is not None else "N/A",
                    f"{m.train_time_seconds:.2f}" if m.train_time_seconds is not None else "N/A",
                    metrics_summary,
                    m.artifact_path or "N/A",
                    m.completed_at.isoformat() if m.completed_at else "N/A",
                ]
            )

        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"automlens_leaderboard_{safe_name}_{timestamp}.csv"
        sha = hashlib.sha256(csv_bytes).hexdigest()
        return csv_bytes, "text/csv; charset=utf-8", filename, sha

    def _export_predictions(
        self,
        project_id: str,
        safe_name: str,
        timestamp: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Generate and export past inference history as CSV."""
        stmt = (
            select(PredictionLog)
            .where(PredictionLog.project_id == project_id)
            .order_by(PredictionLog.created_at.desc())
        )
        logs = list(self.db.execute(stmt).scalars().all())

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Prediction ID",
                "Model ID",
                "Type",
                "Row Count",
                "Input Summary",
                "Output Summary",
                "Created At UTC",
            ]
        )

        if not logs:
            writer.writerow(["No predictions recorded yet", "", "", "", "", "", ""])
        else:
            for item in logs:
                writer.writerow(
                    [
                        item.id,
                        item.model_id,
                        item.prediction_type,
                        item.row_count,
                        json.dumps(item.input_summary) if item.input_summary else "{}",
                        json.dumps(item.output_summary) if item.output_summary else "{}",
                        item.created_at.isoformat() if item.created_at else "N/A",
                    ]
                )

        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"automlens_predictions_{safe_name}_{timestamp}.csv"
        sha = hashlib.sha256(csv_bytes).hexdigest()
        return csv_bytes, "text/csv; charset=utf-8", filename, sha

    def _export_manifest(
        self,
        project: Any,
        safe_name: str,
        timestamp: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Generate and export a comprehensive reproducibility run manifest."""
        dataset = self.dataset_repo.get_latest_by_project_id(project.id)
        runs = self.run_repo.list_by_project_id(project.id, limit=1)
        latest_run = runs[0] if runs else None

        models_evaluated = []
        if latest_run:
            for m in self.run_repo.list_model_runs_by_run_id(latest_run.id):
                models_evaluated.append(
                    {
                        "model_id": m.model_id,
                        "model_name": m.model_name,
                        "is_baseline": m.is_baseline,
                        "status": m.status,
                        "primary_metric": m.primary_metric_name,
                        "score_mean": m.primary_metric_score,
                        "score_std": m.primary_metric_std,
                        "train_time_seconds": m.train_time_seconds,
                        "metrics": m.all_metrics,
                    }
                )

        manifest_data = {
            "meta": {
                "application": "AutoMLens",
                "purpose": "Reproducible Machine Learning Execution Manifest",
                "exported_at": datetime.now(UTC).isoformat(),
                "academic_compliance": (
                    "Rules 1-10 Enforced (Zero Data Leakage, 5-Fold CV, Dummy Baselines)"
                ),
            },
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else None,
            },
            "dataset": {
                "filename": dataset.filename if dataset else None,
                "file_size_bytes": dataset.file_size_bytes if dataset else None,
                "row_count": dataset.row_count if dataset else None,
                "column_count": dataset.column_count if dataset else None,
            }
            if dataset
            else None,
            "training_run": {
                "run_id": latest_run.id if latest_run else None,
                "status": latest_run.status if latest_run else None,
                "target_column": latest_run.target_column if latest_run else None,
                "task_type": latest_run.task_type if latest_run else None,
                "primary_metric": latest_run.primary_metric if latest_run else None,
                "cv_folds": 5,
                "random_state_seed": 42,
                "best_model_id": latest_run.best_model_id if latest_run else None,
                "best_score": latest_run.best_score if latest_run else None,
                "completed_at": latest_run.completed_at.isoformat()
                if latest_run and latest_run.completed_at
                else None,
            }
            if latest_run
            else None,
            "runtime_environment": {
                "python_version": sys.version,
                "scikit_learn_version": sklearn.__version__,
                "pandas_version": pd.__version__,
                "numpy_version": np.__version__,
            },
            "models_evaluated": models_evaluated,
        }

        json_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
        filename = f"automlens_manifest_{safe_name}_{timestamp}.json"
        sha = hashlib.sha256(json_bytes).hexdigest()
        return json_bytes, "application/json", filename, sha

    def _export_pipeline(
        self,
        project_id: str,
        safe_name: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Export the selected or top-performing fitted scikit-learn pipeline (.joblib)."""
        runs = self.run_repo.list_by_project_id(project_id, limit=1)
        if not runs:
            raise AutoMLensError("No training runs found.", code="EXPORT_NOT_FOUND")

        latest_run = runs[0]
        model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)
        completed_runs = [m for m in model_runs if m.status == "completed"]
        if not completed_runs:
            raise AutoMLensError(
                "No trained models found in the latest run.", code="EXPORT_NOT_FOUND"
            )

        selected_model: ModelRun | None = None
        if latest_run.best_model_id:
            for m in completed_runs:
                if m.model_id == latest_run.best_model_id:
                    selected_model = m
                    break
        if not selected_model:
            selected_model = completed_runs[0]

        if not selected_model.artifact_path or not os.path.exists(selected_model.artifact_path):
            raise AutoMLensError(
                f"Trained pipeline artifact for '{selected_model.model_id}' "
                f"was not found at '{selected_model.artifact_path}'.",
                code="EXPORT_NOT_FOUND",
            )

        with open(selected_model.artifact_path, "rb") as f:
            artifact_bytes = f.read()

        filename = f"automlens_pipeline_{selected_model.model_id}_{safe_name}.joblib"
        sha = hashlib.sha256(artifact_bytes).hexdigest()
        return artifact_bytes, "application/octet-stream", filename, sha

    def _export_audit_log(
        self,
        project_id: str,
        safe_name: str,
        timestamp: str,
    ) -> tuple[bytes, str, str, str | None]:
        """Export the full chronological audit ledger as structured JSON."""
        events = self.audit_repo.list_all_for_project(project_id)
        log_records = [
            {
                "id": ev.id,
                "action": ev.action,
                "reason": ev.reason,
                "evidence": ev.evidence,
                "result": ev.result,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for ev in events
        ]

        payload = {
            "meta": {
                "application": "AutoMLens",
                "export": "Audit Ledger Log",
                "project_id": project_id,
                "event_count": len(log_records),
                "exported_at": datetime.now(UTC).isoformat(),
            },
            "events": log_records,
        }

        json_bytes = json.dumps(payload, indent=2).encode("utf-8")
        filename = f"automlens_audit_log_{safe_name}_{timestamp}.json"
        sha = hashlib.sha256(json_bytes).hexdigest()
        return json_bytes, "application/json", filename, sha
