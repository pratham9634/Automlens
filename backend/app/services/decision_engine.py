"""Hybrid AI Decision Engine service.

Formulates deterministic data preprocessing pipelines and model candidate selections.
Enriches decisions with OpenRouter LLM engineering rationale (with 100% offline fallback).
Enforces Rule 2 (Human Target Confirmation) and Rule 4 (Mandatory Dummy Baseline).
"""

import io
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd
from sqlalchemy.orm import Session

from app.api.v1.schemas.decision_engine import (
    ConfirmedTargetResponse,
    ConfirmTargetRequest,
    DecisionEngineResponse,
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


class DecisionEngineService:
    """Orchestrates target detection, heuristic pipeline formulation, and LLM enrichment."""

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

    def _generate_deterministic_rationale(
        self,
        task_type: TaskType,
        target_column: str,
        num_features: int,
        steps: list[PreprocessingStep],
        models: list[ModelCandidate],
    ) -> str:
        """Produce clear, intuitive, and beginner-friendly engineering explanation."""
        imputation_count = len([s for s in steps if s.step_type == "imputation"])
        scaling_count = len([s for s in steps if s.step_type == "scaling"])
        encoding_count = len([s for s in steps if s.step_type == "encoding"])

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
        return (
            f"🎯 **1. The Goal (What We Are Predicting):**\n"
            f"We are {goal_desc}. The system automatically identified this as a **{task_title}** "
            f"problem. To evaluate performance fairly, {metric_desc}\n\n"
            f"🧹 **2. How We Prepare the Data (Data Cleaning & Fairness):**\n"
            f"To make the {num_features} input features understandable to machine learning "
            f"algorithms:\n"
            f"• **Missing Values ({imputation_count} columns):** Missing numerical numbers are "
            f"replaced with the middle (median) value so extreme numbers don't pull it off-track, "
            f"and missing text is filled with the most common category.\n"
            f"• **Number Scaling ({scaling_count} columns):** All numerical features are scaled to "
            f"a standard range so that large numbers (like salary or total stats) don't overpower "
            f"smaller numbers (like age or ratings).\n"
            f"• **Text Conversion ({encoding_count} columns):** Categories are converted into "
            f"numeric flags (One-Hot Encoding) so computers can process them mathematically.\n"
            f"• **Strict Leakage Prevention (Rule 1):** We guarantee that data transformations "
            f"are calculated only on training samples during cross-validation, ensuring the model "
            f"never 'sees the exam answers' before test time.\n\n"
            f"🤖 **3. Why These Models Were Chosen:**\n"
            f"We select four diverse algorithms to compare strengths:\n"
            f"• **Dummy Baseline (Scientific Control - Rule 4):** A naive guesser (like a coin "
            f"flip or always picking the most common class). If an AI model cannot score higher "
            f"than this baseline, we know it hasn't actually learned anything useful.\n"
            f"• **Linear Model:** A fast, transparent model that tests for simple straight-line "
            f"patterns.\n"
            f"• **Random Forest:** An ensemble 'voting committee' of hundreds of decision trees "
            f"that handles non-linear relationships smoothly.\n"
            f"• **HistGradientBoosting:** A state-of-the-art tree model that learns sequentially "
            f"by focusing on and correcting its previous mistakes."
        )

    def _query_openrouter_llm(
        self,
        task_type: TaskType,
        target_column: str,
        features_summary: list[dict],
        models: list[ModelCandidate],
    ) -> str | None:
        """Optionally query OpenRouter LLM for human-readable engineering reasoning."""
        api_key = settings.OPENROUTER_API_KEY
        if not api_key or not api_key.strip():
            return None

        prompt = (
            f"You are the senior Machine Learning Architect for AutoMLens explaining this "
            f"project to someone who may not have an ML background (like a student or teacher).\n\n"
            f"Target Column: {target_column}\n"
            f"Task Type: {task_type.value}\n"
            f"Feature Summary:\n{json.dumps(features_summary[:15], indent=2)}\n\n"
            f"Candidate Estimators:\n{[m.name for m in models]}\n\n"
            f"Write a friendly, simple, yet deeply informative explanation in 3 clear sections:\n"
            f"1. 🎯 The Goal: Explain in plain English what we are predicting and why this task "
            f"type makes sense.\n"
            f"2. 🧹 Data Cleaning: Explain in simple terms how we handle missing values, scaling, "
            f"and text encoding, and why preventing data leakage matters (like not peeking at exam "
            f"answers).\n"
            f"3. 🤖 Selected Models: Explain why we chose these models and why the Dummy baseline "
            f"is like a scientific placebo / control test.\n"
            f"Use clear bullet points and simple analogies. Keep it under 300 words."
        )

        try:
            headers = {
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AutoMLens Decision Engine",
            }
            payload = {
                "model": settings.OPENROUTER_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert AutoML decision system explaining pipelines.",
                    },
                    {"role": "user", "content": prompt},
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
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    logger.info("Successfully enriched decision reasoning via OpenRouter LLM.")
                    return str(content)
                else:
                    logger.warning("OpenRouter API returned HTTP %s: %s", res.status_code, res.text)
                    return None
        except Exception as exc:
            logger.warning(
                "OpenRouter LLM enrichment unavailable (%s), falling back to offline heuristics.",
                exc,
            )
            return None

    def formulate_decisions(
        self,
        project_id: str,
        target_column: str,
        override_task_type: TaskType | None = None,
    ) -> DecisionEngineResponse:
        """Formulate data preprocessing steps, model candidates, and AI rationale."""
        df, _ = self._load_dataframe(project_id)
        if target_column not in df.columns:
            raise DatasetValidationError(f"Target column '{target_column}' does not exist.")

        analysis = analyze_target_column(df[target_column], target_column)
        task_type = override_task_type or analysis.inferred_task

        input_cols = [c for c in df.columns if c != target_column]
        steps: list[PreprocessingStep] = []
        features_summary: list[dict] = []

        # Formulate deterministic feature preprocessing steps
        for col in input_cols:
            series = df[col]
            unique_count = int(series.nunique(dropna=True))
            null_count = int(series.isnull().sum())
            null_pct = round((null_count / len(df)) * 100.0, 2) if len(df) > 0 else 0.0

            # 1. Constant column check
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

            # 2. Continuous / Numeric Feature
            is_bool = pd.api.types.is_bool_dtype(series)
            if pd.api.types.is_numeric_dtype(series) and not is_bool:
                clean_num = pd.to_numeric(series.dropna(), errors="coerce")
                skewness = float(clean_num.skew()) if len(clean_num) > 2 else 0.0

                # Imputation
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

                # Scaling: check for outliers via IQR
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
                    {
                        "name": col,
                        "type": "numeric",
                        "null_pct": null_pct,
                        "skew": skewness,
                    }
                )

            # 3. Categorical / Boolean Feature
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

        # Candidate Models Selection (Enforcing Rule 4: Mandatory Dummy Baseline)
        models: list[ModelCandidate] = []
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
            ]

        # Engineering Rationale Formulation (Hybrid LLM + Deterministic Fallback)
        llm_rationale = self._query_openrouter_llm(
            task_type, target_column, features_summary, models
        )
        is_llm_enriched = llm_rationale is not None
        rationale_text = llm_rationale or self._generate_deterministic_rationale(
            task_type, target_column, len(input_cols), steps, models
        )

        return DecisionEngineResponse(
            target_column=target_column,
            task_type=task_type,
            primary_metric=primary_metric,
            available_metrics=available_metrics,
            preprocessing_steps=steps,
            candidate_models=models,
            engineering_rationale=rationale_text,
            is_llm_enriched=is_llm_enriched,
        )

    def confirm_target(self, project_id: str, req: ConfirmTargetRequest) -> ConfirmedTargetResponse:
        """Lock confirmed target, task type, and candidate models for training."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        # Validate that at least one model is selected
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
            "confirmed_at": datetime.now(UTC).isoformat(),
        }

        # Persist target configuration artifact
        self.storage.save_file(
            project_id,
            TARGET_CONFIG_SUBFOLDER,
            TARGET_CONFIG_FILENAME,
            json.dumps(config_data, indent=2).encode("utf-8"),
        )

        # Update Project status to 'target_confirmed'
        project.status = "target_confirmed"
        self.project_repo.update(project)

        logger.info(
            "Project %s confirmed target '%s' (%s, %d models)",
            project_id,
            req.target_column,
            req.task_type.value,
            len(req.selected_models),
        )

        return ConfirmedTargetResponse(
            project_id=project_id,
            target_column=req.target_column,
            task_type=req.task_type,
            selected_models=req.selected_models,
            primary_metric=req.primary_metric,
            status="target_confirmed",
            confirmed_at=config_data["confirmed_at"],
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
            return ConfirmedTargetResponse(
                project_id=data["project_id"],
                target_column=data["target_column"],
                task_type=TaskType(data["task_type"]),
                selected_models=data["selected_models"],
                primary_metric=data["primary_metric"],
                status=project.status,
                confirmed_at=data["confirmed_at"],
            )
        except Exception as exc:
            logger.warning("Could not read target config for %s: %s", project_id, exc)
            return None
