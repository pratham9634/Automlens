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

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
