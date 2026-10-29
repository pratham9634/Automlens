"""Tests for 24-Model Catalog, Rule 4 Baseline Enforcements, and Pipeline Execution."""

import numpy as np
import pandas as pd
from sklearn.model_selection import cross_validate

from app.ml.model_registry import (
    CLASSIFICATION_REGISTRY,
    REGRESSION_REGISTRY,
    get_candidate_models,
)
from app.ml.pipeline_factory import create_pipeline, get_estimator
from app.ml.task_detection import TaskType


def test_model_catalog_completeness() -> None:
    """Verify that both classification and regression registries have at least 12 models."""
    assert len(CLASSIFICATION_REGISTRY) >= 12
    assert len(REGRESSION_REGISTRY) >= 12

    # Verify Rule 4 Dummy baselines exist
    assert "dummy_classifier" in CLASSIFICATION_REGISTRY
    assert CLASSIFICATION_REGISTRY["dummy_classifier"].is_baseline is True

    assert "dummy_regressor" in REGRESSION_REGISTRY
    assert REGRESSION_REGISTRY["dummy_regressor"].is_baseline is True


def test_candidate_models_selection_and_intent() -> None:
    """Verify that candidate model selection marks defaults and responds to user intent."""
    # Binary classification default candidates
    cls_candidates = get_candidate_models(TaskType.BINARY_CLASSIFICATION, n_rows=500)
    baseline = next(m for m in cls_candidates if m.is_baseline)
    assert baseline.default_selected is True
    assert baseline.id == "dummy_classifier"

    # Verify neural intent adds MLP
    cls_neural = get_candidate_models(
        TaskType.BINARY_CLASSIFICATION, user_objective="Train a deep neural network"
    )
    mlp_candidate = next(m for m in cls_neural if m.id == "mlp_classifier")
    assert mlp_candidate.default_selected is True

    # Regression default candidates
    reg_candidates = get_candidate_models(TaskType.REGRESSION, n_rows=1500)
    reg_baseline = next(m for m in reg_candidates if m.is_baseline)
    assert reg_baseline.default_selected is True
    assert reg_baseline.id == "dummy_regressor"


def test_all_classification_estimators_instantiate_and_fit() -> None:
    """Verify that all classification estimators can be instantiated and fit in a pipeline."""
    # Synthetic classification data
    np.random.seed(42)
    X = pd.DataFrame(
        {
            "num1": np.random.randn(60),
            "num2": np.random.randn(60),
            "cat1": np.random.choice(["A", "B", "C"], size=60),
        }
    )
    y = np.random.choice([0, 1], size=60)

    for model_id in CLASSIFICATION_REGISTRY:
        estimator = get_estimator(model_id, TaskType.BINARY_CLASSIFICATION)
        assert estimator is not None

        # Build leakage-free pipeline (Rule 1 & Rule 8)
        pipe = create_pipeline(
            model_id=model_id,
            task_type=TaskType.BINARY_CLASSIFICATION,
            numeric_cols=["num1", "num2"],
            categorical_cols=["cat1"],
        )
        scores = cross_validate(pipe, X, y, cv=3, scoring="f1_macro")
        assert "test_score" in scores
        assert len(scores["test_score"]) == 3
        assert not np.isnan(scores["test_score"]).any()


def test_all_regression_estimators_instantiate_and_fit() -> None:
    """Verify that all regression estimators can be instantiated and fit in a pipeline."""
    # Synthetic regression data
    np.random.seed(42)
    X = pd.DataFrame(
        {
            "feat1": np.random.randn(60),
            "feat2": np.random.randn(60),
            "cat_feat": np.random.choice(["High", "Medium", "Low"], size=60),
        }
    )
    y = 3.0 * X["feat1"] + 0.5 * X["feat2"] + np.random.randn(60) * 0.1

    for model_id in REGRESSION_REGISTRY:
        estimator = get_estimator(model_id, TaskType.REGRESSION)
        assert estimator is not None

        pipe = create_pipeline(
            model_id=model_id,
            task_type=TaskType.REGRESSION,
            numeric_cols=["feat1", "feat2"],
            categorical_cols=["cat_feat"],
        )
        scores = cross_validate(pipe, X, y, cv=3, scoring="r2")
        assert "test_score" in scores
        assert len(scores["test_score"]) == 3
        assert not np.isnan(scores["test_score"]).any()

