"""Leakage-free Scikit-Learn Pipeline and ColumnTransformer factory (Rule 1 & Rule 8)."""

from typing import Any

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler, StandardScaler

from app.ml.task_detection import TaskType


def create_preprocessor(
    numeric_cols: list[str],
    categorical_cols: list[str],
    preprocessing_plan: list[dict[str, Any]] | None = None,
) -> ColumnTransformer:
    """Build a ColumnTransformer encapsulating all imputation, scaling, and encoding.

    Strictly satisfies Rule 1: All transformations occur inside this transformer,
    ensuring zero leakage across cross-validation splits.
    """
    transformers = []

    # 1. Numeric Feature Pipeline
    if numeric_cols:
        # Determine if any numeric feature has outliers requiring RobustScaler
        use_robust = False
        if preprocessing_plan:
            for step in preprocessing_plan:
                if step.get("step_type") == "scaling" and step.get("strategy") == "robust":
                    use_robust = True
                    break

        scaler = RobustScaler() if use_robust else StandardScaler()
        num_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", scaler),
            ]
        )
        transformers.append(("numeric", num_pipeline, numeric_cols))

    # 2. Categorical Feature Pipeline
    if categorical_cols:
        # Check cardinality: use OneHotEncoder with handle_unknown='ignore'
        cat_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        transformers.append(("categorical", cat_pipeline, categorical_cols))

    return ColumnTransformer(transformers=transformers, remainder="drop")


def get_estimator(
    model_id: str,
    task_type: TaskType,
    random_state: int = 42,
) -> Any:
    """Instantiate candidate estimator with academic hyperparameters (Rule 4)."""
    is_classification = task_type in (
        TaskType.BINARY_CLASSIFICATION,
        TaskType.MULTICLASS_CLASSIFICATION,
    )

    if is_classification:
        if model_id == "dummy_classifier":
            # Rule 4: Mandatory Baseline
            return DummyClassifier(strategy="most_frequent")
        elif model_id == "logistic_regression":
            return LogisticRegression(max_iter=1000, random_state=random_state)
        elif model_id == "random_forest":
            return RandomForestClassifier(n_estimators=100, random_state=random_state, n_jobs=1)
        elif model_id in ("gradient_boosting", "hist_gradient_boosting"):
            return HistGradientBoostingClassifier(random_state=random_state)
        elif model_id in ("xgboost", "xgb"):
            try:
                from xgboost import XGBClassifier

                return XGBClassifier(
                    n_estimators=100,
                    random_state=random_state,
                    eval_metric="logloss",
                )
            except ImportError:
                return HistGradientBoostingClassifier(random_state=random_state)
        else:
            raise ValueError(f"Unsupported classification model_id: {model_id}")
    else:  # Regression
        if model_id == "dummy_regressor":
            # Rule 4: Mandatory Baseline
            return DummyRegressor(strategy="mean")
        elif model_id in ("ridge_regression", "ridge"):
            return Ridge(random_state=random_state)
        elif model_id == "random_forest":
            return RandomForestRegressor(n_estimators=100, random_state=random_state, n_jobs=1)
        elif model_id in ("gradient_boosting", "hist_gradient_boosting"):
            return HistGradientBoostingRegressor(random_state=random_state)
        elif model_id in ("xgboost", "xgb"):
            try:
                from xgboost import XGBRegressor

                return XGBRegressor(
                    n_estimators=100,
                    random_state=random_state,
                )
            except ImportError:
                return HistGradientBoostingRegressor(random_state=random_state)
        else:
            raise ValueError(f"Unsupported regression model_id: {model_id}")


def create_pipeline(
    model_id: str,
    task_type: TaskType,
    numeric_cols: list[str],
    categorical_cols: list[str],
    preprocessing_plan: list[dict[str, Any]] | None = None,
    random_state: int = 42,
) -> Pipeline:
    """Construct an end-to-end Pipeline combining preprocessing and estimator.

    Rule 1 & Rule 8: The pipeline contains both feature transformers and the model,
    enabling seamless serialization and zero data leakage.
    """
    preprocessor = create_preprocessor(
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        preprocessing_plan=preprocessing_plan,
    )
    estimator = get_estimator(
        model_id=model_id,
        task_type=task_type,
        random_state=random_state,
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", estimator),
        ]
    )
