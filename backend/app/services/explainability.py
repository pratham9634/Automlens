"""Explainability and Interpretability Service (Phase 7).

Computes:
1. Global Feature Importance (Native tree Gini / linear coefficients).
2. Global SHAP values (TreeExplainer / LinearExplainer with background sample downsampling).
3. Local SHAP observation attribution (Waterfall / Force breakdown).
4. Layman summaries and Rule 10 academic causation disclaimers.
"""

import io
import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline

from app.api.v1.schemas.explanations import (
    CounterfactualResponse,
    FeatureChange,
    FeatureImportanceItem,
    GlobalExplanationResponse,
    LocalExplanationResponse,
    LocalFeatureAttribution,
)
from app.core.config import get_settings
from app.core.errors import (
    AutoMLensError,
    DatasetValidationError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger
from app.core.redis import redis_manager
from app.db.models import ModelRun, TrainingRun
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.storage.base import StorageBackend

logger = get_logger("services.explainability")
settings = get_settings()

TARGET_CONFIG_SUBFOLDER = "config"
TARGET_CONFIG_FILENAME = "target_config.json"
MAX_SHAP_BACKGROUND_SAMPLES = 100
ACADEMIC_DISCLAIMER = (
    "Feature attribution explains how the model made its decision based on correlated patterns "
    "in the training data; it does not prove real-world causation."
)


def _clean_feature_name(raw_name: str, categorical_cols: list[str]) -> tuple[str, str]:
    """Strip ColumnTransformer prefixes and resolve original column name."""
    clean = raw_name
    for prefix in ("numeric__", "categorical__", "num__", "cat__", "remainder__"):
        if clean.startswith(prefix):
            clean = clean[len(prefix) :]
            break

    # Resolve original column name for one-hot encoded categories
    original = clean
    for cat_col in categorical_cols:
        if clean == cat_col or clean.startswith(f"{cat_col}_"):
            original = cat_col
            break

    return clean, original


class ExplainabilityService:
    """Service generating global and local SHAP & feature importance reports."""

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
        self.db = project_repo.db

    def _load_model_and_context(
        self, project_id: str, model_id: str
    ) -> tuple[ModelRun, TrainingRun, Pipeline, dict[str, Any], pd.DataFrame]:
        """Retrieve model run, pipeline artifact, target configuration, and dataset dataframe."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

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

        # Load raw dataset for background sampling
        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetValidationError("Dataset record not found.")

        stored_filename = os.path.basename(dataset.storage_path)
        file_bytes = self.storage.read_file(project_id, "datasets", stored_filename)
        dataset_df = pd.read_csv(io.BytesIO(file_bytes))

        return target_model_run, latest_run, pipeline, target_config, dataset_df

    def get_global_explanation(self, project_id: str, model_id: str) -> GlobalExplanationResponse:
        """Compute global feature importances and mean |SHAP| values with Redis caching."""
        cache_key = f"automlens:shap:global:{project_id}:{model_id}"
        cached_data = redis_manager.get_json(cache_key)
        if cached_data is not None:
            try:
                return GlobalExplanationResponse.model_validate(cached_data)
            except Exception as exc:
                logger.warning("Failed to validate cached SHAP explanation for %s: %s", model_id, exc)

        target_model_run, _, pipeline, target_config, dataset_df = self._load_model_and_context(
            project_id, model_id
        )

        preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
        model = pipeline.named_steps["model"]
        categorical_cols = target_config.get("categorical_columns", [])
        target_col = target_config.get("target_column")
        task_type = target_config.get("task_type", "binary_classification")

        feature_cols = [c for c in dataset_df.columns if c != target_col]
        df_features = dataset_df[feature_cols].copy()

        # 1. Feature Names
        try:
            raw_feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            raw_feature_names = [f"feature_{i}" for i in range(len(feature_cols))]

        n_features = len(raw_feature_names)

        # 2. Native Model Importance
        importance_method = "Uniform Baseline Weights"
        native_importances = np.zeros(n_features)

        if hasattr(model, "feature_importances_"):
            native_importances = np.asarray(model.feature_importances_, dtype=float)
            importance_method = "Gini Impurity (model.feature_importances_)"
        elif hasattr(model, "coef_"):
            coefs = np.abs(np.asarray(model.coef_, dtype=float))
            if coefs.ndim > 1:
                native_importances = coefs.mean(axis=0)
            else:
                native_importances = coefs
            importance_method = "Normalized Absolute Coefficients (|coef_|)"

        if native_importances.sum() > 0:
            norm_importances = native_importances / native_importances.sum()
        else:
            norm_importances = np.zeros(n_features)

        # 3. Downsampled SHAP Computation (Rule 9: Precise Labeling)
        sample_size = min(MAX_SHAP_BACKGROUND_SAMPLES, len(df_features))
        df_sample = df_features.sample(n=sample_size, random_state=42)

        try:
            X_sample = preprocessor.transform(df_sample)
            if hasattr(X_sample, "toarray"):
                X_sample = X_sample.toarray()
            X_sample = np.asarray(X_sample, dtype=np.float64)
        except Exception as e:
            logger.warning("Failed to transform background sample for SHAP: %s", e)
            X_sample = np.zeros((sample_size, n_features))

        mean_abs_shap = np.zeros(n_features)
        method_label = f"Mean |SHAP| on {sample_size} background samples"

        try:
            if isinstance(
                model,
                RandomForestClassifier
                | RandomForestRegressor
                | HistGradientBoostingClassifier
                | HistGradientBoostingRegressor,
            ):
                explainer = shap.TreeExplainer(model)
                method_label = f"Mean |SHAP| via TreeExplainer on {sample_size} samples"
                sv = explainer.shap_values(X_sample)
                if isinstance(sv, list):
                    sv_mat = sv[1] if len(sv) > 1 else sv[0]
                elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                    sv_mat = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
                else:
                    sv_mat = sv
                mean_abs_shap = np.abs(sv_mat).mean(axis=0)

            elif isinstance(model, LogisticRegression | Ridge):
                explainer = shap.LinearExplainer(model, X_sample)
                method_label = f"Mean |SHAP| via LinearExplainer on {sample_size} samples"
                sv = explainer.shap_values(X_sample)
                if isinstance(sv, list):
                    sv_mat = sv[1] if len(sv) > 1 else sv[0]
                elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                    sv_mat = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
                else:
                    sv_mat = sv
                mean_abs_shap = np.abs(sv_mat).mean(axis=0)

            else:
                method_label = f"Baseline feature weights (SHAP not applicable for {model_id})"
                mean_abs_shap = norm_importances.copy()
        except Exception as err:
            logger.warning("SHAP calculation fallback: %s", err)
            method_label = f"Model feature importance fallback (SHAP skipped: {err})"
            mean_abs_shap = norm_importances.copy()

        # Build feature items list
        feature_items: list[FeatureImportanceItem] = []
        for i, raw_name in enumerate(raw_feature_names):
            clean, orig = _clean_feature_name(raw_name, categorical_cols)
            feature_items.append(
                FeatureImportanceItem(
                    feature_name=clean,
                    original_feature=orig,
                    importance_score=float(norm_importances[i]),
                    mean_abs_shap=float(mean_abs_shap[i]),
                    rank=0,
                )
            )

        # Sort descending by mean_abs_shap (or fallback to importance_score)
        feature_items.sort(key=lambda x: (x.mean_abs_shap, x.importance_score), reverse=True)
        for idx, item in enumerate(feature_items, start=1):
            item.rank = idx

        # Generate Plain-English Layman Summary
        top_3 = feature_items[:3]
        if top_3 and any(it.mean_abs_shap > 0 or it.importance_score > 0 for it in top_3):
            top_names = [f"'{t.feature_name}'" for t in top_3]
            names_str = ", ".join(top_names[:2])
            if len(top_names) > 2:
                names_str += f", and {top_names[2]}"
            layman_summary = (
                f"The model's decisions are primarily steered by {names_str}. "
                "In plain terms, changes in these top factors create the largest swings in "
                "the model's predictions, whereas other columns play a minor supporting role."
            )
        else:
            layman_summary = (
                f"Model '{model_id}' does not differentiate between individual feature columns "
                f"(typical for baseline or unweighted models)."
            )

        try:
            from app.services.audit import AuditService

            AuditService(self.db).record_event(
                project_id=project_id,
                action="explanation_global",
                reason=(
                    f"Generated global feature importance and SHAP summary for model '{model_id}'"
                ),
                evidence={
                    "model_id": model_id,
                    "method": method_label,
                    "sample_size": sample_size,
                    "top_features": [f.feature_name for f in feature_items[:5]],
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record explanation_global audit event: %s", audit_err)

        response = GlobalExplanationResponse(
            project_id=project_id,
            model_id=model_id,
            model_name=target_model_run.model_name or model_id,
            task_type=str(task_type),
            method_label=method_label,
            feature_importance_method=importance_method,
            sample_size_used=sample_size,
            features=feature_items,
            academic_disclaimer=ACADEMIC_DISCLAIMER,
            layman_summary=layman_summary,
        )
        redis_manager.set_json(cache_key, response.model_dump())
        return response

    def get_local_explanation(
        self,
        project_id: str,
        model_id: str,
        inputs: dict[str, Any],
    ) -> LocalExplanationResponse:
        """Compute single-observation local SHAP attribution (waterfall breakdown)."""
        target_model_run, _, pipeline, target_config, dataset_df = self._load_model_and_context(
            project_id, model_id
        )

        preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
        model = pipeline.named_steps["model"]
        categorical_cols = target_config.get("categorical_columns", [])
        target_col = target_config.get("target_column")

        feature_cols = [c for c in dataset_df.columns if c != target_col]
        row_df = pd.DataFrame([{col: inputs.get(col, None) for col in feature_cols}])

        # Predict output
        prediction_val = pipeline.predict(row_df)[0]
        if hasattr(prediction_val, "item"):
            prediction_val = prediction_val.item()

        # Transform single row
        X_row = preprocessor.transform(row_df)
        if hasattr(X_row, "toarray"):
            X_row = X_row.toarray()
        X_row = np.asarray(X_row, dtype=np.float64)

        try:
            raw_feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            raw_feature_names = [f"feature_{i}" for i in range(len(feature_cols))]

        n_features = len(raw_feature_names)

        # Background sample for explainer
        sample_size = min(MAX_SHAP_BACKGROUND_SAMPLES, len(dataset_df))
        df_sample = dataset_df[feature_cols].sample(n=sample_size, random_state=42)
        X_sample = preprocessor.transform(df_sample)
        if hasattr(X_sample, "toarray"):
            X_sample = X_sample.toarray()
        X_sample = np.asarray(X_sample, dtype=np.float64)

        base_value = 0.5
        method_label = "Local SHAP attribution"
        attribution_values = np.zeros(n_features)

        try:
            if isinstance(
                model,
                RandomForestClassifier
                | RandomForestRegressor
                | HistGradientBoostingClassifier
                | HistGradientBoostingRegressor,
            ):
                explainer = shap.TreeExplainer(model)
                method_label = "Local SHAP attribution via TreeExplainer"
                ev = explainer.expected_value
                if isinstance(ev, list | np.ndarray):
                    base_value = float(ev[1] if len(ev) > 1 else ev[0])
                else:
                    base_value = float(ev)

                sv = explainer.shap_values(X_row)
                if isinstance(sv, list):
                    sv_row = sv[1] if len(sv) > 1 else sv[0]
                elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                    sv_row = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
                else:
                    sv_row = sv
                attribution_values = np.asarray(sv_row[0], dtype=float)

            elif isinstance(model, LogisticRegression | Ridge):
                explainer = shap.LinearExplainer(model, X_sample)
                method_label = "Local SHAP attribution via LinearExplainer"
                ev = explainer.expected_value
                if isinstance(ev, list | np.ndarray):
                    base_value = float(ev[1] if len(ev) > 1 else ev[0])
                else:
                    base_value = float(ev)

                sv = explainer.shap_values(X_row)
                if isinstance(sv, list):
                    sv_row = sv[1] if len(sv) > 1 else sv[0]
                elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                    sv_row = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
                else:
                    sv_row = sv
                attribution_values = np.asarray(sv_row[0], dtype=float)

            else:
                method_label = "Baseline attribution (Neutral)"
                attribution_values = np.zeros(n_features)
        except Exception as e:
            logger.warning("Local SHAP calculation fallback: %s", e)
            attribution_values = np.zeros(n_features)

        predicted_value = float(base_value + attribution_values.sum())

        # Compile attributions
        attributions: list[LocalFeatureAttribution] = []
        for i, raw_name in enumerate(raw_feature_names):
            clean, orig = _clean_feature_name(raw_name, categorical_cols)
            val = float(attribution_values[i])
            if val > 0.0001:
                direction = "positive"
            elif val < -0.0001:
                direction = "negative"
            else:
                direction = "neutral"

            attributions.append(
                LocalFeatureAttribution(
                    feature_name=clean,
                    original_feature=orig,
                    feature_value=inputs.get(orig, None),
                    attribution_value=val,
                    direction=direction,
                )
            )

        # Sort by absolute attribution impact
        attributions.sort(key=lambda x: abs(x.attribution_value), reverse=True)

        # Build layman explanation
        positives = [a for a in attributions if a.direction == "positive"]
        negatives = [a for a in attributions if a.direction == "negative"]

        pos_str = (
            f"'{positives[0].feature_name}' (+{positives[0].attribution_value:.2f})"
            if positives
            else "no major positive factors"
        )
        neg_str = (
            f"'{negatives[0].feature_name}' ({negatives[0].attribution_value:.2f})"
            if negatives
            else "no major negative factors"
        )

        layman_explanation = (
            f"For this observation, the model predicted '{prediction_val}'. "
            f"The strongest factor pushing the prediction higher was {pos_str}, "
            f"while the strongest factor pulling it down was {neg_str}."
        )

        try:
            from app.services.audit import AuditService

            AuditService(self.db).record_event(
                project_id=project_id,
                action="explanation_local",
                reason=(
                    f"Generated local waterfall SHAP explanation for prediction "
                    f"'{prediction_val}' with model '{model_id}'"
                ),
                evidence={
                    "model_id": model_id,
                    "prediction": str(prediction_val),
                    "top_attributions": [
                        {
                            "feature": a.feature_name,
                            "value": a.attribution_value,
                            "dir": a.direction,
                        }
                        for a in attributions[:3]
                    ],
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record explanation_local audit event: %s", audit_err)

        return LocalExplanationResponse(
            project_id=project_id,
            model_id=model_id,
            model_name=target_model_run.model_name or model_id,
            prediction=prediction_val,
            base_value=base_value,
            predicted_value=predicted_value,
            method_label=method_label,
            attributions=attributions,
            academic_disclaimer=ACADEMIC_DISCLAIMER,
            layman_explanation=layman_explanation,
        )

    def get_counterfactual_explanation(
        self,
        project_id: str,
        model_id: str,
        inputs: dict[str, Any],
        desired_outcome: Any | None = None,
        features_to_vary: list[str] | None = None,
    ) -> CounterfactualResponse:
        """Compute minimum recourse counterfactual perturbations to alter model prediction."""
        target_model_run, _, pipeline, target_config, dataset_df = self._load_model_and_context(
            project_id, model_id
        )

        task_type = str(target_config.get("task_type", "binary_classification"))
        target_col = target_config.get("target_column")
        base_df = pd.DataFrame([inputs])

        # Get original prediction & probability
        raw_pred = pipeline.predict(base_df)[0]
        original_pred = bool(raw_pred) if isinstance(raw_pred, np.bool_) else int(raw_pred) if isinstance(raw_pred, np.integer) else float(raw_pred) if isinstance(raw_pred, np.floating) else str(raw_pred)

        original_proba: float | None = None
        if hasattr(pipeline, "predict_proba"):
            try:
                probs = pipeline.predict_proba(base_df)[0]
                original_proba = round(float(np.max(probs)), 4)
            except Exception:
                pass

        # Candidate features permitted to vary
        valid_cols = [c for c in inputs.keys() if c in dataset_df.columns and c != target_col]
        if features_to_vary:
            valid_cols = [c for c in valid_cols if c in features_to_vary]

        if not valid_cols:
            valid_cols = [c for c in inputs.keys() if c != target_col]

        # Prioritize search using global feature importances
        try:
            global_exp = self.get_global_explanation(project_id, model_id)
            ranked_names = [f.original_feature for f in global_exp.features]
            valid_cols.sort(key=lambda col: ranked_names.index(col) if col in ranked_names else 999)
        except Exception:
            pass

        best_cost = float("inf")
        best_pred = original_pred
        best_proba: float | None = None
        best_changes: list[FeatureChange] = []
        outcome_flipped = False

        # Compute distributions for search bounds
        feature_stats: dict[str, dict[str, Any]] = {}
        for col in valid_cols:
            if col in dataset_df.columns:
                series = dataset_df[col].dropna()
                if pd.api.types.is_numeric_dtype(series):
                    std = float(series.std()) if float(series.std()) > 0 else 1.0
                    feature_stats[col] = {
                        "is_numeric": True,
                        "min": float(series.min()),
                        "max": float(series.max()),
                        "std": std,
                        "median": float(series.median()),
                    }
                else:
                    feature_stats[col] = {
                        "is_numeric": False,
                        "unique_vals": [str(v) for v in series.value_counts().head(5).index],
                    }

        # 1. Single feature perturbations
        for col in valid_cols:
            stats = feature_stats.get(col)
            if not stats:
                continue

            orig_val = inputs.get(col)
            candidates_to_try: list[tuple[Any, float]] = []

            if stats["is_numeric"]:
                try:
                    num_val = float(orig_val) if orig_val is not None else stats["median"]
                except (ValueError, TypeError):
                    num_val = stats["median"]

                std = stats["std"]
                for multiplier in [-3.0, -2.0, -1.0, -0.5, 0.5, 1.0, 2.0, 3.0]:
                    cand = num_val + multiplier * std
                    cand = max(stats["min"], min(stats["max"], cand))
                    cost = abs(cand - num_val) / (std + 1e-6)
                    candidates_to_try.append((round(cand, 2), cost))
            else:
                for cat_val in stats["unique_vals"]:
                    if str(cat_val) != str(orig_val):
                        candidates_to_try.append((cat_val, 1.0))

            for cand_val, cost in candidates_to_try:
                test_df = base_df.copy()
                test_df[col] = cand_val
                try:
                    p = pipeline.predict(test_df)[0]
                    test_pred = bool(p) if isinstance(p, np.bool_) else int(p) if isinstance(p, np.integer) else float(p) if isinstance(p, np.floating) else str(p)

                    flipped = (
                        (test_pred == desired_outcome)
                        if desired_outcome is not None
                        else (test_pred != original_pred)
                    )

                    if flipped and cost < best_cost:
                        best_cost = cost
                        best_pred = test_pred
                        outcome_flipped = True
                        if hasattr(pipeline, "predict_proba"):
                            try:
                                best_proba = round(float(np.max(pipeline.predict_proba(test_df)[0])), 4)
                            except Exception:
                                pass

                        delta_val = round(cand_val - float(orig_val), 2) if stats["is_numeric"] and orig_val is not None else None
                        pct_change = round((delta_val / (abs(float(orig_val)) + 1e-5)) * 100, 1) if delta_val is not None and orig_val is not None else None
                        desc = (
                            f"Shift '{col}' from {orig_val} to {cand_val} ({'+' if delta_val and delta_val > 0 else ''}{delta_val})"
                            if delta_val is not None
                            else f"Change '{col}' from '{orig_val}' to '{cand_val}'"
                        )
                        best_changes = [
                            FeatureChange(
                                feature=col,
                                original_value=orig_val,
                                proposed_value=cand_val,
                                delta=delta_val,
                                percentage_change=pct_change,
                                description=desc,
                            )
                        ]
                except Exception:
                    continue

            if outcome_flipped:
                break

        # 2. If single-feature was not enough, try top pair combinations
        if not outcome_flipped and len(valid_cols) >= 2:
            top_pairs = [(valid_cols[i], valid_cols[j]) for i in range(min(3, len(valid_cols))) for j in range(i + 1, min(4, len(valid_cols)))]
            for col1, col2 in top_pairs:
                stats1, stats2 = feature_stats.get(col1), feature_stats.get(col2)
                if not stats1 or not stats2:
                    continue

                val1, val2 = inputs.get(col1), inputs.get(col2)
                shifts1 = [-2.0 * stats1["std"], 2.0 * stats1["std"]] if stats1["is_numeric"] else stats1["unique_vals"][:2]
                shifts2 = [-2.0 * stats2["std"], 2.0 * stats2["std"]] if stats2["is_numeric"] else stats2["unique_vals"][:2]

                for s1 in shifts1:
                    for s2 in shifts2:
                        test_df = base_df.copy()
                        c1_val = round(float(val1) + s1, 2) if stats1["is_numeric"] and val1 is not None else s1
                        c2_val = round(float(val2) + s2, 2) if stats2["is_numeric"] and val2 is not None else s2
                        test_df[col1] = c1_val
                        test_df[col2] = c2_val
                        try:
                            p = pipeline.predict(test_df)[0]
                            test_pred = bool(p) if isinstance(p, np.bool_) else int(p) if isinstance(p, np.integer) else float(p) if isinstance(p, np.floating) else str(p)

                            flipped = (
                                (test_pred == desired_outcome)
                                if desired_outcome is not None
                                else (test_pred != original_pred)
                            )
                            if flipped:
                                best_pred = test_pred
                                outcome_flipped = True
                                if hasattr(pipeline, "predict_proba"):
                                    try:
                                        best_proba = round(float(np.max(pipeline.predict_proba(test_df)[0])), 4)
                                    except Exception:
                                        pass
                                best_changes = [
                                    FeatureChange(
                                        feature=col1,
                                        original_value=val1,
                                        proposed_value=c1_val,
                                        description=f"Adjust '{col1}' from {val1} to {c1_val}",
                                    ),
                                    FeatureChange(
                                        feature=col2,
                                        original_value=val2,
                                        proposed_value=c2_val,
                                        description=f"Adjust '{col2}' from {val2} to {c2_val}",
                                    ),
                                ]
                                break
                        except Exception:
                            continue
                    if outcome_flipped:
                        break
                if outcome_flipped:
                    break

        # Build human-readable recourse summary
        if outcome_flipped and best_changes:
            changes_str = " and ".join([c.description for c in best_changes])
            prob_str = f" with {best_proba * 100:.1f}% confidence" if best_proba is not None else ""
            summary = (
                f"To switch the model outcome from '{original_pred}' to '{best_pred}'{prob_str}, "
                f"the following minimum recourse changes are required: {changes_str}."
            )
        else:
            summary = (
                f"The model decision for this observation is robustly anchored to '{original_pred}'. "
                "No localized perturbation within plausible statistical bounds was sufficient to invert the decision boundary."
            )

        try:
            from app.services.audit import AuditService

            AuditService(self.db).record_event(
                project_id=project_id,
                action="counterfactual_generated",
                reason=(
                    f"Computed counterfactual recourse for model '{model_id}' "
                    f"(Outcome flipped: {outcome_flipped})"
                ),
                evidence={
                    "model_id": model_id,
                    "original_prediction": str(original_pred),
                    "counterfactual_prediction": str(best_pred),
                    "flipped": outcome_flipped,
                    "changes_count": len(best_changes),
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record counterfactual audit event: %s", audit_err)

        return CounterfactualResponse(
            project_id=project_id,
            model_id=model_id,
            model_name=target_model_run.model_name or model_id,
            task_type=task_type,
            original_prediction=original_pred,
            original_probability=original_proba,
            counterfactual_prediction=best_pred,
            counterfactual_probability=best_proba,
            outcome_flipped=outcome_flipped,
            required_changes=best_changes,
            recourse_summary=summary,
        )
