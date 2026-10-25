import {
  BatchPredictionResponse,
  ConfirmedTargetResponse,
  ConfirmTargetRequest,
  ConfusionMatrixResponse,
  DatasetPreviewResponse,
  DatasetProfileResponse,
  DecisionEngineResponse,
  AuditTimelineResponse,
  ExportStatusResponse,
  GlobalExplanationResponse,
  LocalExplanationResponse,
  ModelDetailResponse,
  Project,
  SinglePredictionResponse,
  StartTrainingResponse,
  SystemHealth,
  TargetAnalysisDetailResponse,
  TargetSuggestResponse,
  TaskType,
  TrainingRun,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "API_ERROR", status = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Do not set Content-Type for FormData so browser sets multi-part boundary automatically
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { message: response.statusText, code: "HTTP_ERROR" } };
      }
      throw new ApiClientError(
        errorData.error?.message || "An unexpected error occurred",
        errorData.error?.code || "HTTP_ERROR",
        response.status
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : "Network failure connecting to backend",
      "NETWORK_ERROR",
      0
    );
  }
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

export const apiClient = {
  // System Telemetry
  getHealth: () => request<SystemHealth>("/health"),

  // Projects CRUD
  listProjects: (skip = 0, limit = 50) =>
    request<ProjectListResponse>(`/projects?skip=${skip}&limit=${limit}`),

  getProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}`),

  createProject: (data: { name: string; description?: string }) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProject: (projectId: string, data: { name?: string; description?: string }) =>
    request<Project>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteProject: (projectId: string) =>
    request<void>(`/projects/${projectId}`, {
      method: "DELETE",
    }),

  // Datasets
  uploadDataset: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<DatasetPreviewResponse>(`/projects/${projectId}/dataset/upload`, {
      method: "POST",
      body: formData,
    });
  },

  getDataset: (projectId: string) =>
    request<DatasetPreviewResponse>(`/projects/${projectId}/dataset`),

  deleteDataset: (projectId: string) =>
    request<void>(`/projects/${projectId}/dataset`, {
      method: "DELETE",
    }),

  // Statistical Profiling
  generateProfile: (projectId: string) =>
    request<DatasetProfileResponse>(`/projects/${projectId}/profile`, {
      method: "POST",
    }),

  getProfile: (projectId: string) =>
    request<DatasetProfileResponse>(`/projects/${projectId}/profile`),

  // Decision Engine & Target Selection
  suggestTargets: (projectId: string) =>
    request<TargetSuggestResponse>(`/projects/${projectId}/target/suggest`),

  analyzeTarget: (
    projectId: string,
    data: { target_column: string; override_task_type?: TaskType | null }
  ) =>
    request<TargetAnalysisDetailResponse>(`/projects/${projectId}/target/analyze`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  formulateDecisions: (
    projectId: string,
    data: { target_column: string; override_task_type?: TaskType | null }
  ) =>
    request<DecisionEngineResponse>(`/projects/${projectId}/decision`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmTarget: (projectId: string, data: ConfirmTargetRequest) =>
    request<ConfirmedTargetResponse>(`/projects/${projectId}/target/confirm`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConfirmedTarget: (projectId: string) =>
    request<ConfirmedTargetResponse>(`/projects/${projectId}/target/confirm`),

  // Parallel Training & SSE Streaming
  startTraining: (projectId: string) =>
    request<StartTrainingResponse>(`/projects/${projectId}/training/start`, {
      method: "POST",
    }),

  listTrainingRuns: (projectId: string) =>
    request<TrainingRun[]>(`/projects/${projectId}/runs`),

  getTrainingRun: (runId: string) =>
    request<TrainingRun>(`/runs/${runId}`),

  getTrainingStreamUrl: (runId: string) =>
    `${API_BASE_URL}/training/${runId}/stream`,

  // Inference, Predictions & Model Diagnostics (Phase 6)
  predictSingle: (
    projectId: string,
    modelId: string,
    inputs: Record<string, unknown>
  ) =>
    request<SinglePredictionResponse>(
      `/projects/${projectId}/models/${modelId}/predict/single`,
      {
        method: "POST",
        body: JSON.stringify({ inputs }),
      }
    ),

  predictBatch: (projectId: string, modelId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<BatchPredictionResponse>(
      `/projects/${projectId}/models/${modelId}/predict/batch`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  getConfusionMatrix: (projectId: string, modelId: string) =>
    request<ConfusionMatrixResponse>(
      `/projects/${projectId}/models/${modelId}/confusion-matrix`
    ),

  getModelDetails: (projectId: string, modelId: string) =>
    request<ModelDetailResponse>(
      `/projects/${projectId}/models/${modelId}/details`
    ),

  getModelDownloadUrl: (projectId: string, modelId: string) =>
    `${API_BASE_URL}/projects/${projectId}/models/${modelId}/download`,

  getGlobalExplanation: (projectId: string, modelId: string) =>
    request<GlobalExplanationResponse>(
      `/projects/${projectId}/models/${modelId}/explanations/global`
    ),

  getLocalExplanation: (
    projectId: string,
    modelId: string,
    inputs: Record<string, unknown>
  ) =>
    request<LocalExplanationResponse>(
      `/projects/${projectId}/models/${modelId}/explanations/local`,
      {
        method: "POST",
        body: JSON.stringify({ inputs }),
      }
    ),

  // Phase 9: Audit Ledger & Export Methods
  getAuditTimeline: (
    projectId: string,
    params?: { skip?: number; limit?: number; action?: string; result?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append("skip", String(params.skip));
    if (params?.limit !== undefined) searchParams.append("limit", String(params.limit));
    if (params?.action) searchParams.append("action", params.action);
    if (params?.result) searchParams.append("result", params.result);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<AuditTimelineResponse>(`/projects/${projectId}/audit${query}`);
  },

  getExportStatus: (projectId: string) =>
    request<ExportStatusResponse>(`/projects/${projectId}/exports`),

  getExportDownloadUrl: (projectId: string, exportType: string) =>
    `${API_BASE_URL}/projects/${projectId}/exports/${exportType}`,
};
