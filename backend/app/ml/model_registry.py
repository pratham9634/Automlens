"""Comprehensive Machine Learning Model Registry (Rule 4 Baseline & 24 Tabular Models).

Defines catalog metadata, task compatibility, algorithmic families, and automated recommendation
logic based on dataset scale and user modeling objectives.
"""

from dataclasses import dataclass

from app.api.v1.schemas.decision_engine import ModelCandidate
from app.ml.task_detection import TaskType


@dataclass(frozen=True)
class ModelMetadata:
    """Static descriptive metadata for an algorithm candidate."""

    id: str
    name: str
    family: str  # "baseline", "linear", "tree_ensemble", "boosting", "svm", "neighbors"
    description: str
    is_baseline: bool = False
    interpretability: str = "Medium"  # "High", "Medium", "Low"


# 12 Classification Estimators
CLASSIFICATION_REGISTRY: dict[str, ModelMetadata] = {
    "dummy_classifier": ModelMetadata(
        id="dummy_classifier",
        name="Dummy Classifier (Baseline)",
        family="baseline",
        description="Naive most-frequent baseline (Rule 4). Models must beat this naive guess.",
        is_baseline=True,
        interpretability="High",
    ),
    "logistic_regression": ModelMetadata(
        id="logistic_regression",
        name="Logistic Regression",
        family="linear",
        description="L2 regularized linear classifier providing fast probabilistic boundaries.",
        interpretability="High",
    ),
    "ridge_classifier": ModelMetadata(
        id="ridge_classifier",
        name="Ridge Classifier",
        family="linear",
        description="Linear classification via ridge regression loss, robust in high dimensions.",
        interpretability="High",
    ),
    "random_forest": ModelMetadata(
        id="random_forest",
        name="Random Forest Classifier",
        family="tree_ensemble",
        description="100 bootstrap aggregated decision trees reducing variance through averaging.",
        interpretability="Medium",
    ),
    "extra_trees": ModelMetadata(
        id="extra_trees",
        name="Extra Trees Classifier",
        family="tree_ensemble",
        description="Extremely randomized trees with random cut points for lower variance.",
        interpretability="Medium",
    ),
    "hist_gradient_boosting": ModelMetadata(
        id="hist_gradient_boosting",
        name="HistGradientBoosting Classifier",
        family="boosting",
        description="Histogram-binned gradient boosted trees offering high tabular accuracy.",
        interpretability="Low",
    ),
    "lightgbm": ModelMetadata(
        id="lightgbm",
        name="LightGBM Classifier",
        family="boosting",
        description="Fast leaf-wise gradient boosting optimized for speed and memory efficiency.",
        interpretability="Low",
    ),
    "xgboost": ModelMetadata(
        id="xgboost",
        name="XGBoost Classifier",
        family="boosting",
        description="Extreme gradient boosting with exact second-order Taylor expansion loss.",
        interpretability="Low",
    ),
    "linear_svc": ModelMetadata(
        id="linear_svc",
        name="Linear Support Vector Classifier (Calibrated)",
        family="svm",
        description="Maximum-margin hyperplane classifier calibrated for probability estimates.",
        interpretability="Medium",
    ),
    "k_nearest_neighbors": ModelMetadata(
        id="k_nearest_neighbors",
        name="K-Nearest Neighbors Classifier",
        family="neighbors",
        description="Non-parametric instance-based voting classifier using Euclidean proximity.",
        interpretability="Low",
    ),
    "mlp_classifier": ModelMetadata(
        id="mlp_classifier",
        name="Multi-Layer Perceptron (Neural Net)",
        family="neural_net",
        description="Feed-forward artificial neural network learning non-linear representations.",
        interpretability="Low",
    ),
    "adaboost": ModelMetadata(
        id="adaboost",
        name="AdaBoost Classifier",
        family="boosting",
        description="Sequential boosting placing higher training weights on misclassified samples.",
        interpretability="Medium",
    ),
}

# 12 Regression Estimators
REGRESSION_REGISTRY: dict[str, ModelMetadata] = {
    "dummy_regressor": ModelMetadata(
        id="dummy_regressor",
        name="Dummy Regressor (Mean Baseline)",
        family="baseline",
        description="Predicts mean training target (Rule 4). Represents R² = 0.0 baseline control.",
        is_baseline=True,
        interpretability="High",
    ),
    "ridge": ModelMetadata(
        id="ridge",
        name="Ridge Regression",
        family="linear",
        description="L2-penalized linear regression preventing coefficient explosion.",
        interpretability="High",
    ),
    "lasso": ModelMetadata(
        id="lasso",
        name="Lasso Regression",
        family="linear",
        description="L1-penalized sparse linear regression performing automatic feature shrinkage.",
        interpretability="High",
    ),
    "elastic_net": ModelMetadata(
        id="elastic_net",
        name="ElasticNet Regression",
        family="linear",
        description="Combined L1 and L2 regularized regression balancing sparsity and stability.",
        interpretability="High",
    ),
    "random_forest": ModelMetadata(
        id="random_forest",
        name="Random Forest Regressor",
        family="tree_ensemble",
        description="Bagged decision tree ensemble providing robust non-linear regression curves.",
        interpretability="Medium",
    ),
    "extra_trees": ModelMetadata(
        id="extra_trees",
        name="Extra Trees Regressor",
        family="tree_ensemble",
        description="Extremely randomized trees with random split thresholds for smoother fits.",
        interpretability="Medium",
    ),
    "hist_gradient_boosting": ModelMetadata(
        id="hist_gradient_boosting",
        name="HistGradientBoosting Regressor",
        family="boosting",
        description="Histogram gradient boosted trees optimizing squared error loss sequentially.",
        interpretability="Low",
    ),
    "lightgbm": ModelMetadata(
        id="lightgbm",
        name="LightGBM Regressor",
        family="boosting",
        description="Fast histogram gradient boosting with depth-limited leaf-wise tree growth.",
        interpretability="Low",
    ),
    "xgboost": ModelMetadata(
        id="xgboost",
        name="XGBoost Regressor",
        family="boosting",
        description="Regularized gradient boosted regression trees with early stopping protection.",
        interpretability="Low",
    ),
    "svr": ModelMetadata(
        id="svr",
        name="Support Vector Regressor (Linear)",
        family="svm",
        description="Epsilon-insensitive margin regressor robust to target outliers.",
        interpretability="Medium",
    ),
    "k_nearest_neighbors": ModelMetadata(
        id="k_nearest_neighbors",
        name="K-Nearest Neighbors Regressor",
        family="neighbors",
        description="Instance-based distance-weighted interpolation from nearest training points.",
        interpretability="Low",
    ),
    "mlp_regressor": ModelMetadata(
        id="mlp_regressor",
        name="Multi-Layer Perceptron Regressor",
        family="neural_net",
        description="Multi-layer feed-forward neural regressor for high-capacity modeling.",
        interpretability="Low",
    ),
}


def get_candidate_models(
    task_type: TaskType,
    n_rows: int = 1000,
    n_cols: int = 10,
    user_objective: str | None = None,
) -> list[ModelCandidate]:
    """Return catalog of candidate models with intelligent AI-recommended defaults.

    Always enforces Rule 4: Dummy baseline is mandatory and pre-selected.
    Selects complementary algorithms as default candidates based on dataset scale and objective.
    """
    is_classification = task_type in (
        TaskType.BINARY_CLASSIFICATION,
        TaskType.MULTICLASS_CLASSIFICATION,
    )
    registry = CLASSIFICATION_REGISTRY if is_classification else REGRESSION_REGISTRY
    obj_lower = (user_objective or "").lower()

    # Determine default algorithm selections
    default_ids: set[str] = set()

    # Rule 4: Mandatory Baseline
    default_ids.add("dummy_classifier" if is_classification else "dummy_regressor")

    # Select standard robust default suite (Linear, RF, HistGB, ExtraTrees)
    if is_classification:
        default_ids.update(
            ["logistic_regression", "random_forest", "hist_gradient_boosting", "extra_trees"]
        )
    else:
        default_ids.update(
            ["ridge", "random_forest", "hist_gradient_boosting", "extra_trees"]
        )

    # Intent-driven adjustments
    if any(k in obj_lower for k in ("neural", "deep", "mlp")):
        default_ids.add("mlp_classifier" if is_classification else "mlp_regressor")

    if any(k in obj_lower for k in ("fast", "light", "scalable")) or n_rows > 10000:
        default_ids.add("lightgbm")
        default_ids.add("xgboost")

    if any(k in obj_lower for k in ("sparse", "lasso", "shrinkage")) and not is_classification:
        default_ids.add("lasso")

    candidates: list[ModelCandidate] = []
    for model_id, meta in registry.items():
        candidates.append(
            ModelCandidate(
                id=meta.id,
                name=meta.name,
                is_baseline=meta.is_baseline,
                description=meta.description,
                default_selected=(model_id in default_ids),
            )
        )

    return candidates
