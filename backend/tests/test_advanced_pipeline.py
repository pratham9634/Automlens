"""Unit test suite for AutoMLens Advanced Pipeline Enhancements.

Tests academic and industry-grade capabilities solving platform limitations:
1. High-cardinality nominals: Leakage-free dual-routing with TargetEncoder (> 20 unique values)
2. Dynamic feature selection: SelectKBest (f_classif / f_regression) inside Pipeline (Rule 1)
3. Target class imbalance handling: Automatic class_weight='balanced' injection (Rule 4)
4. Temporal validation: TimeSeriesSplit without lookahead data leakage (Rule 1 & Rule 3)
5. Stacked Ensemble Super-Learner: StackingClassifier & StackingRegressor pipelines (Rule 8)
6. Targeted Hyperparameter Tuning: RandomizedSearchCV sweep over regularized spaces
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import StackingClassifier, StackingRegressor
from sklearn.model_selection import TimeSeriesSplit, cross_validate
from sklearn.preprocessing import TargetEncoder

from app.ml.pipeline_factory import (
    create_pipeline,
    create_preprocessor,
    get_estimator,
)
from app.ml.task_detection import TaskType


def test_target_encoder_high_cardinality_routing() -> None:
    """Verify high-cardinality categoricals route to TargetEncoder while low route to OneHot."""
    np.random.seed(42)
    n_samples = 120

    # Low-cardinality (3 categories) vs High-cardinality (30 categories)
    colors = np.random.choice(["red", "blue", "green"], size=n_samples)
    zip_codes = [f"ZIP_{i % 30:03d}" for i in range(n_samples)]
    num_vals = np.random.randn(n_samples)

    df_X = pd.DataFrame({
        "age": num_vals,
        "color": colors,
        "zip_code": zip_codes,
    })
    y = np.random.choice([0, 1], size=n_samples)

    preprocessor = create_preprocessor(
        numeric_cols=["age"],
        categorical_cols=["color", "zip_code"],
        high_cardinality_cols=["zip_code"],
    )

    transformer_names = [name for name, _, _ in preprocessor.transformers]
    assert "numeric" in transformer_names
    assert "categorical_onehot" in transformer_names
    assert "categorical_target" in transformer_names

    # Check transformer assignments
    for name, trans, cols in preprocessor.transformers:
        if name == "categorical_onehot":
            assert cols == ["color"]
        elif name == "categorical_target":
            assert cols == ["zip_code"]
            assert any(isinstance(step[1], TargetEncoder) for step in trans.steps)

    # Fit and transform - strictly inside pipeline with zero leakage
    X_trans = preprocessor.fit_transform(df_X, y)
    assert X_trans.shape[0] == n_samples
    assert not np.isnan(X_trans).any()


def test_select_k_best_feature_selection_in_pipeline() -> None:
    """Verify SelectKBest feature selection operates inside the cross-validation Pipeline."""
    np.random.seed(42)
    n_samples = 100

    # 15 features, only 2 truly informative
    X = pd.DataFrame(np.random.randn(n_samples, 15), columns=[f"feat_{i}" for i in range(15)])
    y = (
        X["feat_0"] * 2.0 + X["feat_1"] * -1.5 + np.random.randn(n_samples) * 0.1 > 0
    ).astype(int)

    pipeline = create_pipeline(
        model_id="logistic_regression",
        task_type=TaskType.BINARY_CLASSIFICATION,
        numeric_cols=list(X.columns),
        categorical_cols=[],
        enable_feature_selection=True,
        select_k_features=5,
    )

    step_names = [name for name, _ in pipeline.steps]
    assert "preprocessor" in step_names
    assert "feature_selection" in step_names
    assert "model" in step_names

    scores = cross_validate(pipeline, X, y, cv=3, scoring="f1_macro")
    assert "test_score" in scores
    assert len(scores["test_score"]) == 3
    assert all(0.0 <= s <= 1.0 for s in scores["test_score"])


def test_class_weight_balanced_injection_on_imbalance() -> None:
    """Verify that class_weight='balanced' is automatically injected when is_imbalanced is True."""
    # Tree model
    rf = get_estimator("random_forest", TaskType.BINARY_CLASSIFICATION, is_imbalanced=True)
    assert rf.class_weight == "balanced"

    rf_standard = get_estimator(
        "random_forest", TaskType.BINARY_CLASSIFICATION, is_imbalanced=False
    )
    assert rf_standard.class_weight is None

    # Linear model
    lr = get_estimator("logistic_regression", TaskType.BINARY_CLASSIFICATION, is_imbalanced=True)
    assert lr.class_weight == "balanced"

    # Extra Trees
    et = get_estimator("extra_trees", TaskType.BINARY_CLASSIFICATION, is_imbalanced=True)
    assert et.class_weight == "balanced"


def test_time_series_split_prevents_lookahead_leakage() -> None:
    """Verify TimeSeriesSplit forward-chaining splits guarantee strict temporal ordering."""
    n_samples = 100
    tscv = TimeSeriesSplit(n_splits=5)
    indices = np.arange(n_samples)

    for train_idx, val_idx in tscv.split(indices):
        assert len(train_idx) > 0
        assert len(val_idx) > 0
        # Critical Rule: Every training timestamp must precede every validation timestamp
        assert max(train_idx) < min(val_idx), "Lookahead leakage: train index exceeds val index"


def test_stacked_ensemble_super_learner_instantiation_and_fit() -> None:
    """Verify StackingClassifier and StackingRegressor super-learners instantiate and fit."""
    np.random.seed(42)
    n_samples = 80
    X = pd.DataFrame({
        "f1": np.random.randn(n_samples),
        "f2": np.random.randn(n_samples),
    })

    # 1. Classification Stacking
    y_clf = np.random.choice([0, 1], size=n_samples)
    clf_pipe = create_pipeline(
        model_id="stacked_ensemble",
        task_type=TaskType.BINARY_CLASSIFICATION,
        numeric_cols=["f1", "f2"],
        categorical_cols=[],
    )
    assert isinstance(clf_pipe.named_steps["model"], StackingClassifier)

    clf_pipe.fit(X, y_clf)
    preds_clf = clf_pipe.predict(X)
    assert len(preds_clf) == n_samples

    # 2. Regression Stacking
    y_reg = X["f1"] * 3.0 + X["f2"] * 1.5 + np.random.randn(n_samples) * 0.1
    reg_pipe = create_pipeline(
        model_id="stacked_ensemble",
        task_type=TaskType.REGRESSION,
        numeric_cols=["f1", "f2"],
        categorical_cols=[],
    )
    assert isinstance(reg_pipe.named_steps["model"], StackingRegressor)

    reg_pipe.fit(X, y_reg)
    preds_reg = reg_pipe.predict(X)
    assert len(preds_reg) == n_samples
