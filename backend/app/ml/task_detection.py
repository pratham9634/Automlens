"""Machine Learning task detection heuristics and target distribution analysis.

Adheres to Rule 2: Task detection provides suggestions only.
The human user must confirm or override before model training starts.
"""

from enum import Enum

import pandas as pd
from pydantic import BaseModel, Field


class TaskType(str, Enum):
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


def analyze_target_column(series: pd.Series, column_name: str) -> TargetAnalysis:
    """Analyze a candidate target series and suggest an ML task type.

    Heuristics:
    1. If exactly 2 unique non-null values (or bool) -> BINARY_CLASSIFICATION (high confidence).
    2. If string, categorical, or object dtype:
       - <= 20 distinct values -> MULTICLASS_CLASSIFICATION.
       - > 20 distinct values -> High cardinality classification warning.
    3. If numeric (int or float):
       - If float with many unique values -> REGRESSION.
       - If int with <= 10 unique values -> MULTICLASS_CLASSIFICATION.
       - If int with > 10 unique values -> REGRESSION.
    """
    non_null = series.dropna()
    total_len = len(series)
    null_count = int(series.isnull().sum())
    null_pct = round((null_count / total_len) * 100.0, 2) if total_len > 0 else 0.0
    distinct_count = int(non_null.nunique())

    # Default fallback
    task = TaskType.BINARY_CLASSIFICATION
    confidence = 0.5
    reason = "Default heuristic suggestion."
    classes: list[ClassDistributionItem] = []
    stats: dict[str, float] = {}

    is_bool = pd.api.types.is_bool_dtype(non_null)
    is_numeric = pd.api.types.is_numeric_dtype(non_null) and not is_bool
    is_float = pd.api.types.is_float_dtype(non_null)

    if distinct_count == 2 or is_bool:
        task = TaskType.BINARY_CLASSIFICATION
        confidence = 0.95
        reason = f"Feature contains exactly 2 distinct classes ({distinct_count})."
        for val, count in non_null.value_counts().items():
            pct = round((count / len(non_null)) * 100.0, 2) if len(non_null) > 0 else 0.0
            classes.append(ClassDistributionItem(label=str(val), count=int(count), percentage=pct))

    elif is_numeric and is_float:
        task = TaskType.REGRESSION
        confidence = 0.90
        reason = f"Continuous numeric feature (float) with {distinct_count:,} unique values."
        if len(non_null) > 0:
            stats = {
                "mean": round(float(non_null.mean()), 3),
                "std": round(float(non_null.std(ddof=1)), 3) if len(non_null) > 1 else 0.0,
                "min": round(float(non_null.min()), 3),
                "max": round(float(non_null.max()), 3),
                "median": round(float(non_null.median()), 3),
            }

    elif is_numeric and not is_float:
        # Integer target
        if distinct_count <= 10:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.85
            reason = f"Discrete integer feature with {distinct_count} distinct classes."
            for val, count in non_null.value_counts().items():
                pct = round((count / len(non_null)) * 100.0, 2) if len(non_null) > 0 else 0.0
                classes.append(
                    ClassDistributionItem(label=str(val), count=int(count), percentage=pct)
                )
        else:
            task = TaskType.REGRESSION
            confidence = 0.75
            reason = f"Integer feature with high cardinality ({distinct_count} distinct values)."
            if len(non_null) > 0:
                stats = {
                    "mean": round(float(non_null.mean()), 3),
                    "std": round(float(non_null.std(ddof=1)), 3) if len(non_null) > 1 else 0.0,
                    "min": round(float(non_null.min()), 3),
                    "max": round(float(non_null.max()), 3),
                    "median": round(float(non_null.median()), 3),
                }

    else:
        # String / Categorical / Object target
        if distinct_count <= 20:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.90
            reason = f"Categorical feature with {distinct_count} distinct category labels."
            for val, count in non_null.value_counts().items():
                pct = round((count / len(non_null)) * 100.0, 2) if len(non_null) > 0 else 0.0
                classes.append(
                    ClassDistributionItem(label=str(val), count=int(count), percentage=pct)
                )
        else:
            task = TaskType.MULTICLASS_CLASSIFICATION
            confidence = 0.60
            reason = f"High cardinality categorical feature ({distinct_count} categories)."
            for val, count in non_null.value_counts().head(10).items():
                pct = round((count / len(non_null)) * 100.0, 2) if len(non_null) > 0 else 0.0
                classes.append(
                    ClassDistributionItem(label=str(val), count=int(count), percentage=pct)
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
