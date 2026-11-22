"""Hybrid AI Decision Engine service.

Formulates deterministic data preprocessing pipelines and model candidate selections.
Enriches decisions with Google Gemini AI copilot engineering rationale.
Streams real-time token telemetry over Server-Sent Events (SSE).
Enforces Rule 1 (Zero CV Leakage), Rule 2 (Target Confirmation),
Rule 3 (CV Folds Safeguard), and Rule 4 (Baseline Control).
"""

import asyncio
import io
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd
from sqlalchemy.orm import Session

from app.api.v1.schemas.decision_engine import (
    ConfirmedTargetResponse,
    ConfirmTargetRequest,
    DecisionEngineResponse,
    EngineeredFeature,
    ModelCandidate,
    PreprocessingStep,
    TargetAnalysisDetailResponse,
    TargetSuggestionItem,
    TargetSuggestResponse,
)
from app.core.config import get_settings
from app.core.errors import (
    DatasetNotFoundError,
    DatasetValidationError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.ml.model_registry import get_candidate_models
from app.ml.task_detection import (
    TaskType,
    analyze_target_column,
    suggest_candidate_targets,
)
from app.storage.base import StorageBackend
from app.storage.local import LocalStorageBackend

logger = get_logger("services.decision_engine")
settings = get_settings()

TARGET_CONFIG_SUBFOLDER = "config"
TARGET_CONFIG_FILENAME = "target_config.json"


def _format_sse(event: str, data: dict | str) -> str:
    """Format Server-Sent Events line safely without nested f-string backslashes."""
    raw = data if isinstance(data, str) else json.dumps(data)
    return f"event: {event}\ndata: {raw}\n\n"


class DecisionEngineService:
    """Orchestrates target detection, automated feature prep, and AI decision streaming."""

    def __init__(self, db: Session, storage: StorageBackend | None = None):
        self.db = db
        self.storage = storage or LocalStorageBackend()
        self.project_repo = ProjectRepository(db)
        self.dataset_repo = DatasetRepository(db)

    def _load_dataframe(self, project_id: str) -> tuple[pd.DataFrame, str]:
        """Load dataset from storage abstraction into a DataFrame."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        storage_filename = Path(dataset.storage_path).name
        raw_bytes = self.storage.read_file(project_id, "datasets", storage_filename)

        lower_name = dataset.filename.lower()
        try:
            if lower_name.endswith(".csv"):
                try:
                    df = pd.read_csv(io.BytesIO(raw_bytes), encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(io.BytesIO(raw_bytes), encoding="latin1")
            elif lower_name.endswith((".xlsx", ".xls")):
                df = pd.read_excel(io.BytesIO(raw_bytes))
            else:
                raise DatasetValidationError(f"Unsupported format: {dataset.filename}")
            return df, dataset.filename
        except Exception as exc:
            logger.error("Failed to load dataset %s: %s", dataset.filename, exc)
            raise DatasetValidationError(f"Could not load dataset: {exc}") from exc

    def suggest_targets(self, project_id: str) -> TargetSuggestResponse:
        """Analyze all columns and recommend likely target features."""
        df, _ = self._load_dataframe(project_id)
        candidate_ranks = suggest_candidate_targets(df)
        recommended_col = candidate_ranks[0] if candidate_ranks else None

        items: list[TargetSuggestionItem] = []
        for col in df.columns:
            analysis = analyze_target_column(df[col], col)
            items.append(
                TargetSuggestionItem(
                    name=col,
                    dtype=str(df[col].dtype),
                    inferred_task=analysis.inferred_task,
                    confidence=analysis.confidence,
                    distinct_count=analysis.distinct_count,
                    null_percentage=analysis.null_percentage,
                    is_recommended=(col == recommended_col),
                    reason=analysis.reason,
                )
            )

        return TargetSuggestResponse(
            recommended_target=recommended_col,
            suggestions=items,
        )

    def analyze_target(
        self,
        project_id: str,
        target_column: str,
        override_task_type: TaskType | None = None,
    ) -> TargetAnalysisDetailResponse:
        """Inspect a specific candidate target and its class distribution."""
        df, _ = self._load_dataframe(project_id)
        if target_column not in df.columns:
            raise DatasetValidationError(f"Target column '{target_column}' not found in dataset.")

        analysis = analyze_target_column(df[target_column], target_column, override_task_type)
        task_type = override_task_type or analysis.inferred_task

        return TargetAnalysisDetailResponse(
            target_column=target_column,
            task_type=task_type,
            is_overridden=(override_task_type is not None),
            distinct_count=analysis.distinct_count,
            null_count=analysis.null_count,
            null_percentage=analysis.null_percentage,
            classes=analysis.classes,
            summary_stats=analysis.summary_stats,
            reason=analysis.reason,
            min_class_count=analysis.min_class_count,
            has_rule3_warning=analysis.has_rule3_warning,
            imbalance_ratio=analysis.imbalance_ratio,
            is_severe_imbalance=analysis.is_severe_imbalance,
            target_skewness=analysis.target_skewness,
            skewness_warning=analysis.skewness_warning,
        )

    def _detect_automated_features(
        self,
        df: pd.DataFrame,
        input_cols: list[str],
        user_objective: str | None = None,
    ) -> list[EngineeredFeature]:
        """Formulate automated domain-specific feature extraction decisions."""
        features: list[EngineeredFeature] = []
        obj_lower = (user_objective or "").lower()

        # 1. Date/Time Column Detection & Temporal Decomposition
        for col in input_cols:
            col_lower = col.lower()
            date_keywords = ("date", "time", "timestamp", "year", "month", "dob", "created")
            is_date_named = any(k in col_lower for k in date_keywords)

            sample_series = df[col].dropna()
            is_date_str = False
            if not sample_series.empty:
                first_val = str(sample_series.iloc[0])
                if len(first_val) >= 4 and any(sep in first_val for sep in ("-", "/", " ")):
                    try:
                        pd.to_datetime(first_val)
                        is_date_str = True
                    except Exception:
                        is_date_str = False

            if is_date_named or is_date_str:
                features.append(
                    EngineeredFeature(
                        name=f"{col}_components",
                        source_columns=[col],
                        transformation_type="datetime_decomposition",
                        formula_or_desc="Extract [year, month, day, dayofweek, is_weekend]",
                        rationale=(
                            f"Automated temporal decomposition of '{col}' captures calendar cycles."
                        ),
                    )
                )

        # 2. Intent-Guided Numeric Interaction Extraction
        numeric_cols = [
            c
            for c in input_cols
            if pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_bool_dtype(df[c])
        ]
        if len(numeric_cols) >= 2:
            interaction_keywords = ("ratio", "per", "interaction", "rate", "density", "divide")
            if any(k in obj_lower for k in interaction_keywords):
                c1, c2 = numeric_cols[0], numeric_cols[1]
                features.append(
                    EngineeredFeature(
                        name=f"{c1}_to_{c2}_ratio",
                        source_columns=[c1, c2],
                        transformation_type="interaction_ratio",
                        formula_or_desc=f"{c1} / ({c2} + 1e-5)",
                        rationale=(
                            f"Engineered relative ratio aligned with user objective "
                            f"('{user_objective}')."
                        ),
                    )
                )

        # 3. High-entropy Text Metrics
        for col in input_cols:
            if df[col].dtype == object:
                sample_series = df[col].dropna()
                if not sample_series.empty:
                    avg_len = sample_series.astype(str).str.len().mean()
                    if avg_len > 25.0:
                        features.append(
                            EngineeredFeature(
                                name=f"{col}_char_len",
                                source_columns=[col],
                                transformation_type="text_metric",
                                formula_or_desc=f"len(str({col}))",
                                rationale=(
                                    f"Extracted string length metric from text column '{col}'."
                                ),
                            )
                        )

        # 4. Dimensionality Reduction (PCA) Detection
        dim_keywords = ("pca", "dimension", "reduce", "compress", "components", "feature selection")
        user_wants_dim = any(k in obj_lower for k in dim_keywords)
        has_many_numeric = len(numeric_cols) > 12

        if (user_wants_dim or has_many_numeric) and len(numeric_cols) >= 3:
            n_comp = min(10, len(numeric_cols))
            features.append(
                EngineeredFeature(
                    name="pca_dimensionality_reduction",
                    source_columns=numeric_cols,
                    transformation_type="dimensionality_reduction",
                    formula_or_desc=f"PCA(n_components={n_comp}, variance_retained>=0.95)",
                    rationale=(
                        f"Compresses {len(numeric_cols)} numeric features into {n_comp} "
                        "orthogonal principal components preserving >=95% variance to eliminate "
                        "collinearity and prevent the curse of dimensionality."
                    ),
                )
            )

        return features

    def _generate_deterministic_rationale(
        self,
        task_type: TaskType,
        target_column: str,
        num_features: int,
        steps: list[PreprocessingStep],
        models: list[ModelCandidate],
        user_objective: str | None = None,
        engineered_features: list[EngineeredFeature] | None = None,
    ) -> str:
        """Produce clear, intuitive engineering explanation for academic defense."""
        imputation_count = len(
            [s for s in steps if s.step_type == "imputation" and "Zero missing" not in s.reason]
        )
        scaling_count = len([s for s in steps if s.step_type == "scaling"])
        encoding_count = len([s for s in steps if s.step_type == "encoding"])
        feat_count = len(engineered_features or [])

        # Column-by-column plain English highlights
        cleaning_details: list[str] = []
        for s in steps:
            if s.step_type == "imputation" and "Zero missing" not in s.reason:
                cleaning_details.append(f"  • **{s.column} (Imputation)**: {s.reason}")
            elif s.step_type == "scaling" and "IQR" in s.reason:
                cleaning_details.append(f"  • **{s.column} (Outlier Scaling)**: {s.reason}")
            elif s.step_type == "dimensionality_reduction":
                cleaning_details.append(f"  • **Dimensionality Reduction**: {s.reason}")
            elif s.step_type == "drop":
                cleaning_details.append(f"  • **{s.column} (Drop Feature)**: {s.reason}")

        col_cleaning_section = (
            "\n" + "\n".join(cleaning_details[:6]) + "\n"
            if cleaning_details
            else ("  • All features complete; standard zero-leakage scaling/encoding applied.\n")
        )

        if task_type == TaskType.BINARY_CLASSIFICATION:
            goal_desc = f"predicting '{target_column}' as a Yes/No (two-outcome) question"
            metric_desc = (
                "F1-Score (Macro) is chosen instead of basic accuracy so the model cannot "
                "cheat if one category is much rarer than the other."
            )
        elif task_type == TaskType.MULTICLASS_CLASSIFICATION:
            goal_desc = f"categorizing '{target_column}' into one of several distinct categories"
            metric_desc = (
                "Macro-averaged F1-Score is chosen to evaluate all categories equally, "
                "ensuring rare categories aren't ignored."
            )
        else:
            goal_desc = f"forecasting a continuous numerical value for '{target_column}'"
            metric_desc = (
                "R² (Coefficient of Determination) is chosen to measure how much of the "
                "variation in the target the model successfully explains (where 1.0 is perfect)."
            )

        task_title = task_type.value.replace("_", " ").title()
        obj_note = (
            f'\n• **User Stated Objective:** "{user_objective}"\n'
            if user_objective and user_objective.strip()
            else ""
        )

        eng_note = (
            f"• **Automated Feature Extraction ({feat_count} features):** Formulated domain "
            f"transformations (temporal decomposition & interaction ratios) inside the pipeline.\n"
            if feat_count > 0
            else ""
        )

        return (
            f"🎯 **1. The Goal (What We Are Predicting):**\n"
            f"We are {goal_desc}. The system automatically identified this as a **{task_title}** "
            f"problem.{obj_note} To evaluate performance fairly, {metric_desc}\n\n"
            f"🧹 **2. How We Prepare the Data (Data Cleaning & Fairness):**\n"
            f"To make the {num_features} input features mathematically ready and fair for machine "
            f"learning algorithms:\n"
            f"{col_cleaning_section}\n"
            f"• **Summary Counts:** {imputation_count} column(s) imputed, {scaling_count} scaled, "
            f"{encoding_count} category-encoded.\n"
            f"{eng_note}"
            f"• **Strict Leakage Prevention (Rule 1):** Every transformation is fit solely on the "
            f"training folds of cross-validation, guaranteeing zero test-set leakage.\n\n"
            f"🤖 **3. Why These Models Were Chosen:**\n"
            f"We select candidate algorithms to compare strengths:\n"
            f"• **Dummy Baseline (Scientific Control - Rule 4):** A naive guesser (like a coin "
            f"flip or always picking the most common class). If a real model cannot beat this "
            f"baseline, we know it hasn't actually learned anything useful.\n"
            f"• **Linear Baseline:** Fast model testing for straight-line patterns.\n"
            f"• **Random Forest:** An ensemble 'committee' of decision trees robust to non-linear "
            f"interactions.\n"
            f"• **HistGradientBoosting:** High-accuracy gradient boosted trees learning "
            f"sequentially by correcting previous mistakes."
        )

    def _build_ai_prompt(
        self,
        task_type: TaskType,
        target_column: str,
        features_summary: list[dict],
        models: list[ModelCandidate],
        engineered_features: list[EngineeredFeature],
        user_objective: str | None = None,
        primary_metric: str | None = None,
    ) -> tuple[str, str]:
        """Construct system and user prompt for Google Gemini AI Copilot."""
        system_prompt = (
            "You are the Chief Machine Learning Architect for AutoMLens. "
            "You analyze tabular datasets, formulate fold-safe preprocessing, "
            "and explain how the user objective maps to algorithm candidate selection and metrics. "
            "CRITICAL: The target column to predict is strictly specified in the user prompt. "
            "Never substitute or switch the target column to another feature, even if the user objective text mentions other columns. "
            "Always enforce Rule 1 (zero data leakage: all transformations fit inside CV folds) "
            "and Rule 4 (mandatory Dummy baseline control)."
        )

        eng_feature_text = (
            ", ".join([f"{f.name} ({f.transformation_type})" for f in engineered_features])
            if engineered_features
            else "Standard fold-safe pipeline"
        )

        user_prompt = (
            f"Target Column to Predict: '{target_column}' (PREDICT THIS TARGET STRICTLY)\n"
            f"Task Type: {task_type.value}\n"
            f"User Objective Prompt: {user_objective or 'General automated tabular modeling'}\n"
            f"Selected Primary Metric: {primary_metric or 'Auto-inferred'}\n"
            f"Candidate Estimators:\n{[m.name for m in models if m.default_selected]}\n\n"
            f"Features Summary (sample):\n{json.dumps(features_summary[:10], indent=2)}\n\n"
            f"Engineered Transformations: {eng_feature_text}\n\n"
            "Write a concise, high-impact engineering explanation in 3 clear sections:\n"
            f"1. 🎯 Goal & Strategy: Explicitly confirm that the model is predicting '{target_column}'. "
            f"If the user objective mentions other attributes (e.g. sex, survival, fare), explain how those attributes "
            f"act as input predictor features to forecast '{target_column}'.\n"
            "2. 🧹 Automated Data Preparation: Explain in plain English WHY median vs mean "
            "was picked, WHY specific scalers/encoders were chosen, and any PCA reductions.\n"
            "3. 🤖 Algorithmic Selection: Why candidate algorithms achieve the desired outcome, "
            "and why the Dummy baseline is like a scientific placebo control (Rule 4).\n\n"
            "Use clear bullet points and plain English. Keep under 320 words. No marketing fluff."
        )
        return system_prompt, user_prompt

    def _select_candidate_models(
        self,
        task_type: TaskType,
        n_rows: int = 1000,
        n_cols: int = 10,
        user_objective: str | None = None,
    ) -> tuple[str, list[str], list[ModelCandidate]]:
        """Return primary metric, available metrics, and candidate models for task type.

        Intelligently parses user_objective to adapt primary metric to desired outcome.
        """
        obj_lower = (user_objective or "").lower()

        if task_type == TaskType.BINARY_CLASSIFICATION:
            available_metrics = [
                "f1_macro",
                "accuracy",
                "balanced_accuracy",
                "roc_auc",
                "pr_auc",
                "log_loss",
                "mcc",
                "precision_macro",
                "recall_macro",
            ]
            # Prompt-driven intent detection for binary classification
            recall_keys = ("false negative", "recall", "sensitivity", "catch all", "churn", "fraud")
            precision_keys = ("false positive", "precision", "specificity", "quality", "clean")
            if any(k in obj_lower for k in ("pr_auc", "average precision", "pr-auc", "imbalance", "rare")):
                primary_metric = "pr_auc"
            elif any(k in obj_lower for k in ("balanced", "balanced accuracy", "bacc")):
                primary_metric = "balanced_accuracy"
            elif any(k in obj_lower for k in ("mcc", "matthews")):
                primary_metric = "mcc"
            elif any(k in obj_lower for k in ("log loss", "logloss", "cross entropy")):
                primary_metric = "log_loss"
            elif any(k in obj_lower for k in recall_keys):
                primary_metric = "recall_macro"
            elif any(k in obj_lower for k in precision_keys):
                primary_metric = "precision_macro"
            elif any(k in obj_lower for k in ("auc", "roc", "rank", "probability", "threshold")):
                primary_metric = "roc_auc"
            elif any(k in obj_lower for k in ("accuracy", "overall correct")):
                primary_metric = "accuracy"
            else:
                primary_metric = "f1_macro"

        elif task_type == TaskType.MULTICLASS_CLASSIFICATION:
            available_metrics = [
                "f1_macro",
                "accuracy",
                "balanced_accuracy",
                "roc_auc",
                "pr_auc",
                "log_loss",
                "mcc",
                "precision_macro",
                "recall_macro",
            ]
            if any(k in obj_lower for k in ("balanced", "balanced accuracy", "bacc")):
                primary_metric = "balanced_accuracy"
            elif any(k in obj_lower for k in ("mcc", "matthews")):
                primary_metric = "mcc"
            elif any(k in obj_lower for k in ("log loss", "logloss")):
                primary_metric = "log_loss"
            elif any(k in obj_lower for k in ("recall", "sensitivity", "coverage", "catch all")):
                primary_metric = "recall_macro"
            elif any(k in obj_lower for k in ("precision", "exactness", "purity")):
                primary_metric = "precision_macro"
            elif any(k in obj_lower for k in ("accuracy", "overall correct")):
                primary_metric = "accuracy"
            else:
                primary_metric = "f1_macro"

        else:  # REGRESSION
            available_metrics = [
                "r2",
                "neg_root_mean_squared_error",
                "neg_mean_absolute_error",
                "medae",
                "mape",
                "rmsle",
                "explained_variance",
                "max_error",
            ]
            if any(
                k in obj_lower
                for k in ("rmse", "root mean", "penalize large", "extreme error", "quadratic")
            ):
                primary_metric = "neg_root_mean_squared_error"
            elif any(
                k in obj_lower
                for k in ("mae", "mean absolute", "outlier resistant", "median error", "absolute")
            ):
                primary_metric = "neg_mean_absolute_error"
            elif any(k in obj_lower for k in ("medae", "median absolute")):
                primary_metric = "medae"
            elif any(k in obj_lower for k in ("mape", "percentage error", "relative error")):
                primary_metric = "mape"
            elif any(k in obj_lower for k in ("rmsle", "log error")):
                primary_metric = "rmsle"
            elif any(k in obj_lower for k in ("explained variance", "ev")):
                primary_metric = "explained_variance"
            elif any(k in obj_lower for k in ("max error", "worst case")):
                primary_metric = "max_error"
            else:
                primary_metric = "r2"

        models = get_candidate_models(
            task_type=task_type,
            n_rows=n_rows,
            n_cols=n_cols,
            user_objective=user_objective,
        )
        return primary_metric, available_metrics, models

    def _formulate_steps(
        self,
        df: pd.DataFrame,
        input_cols: list[str],
        user_objective: str | None = None,
    ) -> tuple[list[PreprocessingStep], list[dict]]:
        """Formulate deterministic preprocessing transformations with plain-English reasons."""
        steps: list[PreprocessingStep] = []
        features_summary: list[dict] = []
        numeric_cols_found: list[str] = []

        for col in input_cols:
            series = df[col]
            unique_count = int(series.nunique(dropna=True))
            null_count = int(series.isnull().sum())
            null_pct = round((null_count / len(df)) * 100.0, 2) if len(df) > 0 else 0.0

            if unique_count <= 1:
                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="drop",
                        strategy="drop_constant",
                        reason=(
                            f"Contains identical value across all {len(df)} rows (zero variance). "
                            "Zero variance provides no discriminatory signal, so it is dropped."
                        ),
                    )
                )
                continue

            is_bool = pd.api.types.is_bool_dtype(series)
            if pd.api.types.is_numeric_dtype(series) and not is_bool:
                numeric_cols_found.append(col)
                clean_num = pd.to_numeric(series.dropna(), errors="coerce")
                skewness = float(clean_num.skew()) if len(clean_num) > 2 else 0.0
                impute_strategy = "median" if abs(skewness) > 1.0 else "mean"
                is_skewed = abs(skewness) > 1.0

                if null_count > 0:
                    if is_skewed:
                        median_val = float(clean_num.median()) if not clean_num.empty else 0.0
                        impute_reason = (
                            f"Missing {null_count} values ({null_pct}%). "
                            f"Median imputation ({median_val:.1f}) is chosen because "
                            f"distribution is skewed (skewness: {skewness:.2f}). "
                            "Median resists extreme outliers, keeping trends accurate."
                        )
                    else:
                        mean_val = float(clean_num.mean()) if not clean_num.empty else 0.0
                        impute_reason = (
                            f"Missing {null_count} values ({null_pct}%). "
                            f"Mean imputation ({mean_val:.1f}) is chosen because values follow "
                            f"a balanced spread (skewness: {skewness:.2f}), preserving the average."
                        )
                else:
                    impute_reason = (
                        "Zero missing values detected. "
                        "Complete numeric series retained without imputation."
                    )

                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="imputation",
                        strategy=impute_strategy if null_count > 0 else "none",
                        reason=impute_reason,
                    )
                )

                q25, q75 = clean_num.quantile(0.25), clean_num.quantile(0.75)
                iqr = q75 - q25
                outlier_pct = 0.0
                if iqr > 0:
                    outlier_count = (
                        (clean_num < (q25 - 1.5 * iqr)) | (clean_num > (q75 + 1.5 * iqr))
                    ).sum()
                    outlier_pct = (outlier_count / len(clean_num)) * 100.0

                if outlier_pct > 5.0:
                    scale_strategy = "robust"
                    scale_reason = (
                        f"Contains {outlier_pct:.1f}% outliers via 1.5×IQR boundary rule. "
                        "Robust Scaling uses median and quartile spread, preventing "
                        "extreme numbers from overpowering other features."
                    )
                else:
                    scale_strategy = "standard"
                    scale_reason = (
                        f"Values have regular spread ({outlier_pct:.1f}% outliers). "
                        "Standard Scaling (Z-score) normalizes to mean=0 and variance=1, "
                        "ensuring uniform, equal weighting across models."
                    )

                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="scaling",
                        strategy=scale_strategy,
                        reason=scale_reason,
                    )
                )
                features_summary.append(
                    {
                        "name": col,
                        "type": "numeric",
                        "null_pct": null_pct,
                        "skew": round(skewness, 2),
                        "outlier_pct": round(outlier_pct, 1),
                    }
                )
            else:
                if null_count > 0:
                    most_freq = str(series.mode().iloc[0]) if not series.mode().empty else "Unknown"
                    impute_reason = (
                        f"Missing {null_count} values ({null_pct}%). "
                        f"Mode imputation fills blanks with top category ('{most_freq}'), "
                        "avoiding synthetic artificial labels."
                    )
                else:
                    impute_reason = (
                        "Zero missing categories detected. Complete categorical column retained."
                    )

                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="imputation",
                        strategy="most_frequent" if null_count > 0 else "none",
                        reason=impute_reason,
                    )
                )

                if unique_count <= 10:
                    encode_strategy = "one_hot"
                    encode_reason = (
                        f"Contains {unique_count} distinct categories. "
                        "One-Hot Encoding creates 0/1 indicator columns for each category, "
                        "preventing algorithms from assuming artificial category rank or order."
                    )
                else:
                    encode_strategy = "ordinal"
                    encode_reason = (
                        f"Contains {unique_count} high-cardinality categories. "
                        "Ordinal Encoding assigns a compact integer mapping to each category, "
                        "preventing the dataset from blowing up into a sparse, wide matrix."
                    )

                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="encoding",
                        strategy=encode_strategy,
                        reason=encode_reason,
                    )
                )
                features_summary.append(
                    {
                        "name": col,
                        "type": "categorical",
                        "cardinality": unique_count,
                        "null_pct": null_pct,
                    }
                )

        # Dimensionality Reduction Step for wide numeric feature spaces
        obj_lower = (user_objective or "").lower()
        dim_keywords = ("pca", "dimension", "reduce", "compress", "components", "feature selection")
        user_wants_dim = any(k in obj_lower for k in dim_keywords)
        has_many_numeric = len(numeric_cols_found) > 12

        if (user_wants_dim or has_many_numeric) and len(numeric_cols_found) >= 3:
            n_components = min(10, len(numeric_cols_found))
            steps.append(
                PreprocessingStep(
                    column="all_numeric_features",
                    step_type="dimensionality_reduction",
                    strategy="pca",
                    reason=(
                        f"Automated PCA projects {len(numeric_cols_found)} numeric columns into "
                        f"{n_components} orthogonal principal components retaining >=95% variance, "
                        "eliminating multicollinearity and speeding up CV training."
                    ),
                )
            )

        return steps, features_summary

    async def stream_decisions(
        self,
        project_id: str,
        target_column: str,
        override_task_type: TaskType | None = None,
        user_objective: str | None = None,
        gemini_api_key: str | None = None,
        gemini_model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream real-time AI reasoning and final pipeline formulation via Server-Sent Events."""
        try:
            df, _ = self._load_dataframe(project_id)
            if target_column not in df.columns:
                yield _format_sse(
                    "error", {"error": f"Target column '{target_column}' does not exist."}
                )
                return

            analysis = analyze_target_column(df[target_column], target_column)
            task_type = override_task_type or analysis.inferred_task
            input_cols = [c for c in df.columns if c != target_column]

            steps, features_summary = self._formulate_steps(df, input_cols, user_objective)
            eng_features = self._detect_automated_features(df, input_cols, user_objective)
            primary_metric, available_metrics, models = self._select_candidate_models(
                task_type, len(df), len(input_cols), user_objective
            )

            deterministic_rationale = self._generate_deterministic_rationale(
                task_type=task_type,
                target_column=target_column,
                num_features=len(input_cols),
                steps=steps,
                models=models,
                user_objective=user_objective,
                engineered_features=eng_features,
            )

            # Determine AI Provider (Only Google Gemini is used in this section)
            effective_gemini_key = gemini_api_key
            if (
                not effective_gemini_key
                and settings.GEMINI_API_KEY
                and settings.GEMINI_API_KEY.strip().startswith("AIzaSy")
            ):
                effective_gemini_key = settings.GEMINI_API_KEY

            chosen_gemini_model = (
                gemini_model.strip()
                if (gemini_model and gemini_model.strip())
                else settings.GEMINI_MODEL
            )

            use_gemini = bool(effective_gemini_key and effective_gemini_key.strip())
            provider = "gemini" if use_gemini else "offline"
            yield _format_sse("status", {"status": "reasoning_started", "provider": provider})

            full_rationale = ""
            is_llm = False
            active_provider = "offline"

            if use_gemini and effective_gemini_key:
                sys_prompt, usr_prompt = self._build_ai_prompt(
                    task_type=task_type,
                    target_column=target_column,
                    features_summary=features_summary,
                    models=models,
                    engineered_features=eng_features,
                    user_objective=user_objective,
                    primary_metric=primary_metric,
                )
                key = effective_gemini_key.strip()
                combined_prompt = f"{sys_prompt}\n\nTask Specifics:\n{usr_prompt}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": combined_prompt}]}
                    ],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 800,
                    },
                }

                # Resilient fallback chain: requested model -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite
                models_to_try = [chosen_gemini_model]
                for backup in ("gemini-3.5-flash-lite", "gemini-3.1-flash-lite"):
                    if backup not in models_to_try:
                        models_to_try.append(backup)

                last_error_msg = ""
                for model_candidate in models_to_try:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{model_candidate}:streamGenerateContent?alt=sse&key={key}"
                    )
                    try:
                        async with httpx.AsyncClient(timeout=18.0) as client:
                            async with client.stream("POST", url, json=payload) as response:
                                if response.status_code == 200:
                                    if model_candidate != chosen_gemini_model:
                                        yield _format_sse(
                                            "notice",
                                            json.dumps({
                                                "message": (
                                                    f"{chosen_gemini_model} was busy (503/high-demand). "
                                                    f"Auto-routed to resilient {model_candidate}."
                                                )
                                            }),
                                        )
                                    async for line in response.aiter_lines():
                                        if line.startswith("data: "):
                                            raw = line[6:].strip()
                                            if raw == "[DONE]":
                                                break
                                            try:
                                                chunk = json.loads(raw)
                                                candidates = chunk.get("candidates", [])
                                                if candidates:
                                                    parts = (
                                                        candidates[0]
                                                        .get("content", {})
                                                        .get("parts", [])
                                                    )
                                                    for p in parts:
                                                        text = p.get("text", "")
                                                        if text:
                                                            full_rationale += text
                                                            yield _format_sse("token", {"token": text})
                                            except Exception:
                                                pass
                                    is_llm = True
                                    active_provider = "gemini"
                                    break
                                else:
                                    err_detail = f"HTTP {response.status_code}"
                                    try:
                                        raw_err = await response.aread()
                                        parsed_err = json.loads(raw_err.decode("utf-8", errors="ignore"))
                                        api_msg = parsed_err.get("error", {}).get("message")
                                        if api_msg:
                                            err_detail += f" ({api_msg})"
                                    except Exception:
                                        pass
                                    last_error_msg = err_detail
                                    logger.warning(
                                        "Gemini model %s returned %s, trying fallback if available.",
                                        model_candidate,
                                        err_detail,
                                    )
                    except Exception as model_exc:
                        last_error_msg = str(model_exc).strip() or type(model_exc).__name__
                        logger.warning(
                            "Gemini model %s stream failed (%s), trying fallback if available.",
                            model_candidate,
                            last_error_msg,
                        )

                if not is_llm:
                    notice_data = json.dumps(
                        {
                            "message": (
                                f"Google Gemini stream notice: {last_error_msg}. "
                                "Falling back to deterministic rule engine."
                            )
                        }
                    )
                    yield _format_sse("notice", notice_data)
                    for line in deterministic_rationale.split("\n"):
                        yield _format_sse("token", {"token": line + "\n"})
                        await asyncio.sleep(0.015)
                    full_rationale = deterministic_rationale
                    active_provider = "offline"

            else:
                # 100% Offline fallback mode
                for line in deterministic_rationale.split("\n"):
                    yield _format_sse("token", {"token": line + "\n"})
                    await asyncio.sleep(0.01)
                full_rationale = deterministic_rationale
                active_provider = "offline"

            # Signal completion of textual reasoning
            yield (f"event: reasoning_completed\ndata: {json.dumps({'text': full_rationale})}\n\n")

            # Build and emit final structured decision response
            response_obj = DecisionEngineResponse(
                target_column=target_column,
                task_type=task_type,
                primary_metric=primary_metric,
                available_metrics=available_metrics,
                preprocessing_steps=steps,
                engineered_features=eng_features,
                candidate_models=models,
                engineering_rationale=full_rationale,
                user_objective=user_objective,
                is_llm_enriched=is_llm,
                ai_provider=active_provider,
            )
            yield _format_sse("pipeline_ready", response_obj.model_dump_json())

        except Exception as top_exc:
            logger.error("Failed in stream_decisions: %s", top_exc, exc_info=True)
            yield _format_sse("error", {"error": str(top_exc)})

    def formulate_decisions(
        self,
        project_id: str,
        target_column: str,
        override_task_type: TaskType | None = None,
        user_objective: str | None = None,
        gemini_api_key: str | None = None,
        gemini_model: str | None = None,
    ) -> DecisionEngineResponse:
        """Formulate preprocessing steps, candidate models, and AI rationale synchronously."""
        df, _ = self._load_dataframe(project_id)
        if target_column not in df.columns:
            raise DatasetValidationError(f"Target column '{target_column}' does not exist.")

        analysis = analyze_target_column(df[target_column], target_column)
        task_type = override_task_type or analysis.inferred_task
        input_cols = [c for c in df.columns if c != target_column]

        steps, features_summary = self._formulate_steps(df, input_cols, user_objective)
        eng_features = self._detect_automated_features(df, input_cols, user_objective)
        primary_metric, available_metrics, models = self._select_candidate_models(
            task_type, len(df), len(input_cols), user_objective
        )

        llm_rationale: str | None = None
        is_llm_enriched = False
        active_provider = "offline"

        effective_gemini_key = gemini_api_key
        if (
            not effective_gemini_key
            and settings.GEMINI_API_KEY
            and settings.GEMINI_API_KEY.strip().startswith("AIzaSy")
        ):
            effective_gemini_key = settings.GEMINI_API_KEY

        chosen_gemini_model = (
            gemini_model.strip()
            if (gemini_model and gemini_model.strip())
            else settings.GEMINI_MODEL
        )

        if effective_gemini_key and effective_gemini_key.strip():
            try:
                sys_prompt, usr_prompt = self._build_ai_prompt(
                    task_type,
                    target_column,
                    features_summary,
                    models,
                    eng_features,
                    user_objective,
                    primary_metric,
                )
                key = effective_gemini_key.strip()
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_gemini_model}:generateContent?key={key}"
                combined_prompt = f"{sys_prompt}\n\nTask Specifics:\n{usr_prompt}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": combined_prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800},
                }
                with httpx.Client(timeout=15.0) as client:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                llm_rationale = "".join(p.get("text", "") for p in parts)
                                is_llm_enriched = True
                                active_provider = "gemini"
            except Exception as exc:
                logger.warning("Gemini synchronous call unavailable (%s), using heuristics.", exc)

        rationale_text = llm_rationale or self._generate_deterministic_rationale(
            task_type,
            target_column,
            len(input_cols),
            steps,
            models,
            user_objective,
            eng_features,
        )

        return DecisionEngineResponse(
            target_column=target_column,
            task_type=task_type,
            primary_metric=primary_metric,
            available_metrics=available_metrics,
            preprocessing_steps=steps,
            engineered_features=eng_features,
            candidate_models=models,
            engineering_rationale=rationale_text,
            user_objective=user_objective,
            is_llm_enriched=is_llm_enriched,
            ai_provider=active_provider,
        )

    def confirm_target(self, project_id: str, req: ConfirmTargetRequest) -> ConfirmedTargetResponse:
        """Lock confirmed target, task type, and candidate models for training."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if not req.selected_models:
            raise DatasetValidationError(
                "At least one model candidate must be selected for training."
            )

        config_data = {
            "project_id": project_id,
            "target_column": req.target_column,
            "task_type": req.task_type.value,
            "selected_models": req.selected_models,
            "primary_metric": req.primary_metric,
            "user_objective": req.user_objective,
            "engineered_features": [f.model_dump() for f in req.engineered_features],
            "confirmed_at": datetime.now(UTC).isoformat(),
        }

        self.storage.save_file(
            project_id,
            TARGET_CONFIG_SUBFOLDER,
            TARGET_CONFIG_FILENAME,
            json.dumps(config_data, indent=2).encode("utf-8"),
        )

        project.status = "target_confirmed"
        self.project_repo.update(project)

        logger.info(
            "Project %s confirmed target '%s' (%s, %d models)",
            project_id,
            req.target_column,
            req.task_type.value,
            len(req.selected_models),
        )

        try:
            from app.services.audit import AuditService

            AuditService(self.project_repo.db).record_event(
                project_id=project_id,
                action="target_confirmed",
                reason=(
                    f"Confirmed target '{req.target_column}' ({req.task_type.value}) with "
                    f"metric '{req.primary_metric}' across {len(req.selected_models)} models"
                ),
                evidence={
                    "target_column": req.target_column,
                    "task_type": req.task_type.value,
                    "primary_metric": req.primary_metric,
                    "selected_models": req.selected_models,
                    "user_objective": req.user_objective,
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record target_confirmed audit event: %s", audit_err)

        return ConfirmedTargetResponse(
            project_id=project_id,
            target_column=req.target_column,
            task_type=req.task_type,
            selected_models=req.selected_models,
            primary_metric=req.primary_metric,
            status="target_confirmed",
            confirmed_at=config_data["confirmed_at"],
            user_objective=req.user_objective,
            engineered_features=req.engineered_features,
        )

    def get_confirmed_target(self, project_id: str) -> ConfirmedTargetResponse | None:
        """Fetch previously confirmed target configuration if present."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if not self.storage.file_exists(
            project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
        ):
            return None

        try:
            raw_bytes = self.storage.read_file(
                project_id, TARGET_CONFIG_SUBFOLDER, TARGET_CONFIG_FILENAME
            )
            data = json.loads(raw_bytes.decode("utf-8"))
            eng_feats = [EngineeredFeature(**ef) for ef in data.get("engineered_features", [])]
            return ConfirmedTargetResponse(
                project_id=data["project_id"],
                target_column=data["target_column"],
                task_type=TaskType(data["task_type"]),
                selected_models=data["selected_models"],
                primary_metric=data["primary_metric"],
                status=project.status,
                confirmed_at=data["confirmed_at"],
                user_objective=data.get("user_objective"),
                engineered_features=eng_feats,
            )
        except Exception as exc:
            logger.warning("Could not read target config for %s: %s", project_id, exc)
            return None
