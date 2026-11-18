import {
  BatchPredictionResponse,
  ChatMessage,
  ChatSuggestion,
  ConfirmedTargetResponse,
  ConfirmTargetRequest,
  ConfusionMatrixResponse,
  CounterfactualResponse,
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

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

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

  // Attach client-side BYOK Gemini API key if present in storage
  if (typeof window !== "undefined") {
    const geminiKey = localStorage.getItem("automlens_gemini_key");
    if (geminiKey) {
      headers["X-Gemini-API-Key"] = geminiKey;
    }
  }

  // Attach Clerk Auth Bearer token if session exists
  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignore token retrieval failure in public routes
    }
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
  // System Health & Engine Status
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

  resetProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}/reset`, {
      method: "POST",
    }),

  cloneProject: (projectId: string, newName?: string) =>
    request<Project>(
      `/projects/${projectId}/clone${newName ? `?new_name=${encodeURIComponent(newName)}` : ""}`,
      {
        method: "POST",
      }
    ),

  // Datasets
  uploadDataset: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<DatasetPreviewResponse>(`/projects/${projectId}/dataset/upload`, {
      method: "POST",
      body: formData,
    });
  },

  loadDemoDataset: (projectId: string, sampleName: string) =>
    request<DatasetPreviewResponse>(`/projects/${projectId}/dataset/demo/${sampleName}`, {
      method: "POST",
    }),

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
    data: { target_column: string; override_task_type?: TaskType | null; user_objective?: string | null }
  ) =>
    request<DecisionEngineResponse>(`/projects/${projectId}/decision`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  streamDecisions: async (
    projectId: string,
    data: { target_column: string; override_task_type?: TaskType | null; user_objective?: string | null },
    callbacks: {
      onStatus?: (statusData: { status: string; provider?: string }) => void;
      onToken: (token: string) => void;
      onNotice?: (notice: string) => void;
      onReasoningCompleted?: (text: string) => void;
      onPipelineReady: (response: DecisionEngineResponse) => void;
      onError: (err: string) => void;
    }
  ): Promise<void> => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (typeof window !== "undefined") {
        const key = localStorage.getItem("automlens_gemini_api_key");
        if (key && key.trim()) {
          headers["X-Gemini-API-Key"] = key.trim();
        }
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/decision/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body available for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;

          let eventName = "message";
          let dataStr = "";

          for (const line of eventBlock.split("\n")) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (eventName === "status" && callbacks.onStatus) {
              callbacks.onStatus(parsed);
            } else if (eventName === "token") {
              callbacks.onToken(parsed.token || "");
            } else if (eventName === "notice" && callbacks.onNotice) {
              callbacks.onNotice(parsed.message || "");
            } else if (eventName === "reasoning_completed" && callbacks.onReasoningCompleted) {
              callbacks.onReasoningCompleted(parsed.text || "");
            } else if (eventName === "pipeline_ready") {
              callbacks.onPipelineReady(parsed as DecisionEngineResponse);
            } else if (eventName === "error") {
              callbacks.onError(parsed.error || "Unknown stream error");
            }
          } catch (e) {
            console.warn("Failed to parse SSE line:", dataStr, e);
          }
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  },

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

  getCounterfactual: (
    projectId: string,
    modelId: string,
    data: {
      inputs: Record<string, unknown>;
      desired_outcome?: unknown;
      features_to_vary?: string[];
    }
  ) =>
    request<CounterfactualResponse>(
      `/projects/${projectId}/models/${modelId}/counterfactual`,
      {
        method: "POST",
        body: JSON.stringify(data),
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

  // Tabular AI Analyst Methods (Phase 3)
  getChatSuggestions: (projectId: string) =>
    request<ChatSuggestion[]>(`/projects/${projectId}/chat/suggestions`),

  streamChat: async (
    projectId: string,
    message: string,
    history: ChatMessage[],
    callbacks: {
      onChunk: (text: string) => void;
      onDone: () => void;
      onError: (err: string) => void;
    }
  ): Promise<() => void> => {
    const controller = new AbortController();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (tokenProvider) {
        const token = await tokenProvider();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      if (typeof window !== "undefined") {
        const geminiKey = localStorage.getItem("automlens_gemini_key");
        if (geminiKey && geminiKey.trim()) {
          headers["X-Gemini-API-Key"] = geminiKey.trim();
        }
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body available for chat streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataPart = trimmed.slice(6).trim();
                if (dataPart === "[DONE]") {
                  callbacks.onDone();
                  return;
                }
                try {
                  const parsed = JSON.parse(dataPart);
                  if (parsed.text) {
                    callbacks.onChunk(parsed.text);
                  }
                } catch {
                  callbacks.onChunk(dataPart);
                }
              }
            }
          }
          callbacks.onDone();
        } catch (err: any) {
          if (err.name !== "AbortError") {
            callbacks.onError(err.message || "Stream read error");
          }
        }
      })();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        callbacks.onError(err.message || "Failed to initiate chat stream");
      }
    }

    return () => controller.abort();
  },
};
