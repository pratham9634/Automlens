"""Pydantic request and response schemas for Target Selection and Hybrid AI Decision Engine."""

from pydantic import BaseModel, Field

from app.ml.task_detection import ClassDistributionItem, TaskType


class TargetSuggestionItem(BaseModel):
    """Metadata and inferred task type for a single candidate target feature."""

    name: str
    dtype: str
    inferred_task: TaskType
    confidence: float
    distinct_count: int
    null_percentage: float
    is_recommended: bool
    reason: str


class TargetSuggestResponse(BaseModel):
    """Automated target recommendations for a project's dataset."""

    recommended_target: str | None
    suggestions: list[TargetSuggestionItem]


class AnalyzeTargetRequest(BaseModel):
    """Request payload to analyze a specific candidate target feature."""

    target_column: str = Field(..., description="Name of the selected target column")
    override_task_type: TaskType | None = Field(
        default=None, description="Optional human override for the ML task type (Rule 2)"
    )


class TargetAnalysisDetailResponse(BaseModel):
    """In-depth distribution and task inference for the selected target."""

    target_column: str
    task_type: TaskType
    is_overridden: bool
    distinct_count: int
    null_count: int
    null_percentage: float
    classes: list[ClassDistributionItem] = Field(default_factory=list)
    summary_stats: dict[str, float] = Field(default_factory=dict)
    reason: str


class ModelCandidate(BaseModel):
    """An algorithm candidate eligible for 5-fold cross-validation."""

    id: str = Field(..., description="Machine-readable model identifier")
    name: str = Field(..., description="Human-readable model name")
    is_baseline: bool = Field(..., description="True if this is the Dummy baseline (Rule 4)")
    description: str = Field(..., description="Architectural summary of the model")
    default_selected: bool = Field(default=True, description="Pre-selected by default")


class PreprocessingStep(BaseModel):
    """A deterministic transformation decision formulated by the expert rule engine."""

    column: str
    step_type: str = Field(..., description="'imputation', 'scaling', 'encoding', or 'drop'")
    strategy: str = Field(..., description="e.g., 'median', 'robust', 'one_hot', 'drop_constant'")
    reason: str = Field(..., description="Engineering rationale justifying the decision")


class EngineeredFeature(BaseModel):
    """An automated or user-objective guided feature extraction decision."""

    name: str = Field(..., description="Name of the engineered feature")
    source_columns: list[str] = Field(
        default_factory=list, description="Columns used to create this feature"
    )
    transformation_type: str = Field(
        ...,
        description="e.g. 'datetime_decomposition', 'interaction_ratio', 'outlier_capping'",
    )
    formula_or_desc: str = Field(..., description="Operation description or mathematical formula")
    rationale: str = Field(..., description="Justification based on data or user objective")


class FormulateDecisionsRequest(BaseModel):
    """Request payload to formulate decisions with optional user objective."""

    target_column: str = Field(..., description="Selected target column")
    override_task_type: TaskType | None = Field(
        default=None, description="Optional task type override"
    )
    user_objective: str | None = Field(
        default=None,
        description="Optional natural language goal/objective to guide decisions",
    )


class DecisionEngineResponse(BaseModel):
    """Formulated ML pipeline configuration, candidate models, and engineering rationale."""

    target_column: str
    task_type: TaskType
    primary_metric: str
    available_metrics: list[str]
    preprocessing_steps: list[PreprocessingStep]
    engineered_features: list[EngineeredFeature] = Field(default_factory=list)
    candidate_models: list[ModelCandidate]
    engineering_rationale: str
    user_objective: str | None = None
    is_llm_enriched: bool = Field(
        ..., description="True if AI/LLM was used, False if deterministic template"
    )
    ai_provider: str = Field(
        default="offline", description="Provider used: 'ollama', 'openrouter', or 'offline'"
    )


class ConfirmTargetRequest(BaseModel):
    """Payload to confirm target feature, task type, and candidate model selections."""

    target_column: str
    task_type: TaskType
    selected_models: list[str] = Field(..., min_length=1)
    primary_metric: str
    user_objective: str | None = None
    engineered_features: list[EngineeredFeature] = Field(default_factory=list)


class ConfirmedTargetResponse(BaseModel):
    """Confirmation receipt locking the target and unlocking parallel model training."""

    project_id: str
    target_column: str
    task_type: TaskType
    selected_models: list[str]
    primary_metric: str
    status: str
    confirmed_at: str
    user_objective: str | None = None
    engineered_features: list[EngineeredFeature] = Field(default_factory=list)
