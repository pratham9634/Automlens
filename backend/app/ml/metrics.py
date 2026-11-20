"""Comprehensive academic and industry metric computation and 5-fold CV aggregation for AutoMLens.

Adheres strictly to Rule 9 (unambiguous academic metric labeling).
Supports:
- Regression (8 metrics): RMSE, MAE, R², MedAE, MAPE, RMSLE, Explained Variance, Max Error
- Classification (9+ metrics): Accuracy, Balanced Accuracy, Precision (Macro/Weighted),
  Recall (Macro/Weighted), F1-score (Macro/Weighted), ROC-AUC, PR-AUC, Log Loss, MCC
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    explained_variance_score,
    f1_score,
    log_loss,
    matthews_corrcoef,
    max_error,
    mean_absolute_error,
    mean_absolute_percentage_error,
    median_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    root_mean_squared_error,
    root_mean_squared_log_error,
)
from sklearn.preprocessing import label_binarize


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray | None = None,
) -> dict[str, float]:
    """Calculate academic classification metrics for a single validation fold.

    Labels every metric unambiguously (Rule 9). Computes both macro and weighted
    averages for imbalanced scenarios, along with probability calibration metrics.
    """
    metrics: dict[str, float] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "precision_macro": float(
            precision_score(y_true, y_pred, average="macro", zero_division=0)
        ),
        "precision_weighted": float(
            precision_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_weighted": float(
            recall_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "mcc": float(matthews_corrcoef(y_true, y_pred)),
    }

    if y_prob is not None:
        try:
            unique_classes = np.unique(y_true)
            n_classes = len(unique_classes)
            if n_classes == 2:
                # Binary classification probability extraction
                if y_prob.ndim == 2 and y_prob.shape[1] == 2:
                    prob_pos = y_prob[:, 1]
                else:
                    prob_pos = y_prob

                # ROC-AUC
                try:
                    metrics["roc_auc"] = float(roc_auc_score(y_true, prob_pos))
                except Exception:
                    pass

                # PR-AUC (Average Precision score)
                try:
                    metrics["pr_auc"] = float(average_precision_score(y_true, prob_pos))
                except Exception:
                    pass

                # Log Loss (Cross-Entropy Loss)
                try:
                    prob_clipped = np.clip(y_prob, 1e-15, 1.0 - 1e-15)
                    metrics["log_loss"] = float(
                        log_loss(y_true, prob_clipped, labels=unique_classes)
                    )
                except Exception:
                    pass

            elif n_classes > 2:
                # Multiclass classification: one-vs-rest macro
                try:
                    metrics["roc_auc"] = float(
                        roc_auc_score(y_true, y_prob, multi_class="ovr", average="macro")
                    )
                except Exception:
                    pass

                # Multiclass PR-AUC
                try:
                    y_bin = label_binarize(y_true, classes=unique_classes)
                    if y_prob.shape == y_bin.shape:
                        metrics["pr_auc"] = float(
                            average_precision_score(y_bin, y_prob, average="macro")
                        )
                except Exception:
                    pass

                # Multiclass Log Loss
                try:
                    prob_clipped = np.clip(y_prob, 1e-15, 1.0 - 1e-15)
                    metrics["log_loss"] = float(
                        log_loss(y_true, prob_clipped, labels=unique_classes)
                    )
                except Exception:
                    pass
        except Exception:
            pass

    return metrics


def compute_regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict[str, float]:
    """Calculate standard and advanced academic regression metrics for a single validation fold.

    Labels every metric unambiguously (Rule 9). Supports raw positive values and
    sklearn neg_* aliases for grid/scoring consistency.
    """
    r2_val = float(r2_score(y_true, y_pred))
    rmse_val = float(root_mean_squared_error(y_true, y_pred))
    mae_val = float(mean_absolute_error(y_true, y_pred))
    medae_val = float(median_absolute_error(y_true, y_pred))
    ev_val = float(explained_variance_score(y_true, y_pred))
    max_err_val = float(max_error(y_true, y_pred))

    metrics: dict[str, float] = {
        "rmse": rmse_val,
        "mae": mae_val,
        "r2": r2_val,
        "medae": medae_val,
        "explained_variance": ev_val,
        "max_error": max_err_val,
        "neg_root_mean_squared_error": -rmse_val,
        "neg_mean_absolute_error": -mae_val,
        "neg_median_absolute_error": -medae_val,
    }

    # MAPE (Mean Absolute Percentage Error) - valid when non-zero
    try:
        if not np.any(np.isclose(y_true, 0.0)):
            mape_val = float(mean_absolute_percentage_error(y_true, y_pred))
            if np.isfinite(mape_val):
                metrics["mape"] = round(mape_val, 4)
    except Exception:
        pass

    # RMSLE (Root Mean Squared Logarithmic Error) - valid when y_true >= 0
    try:
        if np.all(y_true >= 0):
            y_pred_clipped = np.clip(y_pred, 0, None)
            rmsle_val = float(root_mean_squared_log_error(y_true, y_pred_clipped))
            if np.isfinite(rmsle_val):
                metrics["rmsle"] = round(rmsle_val, 4)
    except Exception:
        pass

    return metrics


def normalize_primary_metric(metric_name: str) -> str:
    """Normalize metric aliases to standard display and lookup keys."""
    m = metric_name.strip().lower()
    if m in ("rmse", "root_mean_squared_error", "neg_root_mean_squared_error"):
        return "rmse"
    if m in ("mae", "mean_absolute_error", "neg_mean_absolute_error"):
        return "mae"
    if m in ("r2", "r_squared", "r2_score"):
        return "r2"
    if m in ("medae", "median_absolute_error", "neg_median_absolute_error"):
        return "medae"
    if m in ("mape", "mean_absolute_percentage_error"):
        return "mape"
    if m in ("rmsle", "root_mean_squared_log_error"):
        return "rmsle"
    if m in ("explained_variance", "ev", "explained_variance_score"):
        return "explained_variance"
    if m in ("max_error", "max_err"):
        return "max_error"
    if m in ("f1", "f1_macro", "macro_f1"):
        return "f1_macro"
    if m in ("f1_weighted", "weighted_f1"):
        return "f1_weighted"
    if m in ("acc", "accuracy"):
        return "accuracy"
    if m in ("balanced_accuracy", "balanced_acc", "bacc"):
        return "balanced_accuracy"
    if m in ("precision", "precision_macro"):
        return "precision_macro"
    if m in ("precision_weighted",):
        return "precision_weighted"
    if m in ("recall", "recall_macro"):
        return "recall_macro"
    if m in ("recall_weighted",):
        return "recall_weighted"
    if m in ("roc_auc", "auc", "roc"):
        return "roc_auc"
    if m in ("pr_auc", "average_precision", "ap", "prauc"):
        return "pr_auc"
    if m in ("log_loss", "logloss", "cross_entropy", "loss"):
        return "log_loss"
    if m in ("mcc", "matthews_corrcoef"):
        return "mcc"
    return m


def is_error_metric(metric_name: str) -> bool:
    """Return True if a lower score indicates a better model (Rule 9)."""
    norm = normalize_primary_metric(metric_name)
    return norm in (
        "rmse",
        "mae",
        "medae",
        "mape",
        "rmsle",
        "max_error",
        "log_loss",
        "loss",
        "mse",
    )


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

    # Union of all metric keys across folds (since optional ones like MAPE may vary)
    all_keys = set()
    for f in fold_metrics:
        all_keys.update(f.keys())

    aggregated: dict[str, dict[str, float | list[float]]] = {}

    for k in sorted(all_keys):
        values = [f[k] for f in fold_metrics if k in f]
        if values:
            aggregated[k] = {
                "mean": round(float(np.mean(values)), 4),
                "std": round(float(np.std(values)), 4),
                "folds": [round(float(v), 4) for v in values],
            }

    return aggregated
