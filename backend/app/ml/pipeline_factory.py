"""Leakage-free Scikit-Learn Pipeline and ColumnTransformer factory (Rule 1 & Rule 8).

Constructs unified cross-validation pipelines combining automated preprocessing, custom
transformers (date decomposition, interaction ratios, outlier capping), dimensionality
reduction (PCA), feature selection, and candidate estimators across 24 models.
"""

from typing import Any

from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import PCA
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import (
    AdaBoostClassifier,
    ExtraTreesClassifier,
    ExtraTreesRegressor,
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.feature_selection import SelectKBest, f_classif, f_regression
from sklearn.impute import SimpleImputer
from sklearn.linear_model import (
    ElasticNet,
    Lasso,
    LogisticRegression,
    Ridge,
    RidgeClassifier,
)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler, StandardScaler
from sklearn.svm import LinearSVC, LinearSVR

from app.ml.task_detection import TaskType
from app.ml.transformers import (
    DateTimeFeatureExtractor,
    InteractionFeatureExtractor,
    OutlierCapper,
)


def parse_engineered_features(
    engineered_features: list[dict[str, Any]] | None,
) -> tuple[list[str], list[tuple[str, str, str]]]:
    """Parse engineered feature metadata into datetime columns and interaction tuples."""
    datetime_cols: list[str] = []
    interactions: list[tuple[str, str, str]] = []

    if engineered_features:
        for feat in engineered_features:
            ttype = feat.get("transformation_type")
            src = feat.get("source_columns", [])
            if ttype == "datetime_decomposition" and src:
                datetime_cols.extend(src)
            elif ttype == "interaction_ratio" and len(src) >= 2:
                interactions.append((src[0], src[1], "ratio"))
            elif ttype == "interaction_product" and len(src) >= 2:
                interactions.append((src[0], src[1], "product"))
            elif ttype == "interaction_difference" and len(src) >= 2:
                interactions.append((src[0], src[1], "difference"))

    return list(dict.fromkeys(datetime_cols)), interactions


def create_preprocessor(
    numeric_cols: list[str],
    categorical_cols: list[str],
    datetime_cols: list[str] | None = None,
    interactions: list[tuple[str, str, str]] | None = None,
    preprocessing_plan: list[dict[str, Any]] | None = None,
) -> ColumnTransformer:
    """Build a ColumnTransformer encapsulating all imputation, scaling, and feature extractions.

    Strictly satisfies Rule 1: All transformations occur inside this transformer,
    ensuring zero leakage across cross-validation splits.
    """
    transformers = []

    # 1. Numeric Feature Pipeline
    if numeric_cols:
        use_robust = False
        cap_outliers = False
        if preprocessing_plan:
            for step in preprocessing_plan:
                if step.get("step_type") == "scaling" and step.get("strategy") == "robust":
                    use_robust = True
                if step.get("step_type") == "capping":
                    cap_outliers = True

        scaler = RobustScaler() if use_robust else StandardScaler()
        num_steps: list[tuple[str, Any]] = [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", scaler),
        ]
        if cap_outliers:
            num_steps.insert(0, ("outlier_capper", OutlierCapper(factor=1.5)))

        num_pipeline = Pipeline(steps=num_steps)
        transformers.append(("numeric", num_pipeline, numeric_cols))

    # 2. Categorical Feature Pipeline
    if categorical_cols:
        cat_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        transformers.append(("categorical", cat_pipeline, categorical_cols))

    # 3. Datetime Decomposition Pipeline (Rule 1 & Intent Guided)
    if datetime_cols:
        dt_pipeline = Pipeline(
            steps=[
                ("dt_extractor", DateTimeFeatureExtractor(columns=datetime_cols)),
                ("scaler", StandardScaler()),
            ]
        )
        transformers.append(("datetime", dt_pipeline, datetime_cols))

    # 4. Numeric Interaction Pipeline
    if interactions:
        interact_cols = list({c for item in interactions for c in (item[0], item[1])})
        interact_pipeline = Pipeline(
            steps=[
                ("interact_extractor", InteractionFeatureExtractor(interactions=interactions)),
                ("scaler", RobustScaler()),
            ]
        )
        transformers.append(("interactions", interact_pipeline, interact_cols))

    return ColumnTransformer(transformers=transformers, remainder="drop")


def get_estimator(
    model_id: str,
    task_type: TaskType,
    random_state: int = 42,
) -> Any:
    """Instantiate candidate estimator from 24-model catalog with academic defaults (Rule 4)."""
    is_classification = task_type in (
        TaskType.BINARY_CLASSIFICATION,
        TaskType.MULTICLASS_CLASSIFICATION,
    )

    if is_classification:
        # 1. Mandatory Rule 4 Baseline
        if model_id == "dummy_classifier":
            return DummyClassifier(strategy="most_frequent")

        # 2. Linear Models
        elif model_id == "logistic_regression":
            return LogisticRegression(max_iter=1000, random_state=random_state)
        elif model_id == "ridge_classifier":
            return RidgeClassifier(random_state=random_state)

        # 3. Tree Ensembles
        elif model_id == "random_forest":
            return RandomForestClassifier(n_estimators=100, random_state=random_state, n_jobs=1)
        elif model_id == "extra_trees":
            return ExtraTreesClassifier(n_estimators=100, random_state=random_state, n_jobs=1)

        # 4. Gradient Boosting
        elif model_id in ("gradient_boosting", "hist_gradient_boosting"):
            return HistGradientBoostingClassifier(random_state=random_state)
        elif model_id in ("xgboost", "xgb"):
            try:
                from xgboost import XGBClassifier

                return XGBClassifier(
                    n_estimators=100,
                    random_state=random_state,
                    eval_metric="logloss",
                    n_jobs=1,
                )
            except ImportError:
                return HistGradientBoostingClassifier(random_state=random_state)
        elif model_id in ("lightgbm", "lgbm"):
            try:
                from lightgbm import LGBMClassifier

                return LGBMClassifier(
                    n_estimators=100,
                    random_state=random_state,
                    verbosity=-1,
                    n_jobs=1,
                )
            except ImportError:
                return HistGradientBoostingClassifier(random_state=random_state)
        elif model_id == "adaboost":
            return AdaBoostClassifier(n_estimators=50, random_state=random_state)

        # 5. Support Vector Machine (Calibrated)
        elif model_id in ("linear_svc", "svc"):
            base_svc = LinearSVC(random_state=random_state, dual="auto", max_iter=2000)
            return CalibratedClassifierCV(estimator=base_svc)

        # 6. Instance-based (K-NN)
        elif model_id in ("k_nearest_neighbors", "knn"):
            return KNeighborsClassifier(n_neighbors=5, n_jobs=1)

        # 7. Neural Network (MLP)
        elif model_id in ("mlp_classifier", "mlp"):
            return MLPClassifier(
                hidden_layer_sizes=(64, 32),
                max_iter=500,
                random_state=random_state,
                early_stopping=True,
            )
        else:
            raise ValueError(f"Unsupported classification model_id: {model_id}")

    else:  # REGRESSION
        # 1. Mandatory Rule 4 Baseline
        if model_id == "dummy_regressor":
            return DummyRegressor(strategy="mean")

        # 2. Linear Models
        elif model_id in ("ridge_regression", "ridge"):
            return Ridge(random_state=random_state)
        elif model_id == "lasso":
            return Lasso(alpha=1.0, random_state=random_state, max_iter=2000)
        elif model_id == "elastic_net":
            return ElasticNet(alpha=1.0, l1_ratio=0.5, random_state=random_state, max_iter=2000)

        # 3. Tree Ensembles
        elif model_id == "random_forest":
            return RandomForestRegressor(n_estimators=100, random_state=random_state, n_jobs=1)
        elif model_id == "extra_trees":
            return ExtraTreesRegressor(n_estimators=100, random_state=random_state, n_jobs=1)

        # 4. Gradient Boosting
        elif model_id in ("gradient_boosting", "hist_gradient_boosting"):
            return HistGradientBoostingRegressor(random_state=random_state)
        elif model_id in ("xgboost", "xgb"):
            try:
                from xgboost import XGBRegressor

                return XGBRegressor(
                    n_estimators=100,
                    random_state=random_state,
                    n_jobs=1,
                )
            except ImportError:
                return HistGradientBoostingRegressor(random_state=random_state)
        elif model_id in ("lightgbm", "lgbm"):
            try:
                from lightgbm import LGBMRegressor

                return LGBMRegressor(
                    n_estimators=100,
                    random_state=random_state,
                    verbosity=-1,
                    n_jobs=1,
                )
            except ImportError:
                return HistGradientBoostingRegressor(random_state=random_state)

        # 5. Support Vector Regressor
        elif model_id in ("svr", "linear_svr"):
            return LinearSVR(random_state=random_state, max_iter=2000, dual="auto")

        # 6. Instance-based (K-NN)
        elif model_id in ("k_nearest_neighbors", "knn"):
            return KNeighborsRegressor(n_neighbors=5, n_jobs=1)

        # 7. Neural Network (MLP)
        elif model_id in ("mlp_regressor", "mlp"):
            return MLPRegressor(
                hidden_layer_sizes=(64, 32),
                max_iter=500,
                random_state=random_state,
                early_stopping=True,
            )
        else:
            raise ValueError(f"Unsupported regression model_id: {model_id}")


def create_pipeline(
    model_id: str,
    task_type: TaskType,
    numeric_cols: list[str],
    categorical_cols: list[str],
    datetime_cols: list[str] | None = None,
    interactions: list[tuple[str, str, str]] | None = None,
    engineered_features: list[dict[str, Any]] | None = None,
    preprocessing_plan: list[dict[str, Any]] | None = None,
    enable_pca: bool = False,
    pca_n_components: int | None = None,
    enable_feature_selection: bool = False,
    select_k_features: int | None = None,
    random_state: int = 42,
) -> Pipeline:
    """Construct an end-to-end Pipeline combining preprocessing and estimator.

    Rule 1 & Rule 8: All transformations occur inside the Pipeline to guarantee
    zero test-set leakage across CV folds.
    """
    # Parse any engineered features passed from target configuration
    if engineered_features:
        parsed_dt, parsed_interact = parse_engineered_features(engineered_features)
        if parsed_dt:
            datetime_cols = list(dict.fromkeys((datetime_cols or []) + parsed_dt))
        if parsed_interact:
            interactions = (interactions or []) + parsed_interact

    preprocessor = create_preprocessor(
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        datetime_cols=datetime_cols,
        interactions=interactions,
        preprocessing_plan=preprocessing_plan,
    )

    estimator = get_estimator(
        model_id=model_id,
        task_type=task_type,
        random_state=random_state,
    )

    pipeline_steps: list[tuple[str, Any]] = [("preprocessor", preprocessor)]

    # Dynamic Dimensionality Reduction (PCA)
    if enable_pca:
        n_comp = pca_n_components or min(10, max(2, len(numeric_cols)))
        pipeline_steps.append(("pca", PCA(n_components=n_comp, random_state=random_state)))

    # Dynamic Feature Selection
    if enable_feature_selection:
        is_classification = task_type in (
            TaskType.BINARY_CLASSIFICATION,
            TaskType.MULTICLASS_CLASSIFICATION,
        )
        score_func = f_classif if is_classification else f_regression
        k_val = select_k_features or "all"
        pipeline_steps.append(("feature_selection", SelectKBest(score_func=score_func, k=k_val)))

    pipeline_steps.append(("model", estimator))

    return Pipeline(steps=pipeline_steps)
