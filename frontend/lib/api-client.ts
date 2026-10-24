import {
  DatasetPreviewResponse,
  DatasetProfileResponse,
  Project,
  SystemHealth,
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
};
