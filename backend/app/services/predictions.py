"""Inference and Prediction Engine for Single, Batch, and Model Diagnostics (Phase 6)."""

import io
import json
import os
import uuid
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sklearn.pipeline import Pipeline

from app.api.v1.schemas.predictions import (
    BatchPredictionResponse,
    ClassProbability,
    ConfusionMatrixResponse,
    ModelDetailResponse,
    SinglePredictionResponse,
)
from app.core.config import get_settings
from app.core.errors import (
    AutoMLensError,
    DatasetNotFoundError,
    DatasetValidationError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger
from app.db.models import ModelRun, PredictionLog, TrainingRun
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import SessionLocal
from app.ml.task_detection import TaskType
from app.storage.base import StorageBackend

logger = get_logger("services.predictions")
settings = get_settings()

TARGET_CONFIG_SUBFOLDER = "config"
TARGET_CONFIG_FILENAME = "target_config.json"


class PredictionService:
    """Service handling single-row, batch predictions, confusion matrices, and model downloads."""

    def __init__(
        self,
        project_repo: ProjectRepository,
        dataset_repo: DatasetRepository,
        run_repo: RunRepository,
        storage: StorageBackend,
    ) -> None:
        self.project_repo = project_repo
        self.dataset_repo = dataset_repo
        self.run_repo = run_repo
        self.storage = storage

    def _get_model_run_and_pipeline(
        self, project_id: str, model_id: str
    ) -> tuple[ModelRun, TrainingRun, Pipeline, dict[str, Any]]:
        """Load ModelRun, TrainingRun, confirmed configuration, and the fitted Pipeline."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        # Retrieve confirmed target configuration
        if not self.storage.file_exists(
            project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
        ):
            raise DatasetValidationError("Target configuration not confirmed for this project.")

        config_bytes = self.storage.read_file(
            project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
        )
        target_config = json.loads(config_bytes.decode("utf-8"))

        # Find latest completed training run
        runs = self.run_repo.list_by_project_id(project_id)
        completed_runs = [r for r in runs if r.status == "completed"]
        if not completed_runs:
            raise AutoMLensError(
                message="No completed training run found for this project.",
                code="NO_TRAINED_MODELS",
            )

        latest_run = completed_runs[0]
        model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)

        # Find requested model_run
        target_model_run = next((m for m in model_runs if m.model_id == model_id), None)
        if not target_model_run:
            raise AutoMLensError(
                message=f"Model '{model_id}' was not evaluated in run {latest_run.id}.",
                code="MODEL_NOT_FOUND",
            )

        if not target_model_run.artifact_path or not os.path.exists(target_model_run.artifact_path):
            raise AutoMLensError(
                message=f"Model artifact for '{model_id}' not found on disk.",
                code="ARTIFACT_NOT_FOUND",
            )

        pipeline: Pipeline = joblib.load(target_model_run.artifact_path)
        return target_model_run, latest_run, pipeline, target_config

    def predict_single(
        self,
        project_id: str,
        model_id: str,
        inputs: dict[str, Any],
    ) -> SinglePredictionResponse:
        """Run inference on a single row of input feature values (Rule 8)."""
        model_run, training_run, pipeline, target_config = self._get_model_run_and_pipeline(
            project_id, model_id
        )

        target_col = target_config["target_column"]
        task_type = TaskType(target_config["task_type"])
        is_classification = task_type in (
            TaskType.BINARY_CLASSIFICATION,
            TaskType.MULTICLASS_CLASSIFICATION,
        )

        input_df = pd.DataFrame([inputs])

        # Run pipeline inference (Rule 8: pipeline handles preprocessing automatically)
        raw_pred = pipeline.predict(input_df)[0]

        probabilities: list[ClassProbability] | None = None
        confidence: float | None = None

        if is_classification:
            final_pred: Any = (
                bool(raw_pred) if isinstance(raw_pred, bool | np.bool_) else str(raw_pred)
            )

            # Compute prediction probabilities if estimator supports it
            if hasattr(pipeline, "predict_proba"):
                try:
                    prob_array = pipeline.predict_proba(input_df)[0]
                    classes = pipeline.classes_
                    probabilities = [
                        ClassProbability(
                            label=str(cls),
                            probability=round(float(prob), 4),
                        )
                        for cls, prob in zip(classes, prob_array, strict=False)
                    ]
                    confidence = round(float(np.max(prob_array)), 4)
                except Exception as exc:
                    logger.warning("predict_proba failed for %s: %s", model_id, exc)
        else:
            final_pred = round(float(raw_pred), 4)

        # Audit log the prediction (Rule 5)
        with SessionLocal() as db:
            log_entry = PredictionLog(
                id=str(uuid.uuid4()),
                project_id=project_id,
                model_id=model_id,
                prediction_type="single",
                row_count=1,
                input_summary=inputs,
                output_summary={"prediction": final_pred, "confidence": confidence},
            )
            db.add(log_entry)
            db.commit()

        try:
            from app.services.audit import AuditService

            with SessionLocal() as audit_db:
                AuditService(audit_db).record_event(
                    project_id=project_id,
                    action="prediction_single",
                    reason=f"Executed single-row inference on model '{model_run.model_name}'",
                    evidence={
                        "model_id": model_id,
                        "prediction": final_pred,
                        "confidence": confidence,
                    },
                    result="success",
                )
        except Exception as audit_err:
            logger.warning("Failed to record prediction_single audit event: %s", audit_err)

        return SinglePredictionResponse(
            model_id=model_id,
            model_name=model_run.model_name,
            task_type=task_type.value,
            target_column=target_col,
            prediction=final_pred,
            probabilities=probabilities,
            confidence=confidence,
        )

    def predict_batch(
        self,
        project_id: str,
        model_id: str,
        file_bytes: bytes,
        filename: str,
    ) -> tuple[BatchPredictionResponse, str]:
        """Perform batch inference on an uploaded CSV/Excel file and generate download artifact."""
        model_run, training_run, pipeline, target_config = self._get_model_run_and_pipeline(
            project_id, model_id
        )

        target_col = target_config["target_column"]
        task_type = TaskType(target_config["task_type"])
        is_classification = task_type in (
            TaskType.BINARY_CLASSIFICATION,
            TaskType.MULTICLASS_CLASSIFICATION,
        )

        # Ingest uploaded file
        try:
            if filename.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_bytes))
            elif filename.lower().endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(file_bytes))
            else:
                raise DatasetValidationError("Batch prediction file must be CSV or Excel format.")
        except Exception as exc:
            raise DatasetValidationError(f"Could not parse uploaded batch file: {exc}") from exc

        if df.empty:
            raise DatasetValidationError("Uploaded batch dataset is empty.")

        # Exclude target column if user passed it in the prediction file
        X_df = df.drop(columns=[target_col]) if target_col in df.columns else df

        # Execute predictions across all rows
        batch_preds = pipeline.predict(X_df)
        result_df = df.copy()
        pred_col_name = f"predicted_{target_col}"
        result_df[pred_col_name] = batch_preds

        # Append confidence if classification
        if is_classification and hasattr(pipeline, "predict_proba"):
            try:
                probs = pipeline.predict_proba(X_df)
                result_df["prediction_confidence"] = np.round(np.max(probs, axis=1), 4)
            except Exception:
                pass

        # Save exported annotated CSV
        export_filename = f"predictions_{model_id}_{uuid.uuid4().hex[:8]}.csv"
        export_dir = os.path.join(settings.AUTOMLENS_ARTIFACT_DIR, project_id, "exports")
        os.makedirs(export_dir, exist_ok=True)
        export_path = os.path.join(export_dir, export_filename)
        result_df.to_csv(export_path, index=False)

        # Preview 10 rows for UI table
        preview_rows = result_df.head(10).to_dict(orient="records")
        for row in preview_rows:
            for k, v in list(row.items()):
                if pd.isna(v):
                    row[k] = None
                elif isinstance(v, np.floating | float):
                    row[k] = round(float(v), 4)
                elif isinstance(v, np.integer | int):
                    row[k] = int(v)
                elif isinstance(v, np.bool_ | bool):
                    row[k] = bool(v)

        # Audit log the batch prediction (Rule 5)
        with SessionLocal() as db:
            log_entry = PredictionLog(
                id=str(uuid.uuid4()),
                project_id=project_id,
                model_id=model_id,
                prediction_type="batch",
                row_count=len(df),
                input_summary={"filename": filename, "features_provided": list(X_df.columns)},
                output_summary={"export_file": export_filename, "rows": len(df)},
            )
            db.add(log_entry)
            db.commit()

        try:
            from app.services.audit import AuditService

            with SessionLocal() as audit_db:
                AuditService(audit_db).record_event(
                    project_id=project_id,
                    action="prediction_batch",
                    reason=(
                        f"Executed batch inference on {len(df):,} rows using "
                        f"model '{model_run.model_name}'"
                    ),
                    evidence={
                        "model_id": model_id,
                        "rows": len(df),
                        "filename": filename,
                        "output_file": export_filename,
                    },
                    result="success",
                )
        except Exception as audit_err:
            logger.warning("Failed to record prediction_batch audit event: %s", audit_err)

        download_url = f"/api/v1/projects/{project_id}/exports/{export_filename}"

        return (
            BatchPredictionResponse(
                model_id=model_id,
                model_name=model_run.model_name,
                task_type=task_type.value,
                target_column=target_col,
                total_rows=len(df),
                preview_rows=preview_rows,
                download_url=download_url,
            ),
            export_path,
        )

    def get_confusion_matrix(
        self,
        project_id: str,
        model_id: str,
    ) -> ConfusionMatrixResponse:
        """Compute confusion matrix and per-class precision/recall metrics on training data."""
        model_run, training_run, pipeline, target_config = self._get_model_run_and_pipeline(
            project_id, model_id
        )

        task_type = TaskType(target_config["task_type"])
        if task_type == TaskType.REGRESSION:
            raise AutoMLensError(
                message="Confusion matrix is only defined for classification tasks.",
                code="INVALID_TASK_FOR_CONFUSION_MATRIX",
            )

        target_col = target_config["target_column"]

        # Load training dataset
        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        raw_bytes = self.storage.read_file(
            project_id, "datasets", os.path.basename(dataset.storage_path)
        )
        df = pd.read_csv(io.BytesIO(raw_bytes))

        # Drop null targets
        clean_df = df.dropna(subset=[target_col]).reset_index(drop=True)
        X = clean_df.drop(columns=[target_col])
        y_true = clean_df[target_col].astype(str)

        y_pred = [str(p) for p in pipeline.predict(X)]

        # Determine class ordering
        classes = sorted(list(set(y_true.unique()).union(set(y_pred))))

        # Compute confusion matrix
        matrix = confusion_matrix(y_true, y_pred, labels=classes).tolist()

        # Compute per-class precision, recall, and f1-score
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, labels=classes, zero_division=0
        )

        per_class_metrics: dict[str, dict[str, float]] = {}
        for idx, cls in enumerate(classes):
            per_class_metrics[cls] = {
                "precision": round(float(precision[idx]), 4),
                "recall": round(float(recall[idx]), 4),
                "f1": round(float(f1[idx]), 4),
            }

        overall_acc = round(float(np.mean(np.array(y_true) == np.array(y_pred))), 4)

        return ConfusionMatrixResponse(
            model_id=model_id,
            model_name=model_run.model_name,
            classes=classes,
            matrix=matrix,
            overall_accuracy=overall_acc,
            per_class_metrics=per_class_metrics,
        )

    def get_model_details(
        self,
        project_id: str,
        model_id: str,
    ) -> ModelDetailResponse:
        """Fetch complete evaluation telemetry, metrics, and artifact presence."""
        model_run, training_run, _, target_config = self._get_model_run_and_pipeline(
            project_id, model_id
        )

        exists = bool(model_run.artifact_path and os.path.exists(model_run.artifact_path))

        return ModelDetailResponse(
            model_id=model_run.model_id,
            model_name=model_run.model_name,
            is_baseline=model_run.is_baseline,
            task_type=target_config["task_type"],
            primary_metric_name=model_run.primary_metric_name,
            primary_metric_score=model_run.primary_metric_score,
            primary_metric_std=model_run.primary_metric_std,
            all_metrics=model_run.all_metrics,
            train_time_seconds=model_run.train_time_seconds,
            artifact_exists=exists,
            artifact_path=model_run.artifact_path,
        )
