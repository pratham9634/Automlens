/** Shared TypeScript Types matching FastAPI schemas */

export interface SystemHealth {
  status: "ok" | "error";
  version: string;
  environment: string;
  database: {
    status: "connected" | "unreachable";
    dialect?: string;
    error?: string;
  };
  workers: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "created" | "dataset_uploaded" | "profiled" | "target_confirmed" | "trained" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ColumnInfo {
  name: string;
  dtype: "numeric" | "categorical" | "datetime" | "boolean" | "text" | string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
}

export interface Dataset {
  id: string;
  project_id: string;
  filename: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  sha256_hash: string;
  columns: ColumnInfo[];
  created_at: string;
}

export interface DatasetPreviewResponse {
  dataset: Dataset;
  preview_rows: Record<string, string | number | boolean | null>[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface CategoryFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface NumericColumnProfile {
  name: string;
  dtype: string;
  count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  max?: number | null;
  q25?: number | null;
  median?: number | null;
  q75?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  outlier_count: number;
  outlier_percentage: number;
  histogram: HistogramBin[];
  is_constant: boolean;
}

export interface CategoricalColumnProfile {
  name: string;
  dtype: string;
  count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  top_categories: CategoryFrequency[];
  is_high_cardinality: boolean;
  is_constant: boolean;
}

export interface DataQualityWarning {
  severity: "high" | "medium" | "low";
  code: string;
  column?: string | null;
  message: string;
}

export interface HighCorrelationPair {
  feature_a: string;
  feature_b: string;
  correlation: number;
}

export interface CorrelationMatrix {
  columns: string[];
  values: (number | null)[][];
  high_correlations: HighCorrelationPair[];
}

export interface DatasetProfileResponse {
  project_id: string;
  dataset_id: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows_count: number;
  duplicate_rows_percentage: number;
  quality_score: number;
  warnings: DataQualityWarning[];
  numeric_columns: NumericColumnProfile[];
  categorical_columns: CategoricalColumnProfile[];
  correlation_matrix?: CorrelationMatrix | null;
  created_at: string;
}

// Decision Engine & Target Selection Types

export type TaskType = "binary_classification" | "multiclass_classification" | "regression";

export interface ClassDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface TargetSuggestionItem {
  name: string;
  dtype: string;
  inferred_task: TaskType;
  confidence: number;
  distinct_count: number;
  null_percentage: number;
  is_recommended: boolean;
  reason: string;
}

export interface TargetSuggestResponse {
  recommended_target: string | null;
  suggestions: TargetSuggestionItem[];
}

export interface TargetAnalysisDetailResponse {
  target_column: string;
  task_type: TaskType;
  is_overridden: boolean;
  distinct_count: number;
  null_count: number;
  null_percentage: number;
  classes: ClassDistributionItem[];
  summary_stats: Record<string, number>;
  reason: string;
}

export interface ModelCandidate {
  id: string;
  name: string;
  is_baseline: boolean;
  description: string;
  default_selected: boolean;
}

export interface PreprocessingStep {
  column: string;
  step_type: "imputation" | "scaling" | "encoding" | "drop" | string;
  strategy: string;
  reason: string;
}

export interface DecisionEngineResponse {
  target_column: string;
  task_type: TaskType;
  primary_metric: string;
  available_metrics: string[];
  preprocessing_steps: PreprocessingStep[];
  candidate_models: ModelCandidate[];
  engineering_rationale: string;
  is_llm_enriched: boolean;
}

export interface ConfirmTargetRequest {
  target_column: string;
  task_type: TaskType;
  selected_models: string[];
  primary_metric: string;
}

export interface ConfirmedTargetResponse {
  project_id: string;
  target_column: string;
  task_type: TaskType;
  selected_models: string[];
  primary_metric: string;
  status: string;
  confirmed_at: string;
}

// Training & Parallel Execution Types

export interface MetricAggregation {
  mean: number;
  std: number;
  folds: number[];
}

export interface ModelRun {
  id: string;
  run_id: string;
  model_id: string;
  model_name: string;
  is_baseline: boolean;
  status: "queued" | "training" | "completed" | "failed";
  primary_metric_name: string;
  primary_metric_score?: number | null;
  primary_metric_std?: number | null;
  all_metrics?: Record<string, MetricAggregation> | null;
  train_time_seconds?: number | null;
  artifact_path?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface TrainingRun {
  id: string;
  project_id: string;
  target_column: string;
  task_type: TaskType;
  primary_metric: string;
  status: "pending" | "running" | "completed" | "failed";
  total_models: number;
  completed_models: number;
  best_model_id?: string | null;
  best_score?: number | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  model_runs: ModelRun[];
}

export interface StartTrainingResponse {
  run_id: string;
  project_id: string;
  status: string;
  total_models: number;
  primary_metric: string;
  stream_url: string;
  message: string;
}
