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
  status: "created" | "dataset_uploaded" | "profiled" | "trained" | "completed";
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
