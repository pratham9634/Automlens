"""Pydantic schemas for Model Explainability & Interpretability (Phase 7).

Strictly adheres to:
- Rule 9: Precise labeling (e.g., 'Mean |SHAP| via TreeExplainer on 100 samples')
- Rule 10: Academic causation disclaimer on all explanations
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

DEFAULT_DISCLAIMER = (
    "Feature attribution explains how the model made its decision based on correlated patterns "
    "in the training data; it does not prove real-world causation."
)


class FeatureImportanceItem(BaseModel):
    """Global importance and mean |SHAP| impact for a single feature."""

    feature_name: str = Field(description="Engineered or clean feature name (e.g. sex_female)")
    original_feature: str = Field(description="Original column name in source dataset (e.g. sex)")
    importance_score: float = Field(description="Normalized native model importance (0.0 - 1.0)")
    mean_abs_shap: float = Field(description="Mean absolute SHAP value across background samples")
    rank: int = Field(description="1-based importance rank")


class GlobalExplanationResponse(BaseModel):
    """Global model explainability report with SHAP and native importances."""

    model_config = ConfigDict(from_attributes=True)

    project_id: str
    model_id: str
    model_name: str
    task_type: str
    method_label: str = Field(
        description="Exact methodology, e.g. 'Mean |SHAP| via TreeExplainer on 100 samples'"
    )
    feature_importance_method: str = Field(
        description="Native importance metric, e.g. 'Gini Impurity (model.feature_importances_)'"
    )
    sample_size_used: int = Field(
        description="Number of background samples used for SHAP computation"
    )
    features: list[FeatureImportanceItem]
    academic_disclaimer: str = Field(default=DEFAULT_DISCLAIMER)
    layman_summary: str = Field(
        description="Plain-English explanation of top influential features for non-technical users"
    )


class LocalExplanationRequest(BaseModel):
    """Input features for single-observation local SHAP explanation."""

    inputs: dict[str, Any] = Field(
        description="Dictionary mapping column names to feature values",
        json_schema_extra={"example": {"age": 22, "fare": 7.25, "sex": "male"}},
    )


class LocalFeatureAttribution(BaseModel):
    """Individual feature contribution to a specific model decision."""

    feature_name: str
    original_feature: str
    feature_value: Any
    attribution_value: float = Field(
        description="SHAP attribution value (positive pushes output up, negative pushes down)"
    )
    direction: str = Field(description="'positive' | 'negative' | 'neutral'")


class LocalExplanationResponse(BaseModel):
    """Local SHAP waterfall attribution report for a single prediction."""

    model_config = ConfigDict(from_attributes=True)

    project_id: str
    model_id: str
    model_name: str
    prediction: Any = Field(description="Predicted class or regression value")
    base_value: float = Field(description="Expected value E[f(x)] before observation features")
    predicted_value: float = Field(description="Final model output f(x)")
    method_label: str = Field(description="E.g. 'Local SHAP attribution via TreeExplainer'")
    attributions: list[LocalFeatureAttribution]
    academic_disclaimer: str = Field(default=DEFAULT_DISCLAIMER)
    layman_explanation: str = Field(
        description="Plain-English breakdown of why the model reached this specific prediction"
    )
