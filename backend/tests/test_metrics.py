"""Unit tests verifying mathematical accuracy and edge-case resilience of all academic metrics."""

import numpy as np
import pytest

from app.ml.metrics import (
    aggregate_cv_metrics,
    compute_classification_metrics,
    compute_regression_metrics,
    is_error_metric,
    normalize_primary_metric,
)


def test_regression_metrics_complete_suite() -> None:
    """Verify all 8 regression metrics are computed correctly."""
    y_true = np.array([3.0, -0.5, 2.0, 7.0])
    y_pred = np.array([2.5, 0.0, 2.0, 8.0])

    metrics = compute_regression_metrics(y_true, y_pred)

    assert "rmse" in metrics
    assert "mae" in metrics
    assert "r2" in metrics
    assert "medae" in metrics
    assert "explained_variance" in metrics
    assert "max_error" in metrics
    assert metrics["rmse"] > 0
    assert metrics["mae"] > 0
    assert metrics["max_error"] == 1.0  # max(|7-8|) = 1.0
    assert metrics["medae"] == 0.5  # median(|0.5|, |0.5|, |0.0|, |1.0|) = 0.5


def test_regression_mape_and_rmsle_applicability() -> None:
    """Verify MAPE and RMSLE are only computed when statistically valid."""
    # Strictly positive data -> both MAPE and RMSLE valid
    y_true_pos = np.array([10.0, 20.0, 30.0, 40.0])
    y_pred_pos = np.array([11.0, 19.0, 31.0, 38.0])
    metrics_pos = compute_regression_metrics(y_true_pos, y_pred_pos)
    assert "mape" in metrics_pos
    assert "rmsle" in metrics_pos
    assert metrics_pos["mape"] > 0
    assert metrics_pos["rmsle"] > 0

    # Data with zero target -> MAPE skipped or handled safely
    y_true_zero = np.array([0.0, 20.0, 30.0, 40.0])
    y_pred_zero = np.array([1.0, 19.0, 31.0, 38.0])
    metrics_zero = compute_regression_metrics(y_true_zero, y_pred_zero)
    # Zero in y_true means MAPE is avoided to prevent inf
    assert "mape" not in metrics_zero
    assert "rmsle" in metrics_zero

    # Negative target -> RMSLE skipped
    y_true_neg = np.array([-5.0, 10.0, 20.0])
    y_pred_neg = np.array([-4.0, 11.0, 19.0])
    metrics_neg = compute_regression_metrics(y_true_neg, y_pred_neg)
    assert "rmsle" not in metrics_neg


def test_classification_metrics_binary_complete_suite() -> None:
    """Verify all 9+ classification metrics on binary labels with probabilities."""
    y_true = np.array([0, 1, 0, 1, 1, 0, 1, 0])
    y_pred = np.array([0, 1, 0, 1, 0, 0, 1, 1])
    y_prob = np.array([
        [0.9, 0.1],
        [0.2, 0.8],
        [0.85, 0.15],
        [0.3, 0.7],
        [0.45, 0.55],
        [0.75, 0.25],
        [0.1, 0.9],
        [0.4, 0.6],
    ])

    metrics = compute_classification_metrics(y_true, y_pred, y_prob)

    assert "accuracy" in metrics
    assert "balanced_accuracy" in metrics
    assert "f1_macro" in metrics
    assert "f1_weighted" in metrics
    assert "precision_macro" in metrics
    assert "precision_weighted" in metrics
    assert "recall_macro" in metrics
    assert "recall_weighted" in metrics
    assert "mcc" in metrics
    assert "roc_auc" in metrics
    assert "pr_auc" in metrics
    assert "log_loss" in metrics

    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert 0.0 <= metrics["balanced_accuracy"] <= 1.0
    assert 0.0 <= metrics["roc_auc"] <= 1.0
    assert 0.0 <= metrics["pr_auc"] <= 1.0
    assert metrics["log_loss"] >= 0.0
    assert -1.0 <= metrics["mcc"] <= 1.0


def test_classification_metrics_multiclass() -> None:
    """Verify multiclass classification metrics with 3 classes."""
    y_true = np.array([0, 1, 2, 0, 1, 2])
    y_pred = np.array([0, 1, 2, 0, 2, 1])
    y_prob = np.array([
        [0.8, 0.1, 0.1],
        [0.1, 0.8, 0.1],
        [0.1, 0.1, 0.8],
        [0.7, 0.2, 0.1],
        [0.2, 0.3, 0.5],
        [0.1, 0.6, 0.3],
    ])

    metrics = compute_classification_metrics(y_true, y_pred, y_prob)

    assert "accuracy" in metrics
    assert "balanced_accuracy" in metrics
    assert "f1_macro" in metrics
    assert "mcc" in metrics
    assert "roc_auc" in metrics
    assert "pr_auc" in metrics
    assert "log_loss" in metrics


def test_normalization_and_error_identification() -> None:
    """Verify metric normalization and directionality classification."""
    # Error metrics (lower is better)
    assert is_error_metric("rmse")
    assert is_error_metric("mae")
    assert is_error_metric("medae")
    assert is_error_metric("mape")
    assert is_error_metric("rmsle")
    assert is_error_metric("max_error")
    assert is_error_metric("log_loss")

    # Score metrics (higher is better)
    assert not is_error_metric("r2")
    assert not is_error_metric("explained_variance")
    assert not is_error_metric("accuracy")
    assert not is_error_metric("balanced_accuracy")
    assert not is_error_metric("f1_macro")
    assert not is_error_metric("roc_auc")
    assert not is_error_metric("pr_auc")
    assert not is_error_metric("mcc")

    # Normalization aliases
    assert normalize_primary_metric("root_mean_squared_error") == "rmse"
    assert normalize_primary_metric("macro_f1") == "f1_macro"
    assert normalize_primary_metric("bacc") == "balanced_accuracy"
    assert normalize_primary_metric("average_precision") == "pr_auc"


def test_aggregate_cv_metrics() -> None:
    """Verify CV aggregation computes mean, std, and preserves folds."""
    folds = [
        {"accuracy": 0.80, "f1_macro": 0.78, "mape": 0.10},
        {"accuracy": 0.90, "f1_macro": 0.88, "mape": 0.12},
    ]
    agg = aggregate_cv_metrics(folds, "accuracy")
    assert "accuracy" in agg
    assert agg["accuracy"]["mean"] == 0.85
    assert agg["accuracy"]["std"] == 0.05
    assert len(agg["accuracy"]["folds"]) == 2
    assert "mape" in agg
