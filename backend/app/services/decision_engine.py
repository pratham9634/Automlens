"""Hybrid AI Decision Engine service.

Formulates deterministic data preprocessing pipelines and model candidate selections.
Enriches decisions with Local Ollama (qwen2.5:3b) or OpenRouter LLM engineering rationale.
Streams real-time token telemetry over Server-Sent Events (SSE).
Enforces Rule 1 (Zero CV Leakage), Rule 2 (Target Confirmation), and Rule 4 (Baseline Control).
"""

import asyncio
import io
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd
from openai import AsyncOpenAI
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

        analysis = analyze_target_column(df[target_column], target_column)
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
        imputation_count = len([s for s in steps if s.step_type == "imputation"])
        scaling_count = len([s for s in steps if s.step_type == "scaling"])
        encoding_count = len([s for s in steps if s.step_type == "encoding"])
        feat_count = len(engineered_features or [])

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
            f"To make the {num_features} input features understandable to machine learning "
            f"algorithms:\n"
            f"• **Missing Values ({imputation_count} columns):** Missing numerical values are "
            f"replaced with the middle (median) value so extreme numbers don't pull it off-track, "
            f"and missing categories are filled with the most common value.\n"
            f"• **Number Scaling ({scaling_count} columns):** Numerical features are scaled "
            f"so large numbers don't overpower smaller ones.\n"
            f"• **Text Conversion ({encoding_count} columns):** Categories are converted into "
            f"numeric flags (One-Hot / Ordinal Encoding) for mathematical operations.\n"
            f"{eng_note}"
            f"• **Strict Leakage Prevention (Rule 1):** We guarantee that data transformations "
            f"are calculated only on training folds during cross-validation, ensuring the model "
            f"never 'sees the exam answers' before test time.\n\n"
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
    ) -> tuple[str, str]:
        """Construct system and user prompt for Ollama or OpenRouter LLM."""
        system_prompt = (
            "You are the Chief Machine Learning Architect for AutoMLens explaining a machine "
            "learning pipeline for academic review. Enforce Rule 1 (zero data leakage: all "
            "transformations fit inside CV folds) and Rule 4 (mandatory Dummy baseline control)."
        )

        eng_feature_text = (
            ", ".join([f"{f.name} ({f.transformation_type})" for f in engineered_features])
            if engineered_features
            else "None required"
        )

        user_prompt = (
            f"Target Column: {target_column}\n"
            f"Task Type: {task_type.value}\n"
            f"User Objective: {user_objective or 'General automated tabular modeling'}\n"
            f"Features Summary (sample):\n{json.dumps(features_summary[:12], indent=2)}\n\n"
            f"Engineered Features: {eng_feature_text}\n"
            f"Candidate Estimators:\n{[m.name for m in models]}\n\n"
            f"Write a friendly, insightful engineering explanation in 3 clear sections:\n"
            f"1. 🎯 Goal & Target: Summary connecting user goal to target and metric.\n"
            f"2. 🧹 Automated Data Cleaning & Feature Extraction: How missing values, scaling, and "
            f"engineered features are safely computed inside folds without data leakage.\n"
            f"3. 🤖 Model Selection & Baseline Control: Why these candidate algorithms were picked "
            f"and why the Dummy baseline is like a scientific placebo control (Rule 4).\n"
            f"Use concise bullet points and simple analogies. Keep it under 320 words."
        )
        return system_prompt, user_prompt

    def _select_candidate_models(
        self, task_type: TaskType
    ) -> tuple[str, list[str], list[ModelCandidate]]:
        """Return primary metric, available metrics, and candidate models for task type."""
        if task_type == TaskType.BINARY_CLASSIFICATION:
            primary_metric = "f1_macro"
            available_metrics = [
                "f1_macro",
                "accuracy",
                "roc_auc",
                "precision_macro",
                "recall_macro",
            ]
            models = [
                ModelCandidate(
                    id="dummy_classifier",
                    name="Dummy Classifier (Baseline)",
                    is_baseline=True,
                    description="Most-frequent baseline (Rule 4). Models must beat this.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="logistic_regression",
                    name="Logistic Regression",
                    is_baseline=False,
                    description="Linear boundary with L2 regularization for fast baselines.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="random_forest",
                    name="Random Forest Classifier",
                    is_baseline=False,
                    description="100 decision trees robust to non-linear interactions & outliers.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="gradient_boosting",
                    name="HistGradientBoosting Classifier",
                    is_baseline=False,
                    description="Histogram gradient boosted trees offering high tabular accuracy.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="xgboost",
                    name="XGBoost Classifier",
                    is_baseline=False,
                    description="Extreme gradient boosted decision trees with regularization.",
                    default_selected=False,
                ),
            ]
        elif task_type == TaskType.MULTICLASS_CLASSIFICATION:
            primary_metric = "f1_macro"
            available_metrics = ["f1_macro", "accuracy", "precision_macro", "recall_macro"]
            models = [
                ModelCandidate(
                    id="dummy_classifier",
                    name="Dummy Classifier (Baseline)",
                    is_baseline=True,
                    description="Stratified class baseline (Rule 4). Models must beat chance.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="logistic_regression",
                    name="Multinomial Logistic Regression",
                    is_baseline=False,
                    description="Cross-entropy calibrated linear model for multiclass estimation.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="random_forest",
                    name="Random Forest Classifier",
                    is_baseline=False,
                    description="Bootstrap aggregated trees for high-dimensional class separation.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="gradient_boosting",
                    name="HistGradientBoosting Classifier",
                    is_baseline=False,
                    description="Fast gradient boosted trees for complex multiclass boundaries.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="xgboost",
                    name="XGBoost Classifier",
                    is_baseline=False,
                    description="Multiclass softmax gradient boosted trees for tabular accuracy.",
                    default_selected=False,
                ),
            ]
        else:  # REGRESSION
            primary_metric = "r2"
            available_metrics = ["r2", "neg_root_mean_squared_error", "neg_mean_absolute_error"]
            models = [
                ModelCandidate(
                    id="dummy_regressor",
                    name="Dummy Regressor (Mean Baseline)",
                    is_baseline=True,
                    description="Predicts the mean training target (Rule 4). R2 baseline = 0.0.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="ridge_regression",
                    name="Ridge Regression",
                    is_baseline=False,
                    description="L2-penalized linear regression preventing coefficient explosion.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="random_forest",
                    name="Random Forest Regressor",
                    is_baseline=False,
                    description="Non-linear tree ensemble reducing variance through averaging.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="gradient_boosting",
                    name="HistGradientBoosting Regressor",
                    is_baseline=False,
                    description="Sequential gradient boosted trees optimizing squared error loss.",
                    default_selected=True,
                ),
                ModelCandidate(
                    id="xgboost",
                    name="XGBoost Regressor",
                    is_baseline=False,
                    description="Extreme gradient boosted regression trees with regularized loss.",
                    default_selected=False,
                ),
            ]
        return primary_metric, available_metrics, models

    def _formulate_steps(
        self,
        df: pd.DataFrame,
        input_cols: list[str],
    ) -> tuple[list[PreprocessingStep], list[dict]]:
        """Formulate deterministic feature preprocessing transformations."""
        steps: list[PreprocessingStep] = []
        features_summary: list[dict] = []

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
                        reason="Zero-variance feature provides no discriminatory signal.",
                    )
                )
                continue

            is_bool = pd.api.types.is_bool_dtype(series)
            if pd.api.types.is_numeric_dtype(series) and not is_bool:
                clean_num = pd.to_numeric(series.dropna(), errors="coerce")
                skewness = float(clean_num.skew()) if len(clean_num) > 2 else 0.0
                impute_strategy = "median" if abs(skewness) > 1.0 else "mean"
                is_skewed = abs(skewness) > 1.0

                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="imputation",
                        strategy=impute_strategy,
                        reason=(
                            f"{impute_strategy.title()} imputation for "
                            f"{'skewed' if is_skewed else 'symmetric'} data (skew={skewness:.2f})."
                        ),
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

                scale_strategy = "robust" if outlier_pct > 5.0 else "standard"
                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="scaling",
                        strategy=scale_strategy,
                        reason=(
                            f"{scale_strategy.title()} scaling "
                            f"({'IQR outliers present' if outlier_pct > 5.0 else 'normal spread'})."
                        ),
                    )
                )
                features_summary.append(
                    {"name": col, "type": "numeric", "null_pct": null_pct, "skew": skewness}
                )
            else:
                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="imputation",
                        strategy="most_frequent",
                        reason="Mode imputation for missing categorical values.",
                    )
                )
                encode_strategy = "one_hot" if unique_count <= 10 else "ordinal"
                card_note = "cardinality <= 10" if unique_count <= 10 else "cardinality > 10"
                strategy_label = encode_strategy.replace("_", " ").title()
                steps.append(
                    PreprocessingStep(
                        column=col,
                        step_type="encoding",
                        strategy=encode_strategy,
                        reason=f"{strategy_label} ({card_note}).",
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
        return steps, features_summary

    async def stream_decisions(
        self,
        project_id: str,
        target_column: str,
        override_task_type: TaskType | None = None,
        user_objective: str | None = None,
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

            steps, features_summary = self._formulate_steps(df, input_cols)
            eng_features = self._detect_automated_features(df, input_cols, user_objective)
            primary_metric, available_metrics, models = self._select_candidate_models(task_type)

            deterministic_rationale = self._generate_deterministic_rationale(
                task_type=task_type,
                target_column=target_column,
                num_features=len(input_cols),
                steps=steps,
                models=models,
                user_objective=user_objective,
                engineered_features=eng_features,
            )

            # Signal beginning of streaming
            provider = settings.AI_PROVIDER.lower()
            yield _format_sse("status", {"status": "reasoning_started", "provider": provider})

            full_rationale = ""
            is_llm = False
            active_provider = "offline"

            if provider == "ollama":
                try:
                    sys_prompt, usr_prompt = self._build_ai_prompt(
                        task_type=task_type,
                        target_column=target_column,
                        features_summary=features_summary,
                        models=models,
                        engineered_features=eng_features,
                        user_objective=user_objective,
                    )
                    client = AsyncOpenAI(
                        base_url=settings.OLLAMA_BASE_URL,
                        api_key="ollama",
                        timeout=httpx.Timeout(20.0, connect=4.0),
                    )
                    stream = await client.chat.completions.create(
                        model=settings.OLLAMA_MODEL,
                        messages=[
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": usr_prompt},
                        ],
                        temperature=0.3,
                        max_tokens=650,
                        stream=True,
                    )
                    async for chunk in stream:
                        delta = chunk.choices[0].delta.content or ""
                        if delta:
                            full_rationale += delta
                            yield _format_sse("token", {"token": delta})
                    is_llm = True
                    active_provider = "ollama"
                except Exception as exc:
                    logger.warning(
                        "Ollama stream unreachable (%s), streaming offline fallback.",
                        exc,
                    )
                    notice_data = json.dumps(
                        {
                            "message": (
                                f"Local Ollama ({settings.OLLAMA_MODEL}) was unreachable ({exc}). "
                                "Falling back to deterministic rule engine."
                            )
                        }
                    )
                    yield _format_sse("notice", notice_data)
                    # Stream deterministic text line-by-line
                    for line in deterministic_rationale.split("\n"):
                        yield _format_sse("token", {"token": line + "\n"})
                        await asyncio.sleep(0.015)
                    full_rationale = deterministic_rationale
                    active_provider = "offline"

            elif provider == "openrouter" and settings.OPENROUTER_API_KEY:
                try:
                    sys_prompt, usr_prompt = self._build_ai_prompt(
                        task_type=task_type,
                        target_column=target_column,
                        features_summary=features_summary,
                        models=models,
                        engineered_features=eng_features,
                        user_objective=user_objective,
                    )
                    client = AsyncOpenAI(
                        base_url="https://openrouter.ai/api/v1",
                        api_key=settings.OPENROUTER_API_KEY,
                        timeout=httpx.Timeout(20.0, connect=5.0),
                    )
                    stream = await client.chat.completions.create(
                        model=settings.OPENROUTER_MODEL,
                        messages=[
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": usr_prompt},
                        ],
                        temperature=0.3,
                        max_tokens=650,
                        stream=True,
                    )
                    async for chunk in stream:
                        delta = chunk.choices[0].delta.content or ""
                        if delta:
                            full_rationale += delta
                            yield _format_sse("token", {"token": delta})
                    is_llm = True
                    active_provider = "openrouter"
                except Exception as exc:
                    logger.warning("OpenRouter error (%s), using deterministic fallback.", exc)
                    for line in deterministic_rationale.split("\n"):
                        yield _format_sse("token", {"token": line + "\n"})
                        await asyncio.sleep(0.01)
                    full_rationale = deterministic_rationale
                    active_provider = "offline"
            else:
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
    ) -> DecisionEngineResponse:
        """Formulate preprocessing steps, candidate models, and AI rationale synchronously."""
        df, _ = self._load_dataframe(project_id)
        if target_column not in df.columns:
            raise DatasetValidationError(f"Target column '{target_column}' does not exist.")

        analysis = analyze_target_column(df[target_column], target_column)
        task_type = override_task_type or analysis.inferred_task
        input_cols = [c for c in df.columns if c != target_column]

        steps, features_summary = self._formulate_steps(df, input_cols)
        eng_features = self._detect_automated_features(df, input_cols, user_objective)
        primary_metric, available_metrics, models = self._select_candidate_models(task_type)

        llm_rationale: str | None = None
        is_llm_enriched = False
        active_provider = "offline"

        if settings.AI_PROVIDER.lower() == "ollama":
            try:
                sys_prompt, usr_prompt = self._build_ai_prompt(
                    task_type,
                    target_column,
                    features_summary,
                    models,
                    eng_features,
                    user_objective,
                )
                headers = {"Content-Type": "application/json"}
                payload = {
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": usr_prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 600,
                    "stream": False,
                }
                with httpx.Client(timeout=6.0) as client:
                    res = client.post(
                        f"{settings.OLLAMA_BASE_URL}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    if res.status_code == 200:
                        llm_rationale = str(res.json()["choices"][0]["message"]["content"])
                        is_llm_enriched = True
                        active_provider = "ollama"
            except Exception as exc:
                logger.warning("Synchronous Ollama call unavailable (%s), using heuristics.", exc)

        elif settings.AI_PROVIDER.lower() == "openrouter" and settings.OPENROUTER_API_KEY:
            try:
                sys_prompt, usr_prompt = self._build_ai_prompt(
                    task_type,
                    target_column,
                    features_summary,
                    models,
                    eng_features,
                    user_objective,
                )
                headers = {
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY.strip()}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": usr_prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 600,
                }
                with httpx.Client(timeout=8.0) as client:
                    res = client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    if res.status_code == 200:
                        llm_rationale = str(res.json()["choices"][0]["message"]["content"])
                        is_llm_enriched = True
                        active_provider = "openrouter"
            except Exception as exc:
                logger.warning("Synchronous OpenRouter call unavailable (%s)", exc)

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
