"""Tests for Custom Feature Engineering Transformers and Dimensionality Reduction (Rule 1)."""

import numpy as np
import pandas as pd
from sklearn.model_selection import cross_validate

from app.ml.pipeline_factory import create_pipeline
from app.ml.task_detection import TaskType
from app.ml.transformers import (
    DateTimeFeatureExtractor,
    InteractionFeatureExtractor,
    OutlierCapper,
)


def test_datetime_feature_extractor() -> None:
    """Verify temporal decomposition into calendar components and missing value safety."""
    df = pd.DataFrame(
        {
            "event_date": ["2023-01-15", "2023-07-22", None, "invalid-date", "2024-12-31"],
        }
    )

    extractor = DateTimeFeatureExtractor(columns=["event_date"])
    extractor.fit(df)
    features = extractor.transform(df)

    assert features.shape == (5, 5)  # 5 rows, 5 components per date
    names = extractor.get_feature_names_out()
    assert len(names) == 5
    assert "event_date_year" in names
    assert "event_date_is_weekend" in names

    # Row 0 (2023-01-15 is Sunday, dayofweek=6, so is_weekend=1.0)
    assert features[0, 4] == 1.0

    # Ensure no NaN or Inf values remain
    assert not np.isnan(features).any()
    assert not np.isinf(features).any()


def test_interaction_feature_extractor() -> None:
    """Verify numeric interaction generation and zero-division robustness."""
    df = pd.DataFrame(
        {
            "revenue": [100.0, 500.0, 0.0, 300.0],
            "cost": [20.0, 0.0, 10.0, 50.0],  # Includes zero
        }
    )

    extractor = InteractionFeatureExtractor(
        interactions=[("revenue", "cost", "ratio"), ("revenue", "cost", "product")]
    )
    extractor.fit(df)
    features = extractor.transform(df)

    assert features.shape == (4, 2)
    names = extractor.get_feature_names_out()
    assert "revenue_ratio_cost" in names
    assert "revenue_product_cost" in names

    # Zero denominator in row 1 must not crash or produce inf
    assert not np.isnan(features).any()
    assert not np.isinf(features).any()
    assert features[1, 0] > 0.0  # safe ratio capped


def test_outlier_capper() -> None:
    """Verify IQR-based winsorization learns bounds on fit and clips on transform."""
    X_train = np.array([[10.0], [12.0], [11.0], [10.5], [1000.0]])  # extreme outlier
    capper = OutlierCapper(factor=1.5)
    capper.fit(X_train)

    assert capper.upper_bounds_ is not None
    assert capper.lower_bounds_ is not None
    assert capper.upper_bounds_[0] < 1000.0

    # Transform data with extreme outlier
    X_test = np.array([[5000.0], [-1000.0]])
    clipped = capper.transform(X_test)
    assert clipped[0, 0] <= capper.upper_bounds_[0]
    assert clipped[1, 0] >= capper.lower_bounds_[0]


def test_end_to_end_pipeline_with_extractions_and_pca() -> None:
    """Verify end-to-end pipeline with date decomposition, interactions, and PCA in CV."""
    np.random.seed(42)
    df = pd.DataFrame(
        {
            "date": ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01"] * 10,
            "feature_a": np.random.randn(40),
            "feature_b": np.random.uniform(1.0, 10.0, size=40),
            "category": np.random.choice(["cat1", "cat2"], size=40),
        }
    )
    y = np.random.choice([0, 1], size=40)

    engineered = [
        {
            "name": "date_components",
            "source_columns": ["date"],
            "transformation_type": "datetime_decomposition",
        },
        {
            "name": "ratio_a_b",
            "source_columns": ["feature_a", "feature_b"],
            "transformation_type": "interaction_ratio",
        },
    ]

    pipe = create_pipeline(
        model_id="random_forest",
        task_type=TaskType.BINARY_CLASSIFICATION,
        numeric_cols=["feature_a", "feature_b"],
        categorical_cols=["category"],
        engineered_features=engineered,
        enable_pca=True,
        pca_n_components=3,
        enable_feature_selection=True,
        select_k_features=2,
    )

    # Cross-validation executes without leakage
    scores = cross_validate(pipe, df, y, cv=3, scoring="f1_macro")
    assert "test_score" in scores
    assert len(scores["test_score"]) == 3
    assert not np.isnan(scores["test_score"]).any()
