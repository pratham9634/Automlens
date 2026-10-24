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
