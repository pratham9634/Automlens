"""Pydantic schemas for statistical profiling and data quality reporting."""

from pydantic import BaseModel, ConfigDict, Field


class HistogramBin(BaseModel):
    """Represents a single bin in a numeric feature's distribution."""

    bin_start: float = Field(..., description="Lower boundary of the bin (inclusive)")
    bin_end: float = Field(..., description="Upper boundary of the bin (exclusive, except last)")
    count: int = Field(..., description="Number of observed samples falling into this bin")


class CategoryFrequency(BaseModel):
    """Represents the count and proportion for a categorical value."""

    value: str = Field(..., description="Category label")
    count: int = Field(..., description="Number of occurrences")
    percentage: float = Field(..., description="Percentage of valid non-null entries")


class NumericColumnProfile(BaseModel):
    """Deep statistical metrics for a continuous or discrete numeric feature."""

    name: str
    dtype: str
    count: int
    null_count: int
    null_percentage: float
    unique_count: int
    mean: float | None = None
    std: float | None = None
    min: float | None = None
    max: float | None = None
    q25: float | None = None
    median: float | None = None
    q75: float | None = None
    skewness: float | None = None
    kurtosis: float | None = None
    outlier_count: int = 0
    outlier_percentage: float = 0.0
    histogram: list[HistogramBin] = Field(default_factory=list)
    is_constant: bool = False


class CategoricalColumnProfile(BaseModel):
    """Distribution metrics for a nominal, ordinal, or boolean feature."""

    name: str
    dtype: str
    count: int
    null_count: int
    null_percentage: float
    unique_count: int
    top_categories: list[CategoryFrequency] = Field(default_factory=list)
    is_high_cardinality: bool = False
    is_constant: bool = False


class DataQualityWarning(BaseModel):
    """Structured data quality issue identified by the deterministic rule engine."""

    severity: str = Field(..., description="Severity level: 'high', 'medium', or 'low'")
    code: str = Field(..., description="Deterministic machine-readable rule code")
    column: str | None = Field(default=None, description="Affected column name, or None if global")
    message: str = Field(..., description="Human-readable engineering description of the issue")


class HighCorrelationPair(BaseModel):
    """Identifies a pair of numeric features with absolute Pearson correlation >= 0.85."""

    feature_a: str
    feature_b: str
    correlation: float


class CorrelationMatrix(BaseModel):
    """Full pairwise Pearson correlation matrix for numeric features."""

    columns: list[str]
    values: list[list[float | None]]
    high_correlations: list[HighCorrelationPair] = Field(default_factory=list)


class DatasetProfileResponse(BaseModel):
    """Comprehensive dataset statistical profile and data quality assessment."""

    model_config = ConfigDict(from_attributes=True)

    project_id: str
    dataset_id: str
    total_rows: int
    total_columns: int
    duplicate_rows_count: int
    duplicate_rows_percentage: float
    quality_score: float = Field(..., description="Normalized health score between 0.0 and 100.0")
    warnings: list[DataQualityWarning] = Field(default_factory=list)
    numeric_columns: list[NumericColumnProfile] = Field(default_factory=list)
    categorical_columns: list[CategoricalColumnProfile] = Field(default_factory=list)
    correlation_matrix: CorrelationMatrix | None = None
    created_at: str
