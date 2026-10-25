"""Multi-core Parallel Model Training Service with 5-Fold Cross-Validation (Phase 5)."""

import json
import os
import time
import uuid
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import UTC, datetime
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, StratifiedKFold

from app.core.config import get_settings
from app.core.errors import DatasetNotFoundError, DatasetValidationError, ProjectNotFoundError
from app.core.events import event_hub
from app.core.logging import get_logger
from app.db.models import ModelRun, TrainingRun
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.db.session import SessionLocal
from app.ml.metrics import (
    aggregate_cv_metrics,
    compute_classification_metrics,
    compute_regression_metrics,
)
from app.ml.pipeline_factory import create_pipeline
from app.ml.task_detection import TaskType
from app.storage.base import StorageBackend

logger = get_logger("services.training")
settings = get_settings()

TARGET_CONFIG_SUBFOLDER = "config"
TARGET_CONFIG_FILENAME = "target_config.json"


def _train_single_model_worker(args: dict[str, Any]) -> dict[str, Any]:
    """Pure top-level worker function executing 5-fold CV on an isolated CPU core.

    Strictly satisfies:
    - Windows multiprocessing pickle-safety (spawn mode).
    - Rule 1: Zero leakage via ColumnTransformer Pipeline per fold.
    - Rule 3: 5-Fold Cross-Validation.
    - Rule 4: Mandatory Dummy Baseline.
    - Rule 8: Full pipeline refitted on 100% data and persisted via joblib.
    """
    model_id: str = args["model_id"]
    model_name: str = args["model_name"]
    is_baseline: bool = args["is_baseline"]
    task_type_str: str = args["task_type"]
    primary_metric: str = args["primary_metric"]
    X_df: pd.DataFrame = args["X_df"]
    y_series: pd.Series = args["y_series"]
    numeric_cols: list[str] = args["numeric_cols"]
    categorical_cols: list[str] = args["categorical_cols"]
    preprocessing_plan: list[dict[str, Any]] = args.get("preprocessing_plan", [])
    cv_splits: list[tuple[np.ndarray, np.ndarray]] = args["cv_splits"]
    random_state: int = args.get("random_state", 42)
    save_artifact_path: str = args["save_artifact_path"]

    task_type = TaskType(task_type_str)
    is_classification = task_type in (
        TaskType.BINARY_CLASSIFICATION,
        TaskType.MULTICLASS_CLASSIFICATION,
    )

    t0 = time.perf_counter()
    fold_metrics: list[dict[str, float]] = []

    try:
        # 1. Evaluate Model across Cross-Validation Folds
        for _fold_idx, (train_idx, val_idx) in enumerate(cv_splits, start=1):
            X_train, y_train = X_df.iloc[train_idx], y_series.iloc[train_idx]
            X_val, y_val = X_df.iloc[val_idx], y_series.iloc[val_idx]

            # Construct clean, leakage-free pipeline for this fold
            pipe = create_pipeline(
                model_id=model_id,
                task_type=task_type,
                numeric_cols=numeric_cols,
                categorical_cols=categorical_cols,
                preprocessing_plan=preprocessing_plan,
                random_state=random_state,
            )

            # Fit strictly on fold training data
            pipe.fit(X_train, y_train)

            # Evaluate on fold validation data
            y_pred = pipe.predict(X_val)

            if is_classification:
                y_prob = None
                if hasattr(pipe, "predict_proba"):
                    try:
                        y_prob = pipe.predict_proba(X_val)
                    except Exception:
                        y_prob = None
                f_metrics = compute_classification_metrics(y_val.to_numpy(), y_pred, y_prob)
            else:
                f_metrics = compute_regression_metrics(y_val.to_numpy(), y_pred)

            fold_metrics.append(f_metrics)

        # 2. Aggregate CV metrics (mean ± std)
        aggregated = aggregate_cv_metrics(fold_metrics, primary_metric)
        primary_score = aggregated.get(primary_metric, {}).get("mean", 0.0)
        primary_std = aggregated.get(primary_metric, {}).get("std", 0.0)

        # 3. Full Dataset Refit (Rule 8: Persist fitted model on 100% data)
        full_pipe = create_pipeline(
            model_id=model_id,
            task_type=task_type,
            numeric_cols=numeric_cols,
            categorical_cols=categorical_cols,
            preprocessing_plan=preprocessing_plan,
            random_state=random_state,
        )
        full_pipe.fit(X_df, y_series)

        # Ensure directory exists and persist joblib artifact
        os.makedirs(os.path.dirname(save_artifact_path), exist_ok=True)
        joblib.dump(full_pipe, save_artifact_path)

        train_time = round(time.perf_counter() - t0, 3)

        return {
            "model_id": model_id,
            "model_name": model_name,
            "is_baseline": is_baseline,
            "status": "completed",
            "metrics": aggregated,
            "primary_metric_score": primary_score,
            "primary_metric_std": primary_std,
            "train_time_seconds": train_time,
            "artifact_path": save_artifact_path,
            "error_message": None,
        }

    except Exception as exc:
        logger.exception("Worker failed training model '%s': %s", model_id, exc)
        return {
            "model_id": model_id,
            "model_name": model_name,
            "is_baseline": is_baseline,
            "status": "failed",
            "metrics": None,
            "primary_metric_score": None,
            "primary_metric_std": None,
            "train_time_seconds": round(time.perf_counter() - t0, 3),
            "artifact_path": None,
            "error_message": str(exc),
        }


class TrainingService:
    """Service orchestrating multi-core model training, SSE progress streaming, and persistence."""

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

    def _load_dataset_and_config(self, project_id: str) -> tuple[pd.DataFrame, dict[str, Any]]:
        """Load DataFrame and confirmed target configuration artifact."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        # Read dataset CSV
        raw_bytes = self.storage.read_file(
            project_id, "datasets", os.path.basename(dataset.storage_path)
        )
        import io

        df = pd.read_csv(io.BytesIO(raw_bytes))

        # Read confirmed target configuration
        if not self.storage.file_exists(
            project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
        ):
            raise DatasetValidationError(
                "Target configuration not confirmed. Please confirm target selection first."
            )

        config_bytes = self.storage.read_file(
            project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
        )
        target_config = json.loads(config_bytes.decode("utf-8"))

        return df, target_config

    def start_training_run(self, project_id: str) -> TrainingRun:
        """Initialize and trigger a background parallel training run."""
        df, target_config = self._load_dataset_and_config(project_id)

        target_col = target_config["target_column"]
        task_type_str = target_config["task_type"]
        selected_model_ids = target_config["selected_models"]
        primary_metric = target_config["primary_metric"]

        if target_col not in df.columns:
            raise DatasetValidationError(f"Target column '{target_col}' not found in dataset.")

        # Create TrainingRun DB record
        run = TrainingRun(
            id=str(uuid.uuid4()),
            project_id=project_id,
            target_column=target_col,
            task_type=task_type_str,
            primary_metric=primary_metric,
            status="running",
            total_models=len(selected_model_ids),
            completed_models=0,
        )
        self.run_repo.create(run)

        # Create initial ModelRun DB records (queued)
        model_name_map = {
            "dummy_classifier": "Dummy Classifier (Baseline)",
            "dummy_regressor": "Dummy Regressor (Mean Baseline)",
            "logistic_regression": "Logistic Regression",
            "ridge_regression": "Ridge Regression",
            "random_forest": "Random Forest",
            "gradient_boosting": "HistGradientBoosting",
            "hist_gradient_boosting": "HistGradientBoosting",
        }

        for m_id in selected_model_ids:
            is_base = "dummy" in m_id
            m_run = ModelRun(
                id=str(uuid.uuid4()),
                run_id=run.id,
                model_id=m_id,
                model_name=model_name_map.get(m_id, m_id.replace("_", " ").title()),
                is_baseline=is_base,
                status="queued",
                primary_metric_name=primary_metric,
            )
            self.run_repo.create_model_run(m_run)

        try:
            from app.services.audit import AuditService

            AuditService(self.project_repo.db).record_event(
                project_id=project_id,
                action="training_started",
                reason=(
                    f"Dispatched parallel 5-fold cross-validation for "
                    f"{len(selected_model_ids)} candidate models"
                ),
                evidence={
                    "run_id": run.id,
                    "target_column": target_col,
                    "task_type": task_type_str,
                    "primary_metric": primary_metric,
                    "candidate_models": selected_model_ids,
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record training_started audit event: %s", audit_err)

        return run

    def execute_training_run_background(
        self,
        run_id: str,
        project_id: str,
        target_config: dict[str, Any],
        df: pd.DataFrame,
    ) -> None:
        """Background runner coordinating parallel CPU training and SSE telemetry."""
        # Emit initial SSE event
        event_hub.publish(
            run_id=run_id,
            event_type="run_started",
            data={
                "run_id": run_id,
                "project_id": project_id,
                "target_column": target_config["target_column"],
                "task_type": target_config["task_type"],
                "total_models": len(target_config["selected_models"]),
                "primary_metric": target_config["primary_metric"],
                "timestamp": datetime.now(UTC).isoformat(),
            },
        )

        try:
            results = self._run_multiprocessing_pool(
                run_id=run_id,
                project_id=project_id,
                target_config=target_config,
                df=df,
            )
            self._finalize_training_run(run_id, project_id, results, target_config)
        except Exception as exc:
            logger.exception("Failed training run %s: %s", run_id, exc)
            self._fail_training_run(run_id, str(exc))

    def _run_multiprocessing_pool(
        self,
        run_id: str,
        project_id: str,
        target_config: dict[str, Any],
        df: pd.DataFrame,
    ) -> list[dict[str, Any]]:
        """Worker pool dispatcher executing across CPU cores."""
        target_col = target_config["target_column"]
        task_type_str = target_config["task_type"]
        selected_models = target_config["selected_models"]
        primary_metric = target_config["primary_metric"]

        # Drop rows where target is null (Rule: targets cannot be imputed)
        clean_df = df.dropna(subset=[target_col]).reset_index(drop=True)
        X = clean_df.drop(columns=[target_col])
        y = clean_df[target_col]

        # Determine numeric vs categorical feature lists
        numeric_cols = [
            c
            for c in X.columns
            if pd.api.types.is_numeric_dtype(X[c]) and not pd.api.types.is_bool_dtype(X[c])
        ]
        categorical_cols = [c for c in X.columns if c not in numeric_cols]

        # Generate 5-fold cross-validation splits (Rule 3)
        task_type = TaskType(task_type_str)
        is_classification = task_type in (
            TaskType.BINARY_CLASSIFICATION,
            TaskType.MULTICLASS_CLASSIFICATION,
        )

        if is_classification:
            # Check class balance for minimum folds
            class_counts = y.value_counts()
            min_count = int(class_counts.min())
            n_splits = 5 if min_count >= 5 else max(2, min_count)
            cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
            cv_splits = list(cv.split(X, y))
        else:
            cv = KFold(n_splits=5, shuffle=True, random_state=42)
            cv_splits = list(cv.split(X, y))

        model_name_map = {
            "dummy_classifier": "Dummy Classifier (Baseline)",
            "dummy_regressor": "Dummy Regressor (Mean Baseline)",
            "logistic_regression": "Logistic Regression",
            "ridge_regression": "Ridge Regression",
            "random_forest": "Random Forest",
            "gradient_boosting": "HistGradientBoosting",
            "hist_gradient_boosting": "HistGradientBoosting",
        }

        # Build worker payload args
        tasks: list[dict[str, Any]] = []
        for m_id in selected_models:
            save_path = os.path.join(
                settings.AUTOMLENS_ARTIFACT_DIR,
                project_id,
                "models",
                run_id,
                f"{m_id}.joblib",
            )
            tasks.append(
                {
                    "model_id": m_id,
                    "model_name": model_name_map.get(m_id, m_id.replace("_", " ").title()),
                    "is_baseline": "dummy" in m_id,
                    "task_type": task_type_str,
                    "primary_metric": primary_metric,
                    "X_df": X,
                    "y_series": y,
                    "numeric_cols": numeric_cols,
                    "categorical_cols": categorical_cols,
                    "cv_splits": cv_splits,
                    "random_state": 42,
                    "save_artifact_path": save_path,
                }
            )

        completed_results: list[dict[str, Any]] = []
        max_workers = min(settings.AUTOMLENS_MAX_WORKERS, len(tasks))

        logger.info(
            "Executing parallel training on %d CPU workers for %d models",
            max_workers,
            len(tasks),
        )

        # Execute on ProcessPoolExecutor
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            future_to_model = {
                executor.submit(_train_single_model_worker, t): t["model_id"] for t in tasks
            }

            for future in as_completed(future_to_model):
                res = future.result()
                completed_results.append(res)

                # Broadcast live SSE event per finished model
                event_hub.publish(
                    run_id=run_id,
                    event_type="model_completed",
                    data={
                        "run_id": run_id,
                        "model_id": res["model_id"],
                        "model_name": res["model_name"],
                        "is_baseline": res["is_baseline"],
                        "status": res["status"],
                        "primary_metric": primary_metric,
                        "score": res.get("primary_metric_score"),
                        "std": res.get("primary_metric_std"),
                        "metrics": res.get("metrics"),
                        "train_time_seconds": res.get("train_time_seconds"),
                        "error_message": res.get("error_message"),
                        "timestamp": datetime.now(UTC).isoformat(),
                    },
                )

        return completed_results

    def _finalize_training_run(
        self,
        run_id: str,
        project_id: str,
        results: list[dict[str, Any]],
        target_config: dict[str, Any],
    ) -> None:
        """Update DB models and mark project status as 'trained'."""
        with SessionLocal() as db:
            run_repo = RunRepository(db)
            project_repo = ProjectRepository(db)

            run = run_repo.get_by_id(run_id)
            if not run:
                return

            # Update ModelRun entities
            existing_models = run_repo.list_model_runs_by_run_id(run_id)
            model_by_id = {m.model_id: m for m in existing_models}

            valid_scores: list[tuple[str, float]] = []
            for r in results:
                m_run = model_by_id.get(r["model_id"])
                if m_run:
                    m_run.status = r["status"]
                    m_run.primary_metric_score = r.get("primary_metric_score")
                    m_run.primary_metric_std = r.get("primary_metric_std")
                    m_run.all_metrics = r.get("metrics")
                    m_run.train_time_seconds = r.get("train_time_seconds")
                    m_run.artifact_path = r.get("artifact_path")
                    m_run.error_message = r.get("error_message")
                    m_run.completed_at = datetime.now(UTC)
                    run_repo.update_model_run(m_run)

                    if r["status"] == "completed" and r.get("primary_metric_score") is not None:
                        valid_scores.append((r["model_id"], r["primary_metric_score"]))

            # Determine best model
            best_model_id = None
            best_score = None
            if valid_scores:
                # If metric is an error (e.g. RMSE, MAE), lower is better
                lower_is_better = any(
                    err_term in target_config["primary_metric"].lower()
                    for err_term in ("rmse", "mae", "loss")
                )
                if lower_is_better:
                    best_model_id, best_score = min(valid_scores, key=lambda x: x[1])
                else:
                    best_model_id, best_score = max(valid_scores, key=lambda x: x[1])

            run.status = "completed"
            run.completed_models = len([r for r in results if r["status"] == "completed"])
            run.best_model_id = best_model_id
            run.best_score = best_score
            run.completed_at = datetime.now(UTC)
            run_repo.update(run)

            # Update project status to 'trained'
            project = project_repo.get_by_id(project_id)
            if project:
                project.status = "trained"
                project_repo.update(project)

            # Emit final SSE event
            event_hub.publish(
                run_id=run_id,
                event_type="run_completed",
                data={
                    "run_id": run_id,
                    "project_id": project_id,
                    "status": "completed",
                    "best_model_id": best_model_id,
                    "best_score": best_score,
                    "completed_models": run.completed_models,
                    "total_models": run.total_models,
                    "completed_at": run.completed_at.isoformat(),
                },
            )

            logger.info(
                "Training run %s completed: best model '%s' (score=%.4f)",
                run_id,
                best_model_id,
                best_score if best_score is not None else 0.0,
            )

            try:
                from app.services.audit import AuditService

                score_fmt = f"{best_score:.4f}" if best_score is not None else "N/A"
                AuditService(db).record_event(
                    project_id=project_id,
                    action="training_completed",
                    reason=(
                        f"Parallel training completed across {run.total_models} models. "
                        f"Top performer: {best_model_id} (Score: {score_fmt} "
                        f"{target_config['primary_metric']})"
                    ),
                    evidence={
                        "run_id": run_id,
                        "best_model_id": best_model_id,
                        "best_score": best_score,
                        "completed_models": run.completed_models,
                        "total_models": run.total_models,
                    },
                    result="success",
                )
            except Exception as audit_err:
                logger.warning("Failed to record training_completed audit event: %s", audit_err)

    def _fail_training_run(self, run_id: str, error_msg: str) -> None:
        """Mark run as failed and notify SSE listeners."""
        with SessionLocal() as db:
            run_repo = RunRepository(db)
            run = run_repo.get_by_id(run_id)
            if run:
                run.status = "failed"
                run.error_message = error_msg
                run.completed_at = datetime.now(UTC)
                run_repo.update(run)

                try:
                    from app.services.audit import AuditService

                    AuditService(db).record_event(
                        project_id=run.project_id,
                        action="training_failed",
                        reason=f"Training run failed: {error_msg}",
                        evidence={"run_id": run_id, "error_message": error_msg},
                        result="failure",
                    )
                except Exception as audit_err:
                    logger.warning("Failed to record training_failed audit event: %s", audit_err)

        event_hub.publish(
            run_id=run_id,
            event_type="run_failed",
            data={
                "run_id": run_id,
                "status": "failed",
                "error_message": error_msg,
                "timestamp": datetime.now(UTC).isoformat(),
            },
        )
