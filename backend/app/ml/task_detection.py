"""Machine Learning task detection heuristics and target distribution analysis.

Adheres to Rule 2: Task detection provides suggestions only.
The human user must confirm or override before model training starts.
"""

from enum import Enum

import pandas as pd
from pydantic import BaseModel, Field


class TaskType(str, Enum):  # noqa: UP042
    """Supported machine learning task types."""

    BINARY_CLASSIFICATION = "binary_classification"
    MULTICLASS_CLASSIFICATION = "multiclass_classification"
    REGRESSION = "regression"


class ClassDistributionItem(BaseModel):
    """Frequency and proportion for a target class label."""

    label: str
    count: int
    percentage: float


class TargetAnalysis(BaseModel):
    """Analyzed properties of a proposed target feature."""

    column_name: str
    inferred_task: TaskType
    confidence: float = Field(..., ge=0.0, le=1.0)
    distinct_count: int
    null_count: int
    null_percentage: float
    reason: str
    classes: list[ClassDistributionItem] = Field(default_factory=list)
    summary_stats: dict[str, float] = Field(default_factory=dict)
    min_class_count: int | None = None
    has_rule3_warning: bool = False
    imbalance_ratio: str | None = None
    is_severe_imbalance: bool = False
    target_skewness: float | None = None
    skewness_warning: str | None = None


def analyze_target_column(
    series: pd.Series,
    column_name: str,
    effective_task_type: TaskType | None = None,
) -> TargetAnalysis:
    """Analyze a candidate target series and suggest an ML task type.

    If effective_task_type is provided, distribution metrics (classes vs summary stats)
    are dynamically computed to match the requested task type (Rule 2 Override).
    """
    non_null = series.dropna()
    total_len = len(series)
    null_count = int(series.isnull().sum())
    null_pct = round((null_count / total_len) * 100.0, 2) if total_len > 0 else 0.0
    distinct_count = int(non_null.nunique())

    # Default heuristic suggestion
    task = TaskType.BINARY_CLASSIFICATION
    confidence = 0.5
    reason = "Default heuristic suggestion."

    is_bool = pd.api.types.is_bool_dtype(non_null)
    is_numeric = pd.api.types.is_numeric_dtype(non_null) and not is_bool
    is_float = pd.api.types.is_float_dtype(non_null)

    if distinct_count == 2 or is_bool:
        task = TaskType.BINARY_CLASSIFICATION
        confidence = 0.95
        reason = f"Feature contains exactly 2 distinct classes ({distinct_count})."

    elif is_numeric and is_float:
        task = TaskType.REGRESSION
        confidence = 0.90
        reason = f"Continuous numeric feature (float) with {distinct_count:,} unique values."

    elif is_numeric and not is_float:
        # Integer target
        if distinct_count <= 10:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.85
            reason = f"Discrete integer feature with {distinct_count} distinct classes."
        else:
            task = TaskType.REGRESSION
            confidence = 0.75
            reason = f"Integer feature with high cardinality ({distinct_count} distinct values)."

    else:
        # String / Categorical / Object target
        if distinct_count <= 20:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.90
            reason = f"Categorical feature with {distinct_count} distinct category labels."
        else:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.60
            reason = f"High cardinality categorical feature ({distinct_count} categories)."

    # Determine active task: Use effective_task_type if human override provided
    active_task = effective_task_type or task

    classes: list[ClassDistributionItem] = []
    stats: dict[str, float] = {}
    min_class_count: int | None = None
    has_rule3_warning = False
    imbalance_ratio: str | None = None
    is_severe_imbalance = False
    target_skewness: float | None = None
    skewness_warning: str | None = None

    if active_task in (TaskType.BINARY_CLASSIFICATION, TaskType.MULTICLASS_CLASSIFICATION):
        val_counts = non_null.value_counts()
        total_valid = len(non_null)
        if not val_counts.empty:
            min_class_count = int(val_counts.min())
            # Rule 3: If class count < 5, stratified 5-fold CV will fail or needs fold reduction
            if min_class_count < 5:
                has_rule3_warning = True

            items_to_show = val_counts if len(val_counts) <= 20 else val_counts.head(10)
            for val, count in items_to_show.items():
                pct = round((count / total_valid) * 100.0, 2) if total_valid > 0 else 0.0
                classes.append(
                    ClassDistributionItem(label=str(val), count=int(count), percentage=pct)
                )

            # Imbalance detection
            if len(val_counts) >= 2:
                top_pct = classes[0].percentage
                second_pct = classes[1].percentage if len(classes) > 1 else (100.0 - top_pct)
                imbalance_ratio = f"{top_pct:.1f}% : {second_pct:.1f}%"
                if top_pct >= 80.0:
                    is_severe_imbalance = True
    else:
        # Regression active task
        clean_num = pd.to_numeric(non_null, errors="coerce").dropna()
        if len(clean_num) > 0:
            stats = {
                "mean": round(float(clean_num.mean()), 3),
                "std": round(float(clean_num.std(ddof=1)), 3) if len(clean_num) > 1 else 0.0,
                "min": round(float(clean_num.min()), 3),
                "max": round(float(clean_num.max()), 3),
                "median": round(float(clean_num.median()), 3),
            }
            if len(clean_num) > 2:
                skew_val = float(clean_num.skew())
                target_skewness = round(skew_val, 3)
                if abs(skew_val) > 1.2:
                    direction = "right" if skew_val > 0 else "left"
                    skewness_warning = (
                        f"Target distribution is {direction}-skewed ({skew_val:+.2f}). "
                        "Tree ensembles and robust loss scaling are prioritized."
                    )

    return TargetAnalysis(
        column_name=column_name,
        inferred_task=task,
        confidence=confidence,
        distinct_count=distinct_count,
        null_count=null_count,
        null_percentage=null_pct,
        reason=reason,
        classes=classes,
        summary_stats=stats,
        min_class_count=min_class_count,
        has_rule3_warning=has_rule3_warning,
        imbalance_ratio=imbalance_ratio,
        is_severe_imbalance=is_severe_imbalance,
        target_skewness=target_skewness,
        skewness_warning=skewness_warning,
    )


def suggest_candidate_targets(df: pd.DataFrame) -> list[str]:
    """Heuristically rank columns most likely intended as prediction targets.

    Prioritizes columns with standard target naming patterns ('target', 'label',
    'survived', 'price', 'outcome', 'class', etc.) or located at the final index.
    Disqualifies constant columns or unique ID columns.
    """
    scored: list[tuple[str, int]] = []
    target_keywords = {
        "target",
        "label",
        "survived",
        "y",
        "outcome",
        "class",
        "price",
        "revenue",
        "churn",
        "salary",
        "status",
        "default",
        "approved",
    }
    id_keywords = {"id", "guid", "uuid", "index", "code", "hash", "key", "#"}

    for idx, col in enumerate(df.columns):
        lower_name = str(col).lower().strip()
        score = 0

        # Skip high-probability ID columns
        if lower_name in id_keywords or lower_name.endswith("_id") or lower_name.startswith("id_"):
            continue

        # Skip constant columns
        if df[col].nunique(dropna=True) <= 1:
            continue

        # Skip high missingness
        if df[col].isnull().mean() > 0.40:
            continue

        # Keyword match bonus
        if any(kw == lower_name or kw in lower_name for kw in target_keywords):
            score += 50

        # Last column convention bonus
        if idx == len(df.columns) - 1:
            score += 20

        scored.append((col, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [col for col, _ in scored]
