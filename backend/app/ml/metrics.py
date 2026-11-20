"""Metric computation and 5-fold cross-validation aggregation for AutoMLens."""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    root_mean_squared_error,
)


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray | None = None,
) -> dict[str, float]:
    """Calculate academic classification metrics for a single validation fold.

    Labels every metric unambiguously (Rule 9).
    """
    metrics: dict[str, float] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
    }

    if y_prob is not None:
        try:
            unique_classes = np.unique(y_true)
            if len(unique_classes) == 2:
                # Binary classification
                if y_prob.ndim == 2 and y_prob.shape[1] == 2:
                    prob_pos = y_prob[:, 1]
                else:
                    prob_pos = y_prob
                metrics["roc_auc"] = float(roc_auc_score(y_true, prob_pos))
            elif len(unique_classes) > 2:
                # Multiclass classification: one-vs-rest macro
                metrics["roc_auc"] = float(
                    roc_auc_score(y_true, y_prob, multi_class="ovr", average="macro")
                )
        except Exception:
            # Fallback if probability dimensions or classes in test split don't support ROC-AUC
            pass

    return metrics


def compute_regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict[str, float]:
    """Calculate standard academic regression metrics for a single validation fold.

    Labels every metric unambiguously (Rule 9). Supports both raw positive error values
    and sklearn neg_* metric aliases to prevent key mismatches.
    """
    r2_val = float(r2_score(y_true, y_pred))
    rmse_val = float(root_mean_squared_error(y_true, y_pred))
    mae_val = float(mean_absolute_error(y_true, y_pred))

    return {
        "r2": r2_val,
        "rmse": rmse_val,
        "mae": mae_val,
        "neg_root_mean_squared_error": -rmse_val,
        "neg_mean_absolute_error": -mae_val,
    }


def normalize_primary_metric(metric_name: str) -> str:
    """Normalize metric aliases to standard display and lookup keys."""
    m = metric_name.strip().lower()
    if m in ("rmse", "root_mean_squared_error", "neg_root_mean_squared_error"):
        return "rmse"
    if m in ("mae", "mean_absolute_error", "neg_mean_absolute_error"):
        return "mae"
    if m in ("r2", "r_squared", "r2_score"):
        return "r2"
    if m in ("f1", "f1_macro", "macro_f1"):
        return "f1_macro"
    if m in ("acc", "accuracy"):
        return "accuracy"
    if m in ("precision", "precision_macro"):
        return "precision_macro"
    if m in ("recall", "recall_macro"):
        return "recall_macro"
    if m in ("roc_auc", "auc", "roc"):
        return "roc_auc"
    return m


def is_error_metric(metric_name: str) -> bool:
    """Return True if a lower score indicates a better model (Rule 9)."""
    norm = normalize_primary_metric(metric_name)
    return norm in ("rmse", "mae", "loss", "log_loss", "mse")


def aggregate_cv_metrics(
    fold_metrics: list[dict[str, float]],
    primary_metric: str,
) -> dict[str, dict[str, float | list[float]]]:
    """Aggregate per-fold metrics across cross-validation into mean and standard deviation.

    Example Output:
    {
        "f1_macro": {"mean": 0.842, "std": 0.031, "folds": [0.81, 0.85, 0.87, 0.83, 0.85]},
        "accuracy": {"mean": 0.860, "std": 0.025, "folds": [...]}
    }
    """
    if not fold_metrics:
        return {}

    all_keys = fold_metrics[0].keys()
    aggregated: dict[str, dict[str, float | list[float]]] = {}

    for k in all_keys:
        values = [f[k] for f in fold_metrics if k in f]
        if values:
            aggregated[k] = {
                "mean": round(float(np.mean(values)), 4),
                "std": round(float(np.std(values)), 4),
                "folds": [round(float(v), 4) for v in values],
            }

    return aggregated
