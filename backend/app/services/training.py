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
    is_error_metric,
    normalize_primary_metric,
)
from app.ml.model_registry import CLASSIFICATION_REGISTRY, REGRESSION_REGISTRY
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
    engineered_features: list[dict[str, Any]] = args.get("engineered_features", [])
    enable_pca: bool = args.get("enable_pca", False)
    pca_n_components: int | None = args.get("pca_n_components", None)
    enable_feature_selection: bool = args.get("enable_feature_selection", False)
    select_k_features: int | None = args.get("select_k_features", None)
    is_imbalanced: bool = args.get("is_imbalanced", False)
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
    fold_train_metrics: list[dict[str, float]] = []
    norm_metric = normalize_primary_metric(primary_metric)

    try:
        # 1. Evaluate Model across Cross-Validation Folds
        for _fold_idx, (train_idx, val_idx) in enumerate(cv_splits, start=1):
            X_train, y_train = X_df.iloc[train_idx], y_series.iloc[train_idx]
            X_val, y_val = X_df.iloc[val_idx], y_series.iloc[val_idx]

            # Construct clean, leakage-free pipeline for this fold (Rule 1)
            pipe = create_pipeline(
                model_id=model_id,
                task_type=task_type,
                numeric_cols=numeric_cols,
                categorical_cols=categorical_cols,
                preprocessing_plan=preprocessing_plan,
                engineered_features=engineered_features,
                enable_pca=enable_pca,
                pca_n_components=pca_n_components,
                enable_feature_selection=enable_feature_selection,
                select_k_features=select_k_features,
                is_imbalanced=is_imbalanced,
                random_state=random_state,
            )

            # Fit strictly on fold training data
            pipe.fit(X_train, y_train)

            # Evaluate on fold validation data
            y_pred_val = pipe.predict(X_val)
            # Evaluate on fold training data (Senior ML overfitting diagnostic)
            y_pred_train = pipe.predict(X_train)

            if is_classification:
                y_prob_val = None
                y_prob_train = None
                if hasattr(pipe, "predict_proba"):
                    try:
                        y_prob_val = pipe.predict_proba(X_val)
                        y_prob_train = pipe.predict_proba(X_train)
                    except Exception:
                        y_prob_val = None
                        y_prob_train = None
                f_metrics_val = compute_classification_metrics(
                    y_val.to_numpy(), y_pred_val, y_prob_val
                )
                f_metrics_train = compute_classification_metrics(
                    y_train.to_numpy(), y_pred_train, y_prob_train
                )
            else:
                f_metrics_val = compute_regression_metrics(y_val.to_numpy(), y_pred_val)
                f_metrics_train = compute_regression_metrics(y_train.to_numpy(), y_pred_train)

            fold_metrics.append(f_metrics_val)
            fold_train_metrics.append(f_metrics_train)

        # 2. Aggregate CV metrics (mean ± std)
        aggregated = aggregate_cv_metrics(fold_metrics, norm_metric)
        aggregated_train = aggregate_cv_metrics(fold_train_metrics, norm_metric)

        primary_score = aggregated.get(norm_metric, {}).get("mean")
        if primary_score is None:
            primary_score = aggregated.get(primary_metric, {}).get("mean", 0.0)

        primary_std = aggregated.get(norm_metric, {}).get("std")
        if primary_std is None:
            primary_std = aggregated.get(primary_metric, {}).get("std", 0.0)

        train_score = aggregated_train.get(norm_metric, {}).get("mean")
        if train_score is None:
            train_score = aggregated_train.get(primary_metric, {}).get("mean", 0.0)

        # Senior ML Overfitting Gap Diagnostics
        if is_error_metric(norm_metric):
            # For error metrics, overfit occurs when validation error is higher than train error
            overfit_gap = max(0.0, round(float(primary_score - train_score), 4))
            rel_gap = overfit_gap / max(abs(train_score), 1e-6)
            if rel_gap <= 0.08:
                overfit_risk = "low"
            elif rel_gap <= 0.18:
                overfit_risk = "moderate"
            else:
                overfit_risk = "high"
        else:
            # Score metrics (F1, Accuracy, R2): overfit when train exceeds val
            overfit_gap = max(0.0, round(float(train_score - primary_score), 4))
            if overfit_gap <= 0.05:
                overfit_risk = "low"
            elif overfit_gap <= 0.12:
                overfit_risk = "moderate"
            else:
                overfit_risk = "high"

        aggregated["_diagnostics"] = {
            "train_score": round(float(train_score), 4),
            "val_score": round(float(primary_score), 4),
            "overfit_gap": round(float(overfit_gap), 4),
            "overfit_risk": overfit_risk,
        }

        # 3. Full Dataset Refit (Rule 8: Persist fitted model on 100% data)
        full_pipe = create_pipeline(
            model_id=model_id,
            task_type=task_type,
            numeric_cols=numeric_cols,
            categorical_cols=categorical_cols,
            preprocessing_plan=preprocessing_plan,
            engineered_features=engineered_features,
            enable_pca=enable_pca,
            pca_n_components=pca_n_components,
            enable_feature_selection=enable_feature_selection,
            select_k_features=select_k_features,
            is_imbalanced=is_imbalanced,
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
            "train_score": round(float(train_score), 4),
            "overfit_gap": round(float(overfit_gap), 4),
            "overfit_risk": overfit_risk,
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
        full_registry = {**CLASSIFICATION_REGISTRY, **REGRESSION_REGISTRY}

        for m_id in selected_model_ids:
            is_base = "dummy" in m_id
            m_run = ModelRun(
                id=str(uuid.uuid4()),
                run_id=run.id,
                model_id=m_id,
                model_name=full_registry[m_id].name
                if m_id in full_registry
                else m_id.replace("_", " ").title(),
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

        full_registry = {**CLASSIFICATION_REGISTRY, **REGRESSION_REGISTRY}
        engineered_features = target_config.get("engineered_features", [])

        # Determine class imbalance adaptation
        is_imbalanced = False
        if is_classification:
            val_counts = y.value_counts()
            if len(val_counts) > 1:
                ratio = float(val_counts.iloc[0]) / max(1.0, float(val_counts.iloc[-1]))
                is_imbalanced = ratio >= 3.0

        # Intelligent feature selection (focus on most predictive features)
        total_feats = len(numeric_cols) + len(categorical_cols)
        enable_fs = (
            any(
                f.get("transformation_type") in ("feature_selection", "k_best")
                for f in engineered_features
            )
            or total_feats > 10
        )
        select_k = min(15, total_feats) if enable_fs else None

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
                    "model_name": full_registry[m_id].name
                    if m_id in full_registry
                    else m_id.replace("_", " ").title(),
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
                    "engineered_features": engineered_features,
                    "enable_pca": any(
                        f.get("transformation_type") in ("dimensionality_reduction", "pca")
                        for f in engineered_features
                    ),
                    "pca_n_components": None,
                    "enable_feature_selection": enable_fs,
                    "select_k_features": select_k,
                    "is_imbalanced": is_imbalanced,
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
                        "train_score": res.get("train_score"),
                        "overfit_gap": res.get("overfit_gap"),
                        "overfit_risk": res.get("overfit_risk"),
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

            # Determine best model and lift over baseline (Senior ML Standards)
            best_model_id = None
            best_score = None
            norm_metric = normalize_primary_metric(target_config.get("primary_metric", ""))
            lower_is_better = is_error_metric(norm_metric)

            if valid_scores:
                if lower_is_better:
                    best_model_id, best_score = min(valid_scores, key=lambda x: x[1])
                else:
                    best_model_id, best_score = max(valid_scores, key=lambda x: x[1])

            # Calculate baseline lift (Rule 4)
            baseline_m = next((m for m in existing_models if m.is_baseline), None)
            base_score = baseline_m.primary_metric_score if baseline_m else None
            lift_percent: float | None = None
            lift_text = "Standard baseline established"

            if best_score is not None and base_score is not None:
                if lower_is_better:
                    # Error reduction percentage
                    err_reduction = ((base_score - best_score) / max(abs(base_score), 1e-6)) * 100
                    lift_percent = round(err_reduction, 2)
                    lift_text = f"{lift_percent:+.1f}% error reduction over baseline"
                else:
                    score_lift = ((best_score - base_score) / max(abs(base_score), 1e-6)) * 100
                    lift_percent = round(score_lift, 2)
                    lift_text = f"{lift_percent:+.1f}% lift over baseline"

            best_model_run = model_by_id.get(best_model_id) if best_model_id else None
            best_diagnostics = (
                best_model_run.all_metrics.get("_diagnostics", {})
                if best_model_run and best_model_run.all_metrics
                else {}
            )
            best_overfit_risk = best_diagnostics.get("overfit_risk", "low")

            run.status = "completed"
            run.completed_models = len([r for r in results if r["status"] == "completed"])
            run.best_model_id = best_model_id
            run.best_score = best_score
            run.completed_at = datetime.now(UTC)
            run_repo.update(run)

            # Persist comprehensive training summary artifact
            try:
                summary_data = {
                    "run_id": run_id,
                    "project_id": project_id,
                    "target_column": target_config.get("target_column"),
                    "task_type": target_config.get("task_type"),
                    "primary_metric": norm_metric,
                    "lower_is_better": lower_is_better,
                    "best_model_id": best_model_id,
                    "best_score": best_score,
                    "baseline_score": base_score,
                    "lift_percent": lift_percent,
                    "lift_text": lift_text,
                    "best_overfit_risk": best_overfit_risk,
                    "total_models": run.total_models,
                    "completed_models": run.completed_models,
                    "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                }
                summary_path = os.path.join(
                    settings.AUTOMLENS_ARTIFACT_DIR,
                    "models",
                    project_id,
                    run_id,
                    "training_summary.json",
                )
                os.makedirs(os.path.dirname(summary_path), exist_ok=True)
                with open(summary_path, "w", encoding="utf-8") as sf:
                    json.dump(summary_data, sf, indent=2)
            except Exception as sum_err:
                logger.warning("Could not persist training_summary.json: %s", sum_err)

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
                    "baseline_score": base_score,
                    "lift_percent": lift_percent,
                    "lift_text": lift_text,
                    "overfit_risk": best_overfit_risk,
                    "completed_models": run.completed_models,
                    "total_models": run.total_models,
                    "completed_at": run.completed_at.isoformat(),
                },
            )

            logger.info(
                "Training run %s completed: best model '%s' (score=%.4f, lift=%s)",
                run_id,
                best_model_id,
                best_score if best_score is not None else 0.0,
                lift_text,
            )

            try:
                from app.services.audit import AuditService

                score_fmt = f"{best_score:.4f}" if best_score is not None else "N/A"
                AuditService(db).record_event(
                    project_id=project_id,
                    action="training_completed",
                    reason=(
                        f"Parallel 5-fold CV finished across {run.total_models} models. "
                        f"Top performer: {best_model_id} ({norm_metric}: {score_fmt}) with "
                        f"{lift_text} and {best_overfit_risk} overfit risk."
                    ),
                    evidence={
                        "run_id": run_id,
                        "primary_metric": norm_metric,
                        "best_model_id": best_model_id,
                        "best_score": best_score,
                        "baseline_score": base_score,
                        "lift_percent": lift_percent,
                        "overfit_risk": best_overfit_risk,
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
