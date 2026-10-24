"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Database,
  Sliders,
  Cpu,
  BarChart3,
  Sparkles,
  History,
  HardDriveDownload,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const projectTabs = [
  { id: "dataset", label: "Dataset & Quality", icon: Database, ready: false },
  { id: "target", label: "AI Target & Decision", icon: Sliders, ready: false },
  { id: "training", label: "Parallel Training", icon: Cpu, ready: false },
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3, ready: false },
  { id: "predict", label: "Predict", icon: FileSpreadsheet, ready: false },
  { id: "explanations", label: "SHAP Explainability", icon: Sparkles, ready: false },
  { id: "audit", label: "Audit Ledger", icon: History, ready: false },
  { id: "exports", label: "Exports", icon: HardDriveDownload, ready: false },
];

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dataset");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getProject(projectId);
        setProject(data);
      } catch {
        setError(`Failed to load workspace for ID: ${projectId}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Are you sure you want to delete workspace "${project.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      await apiClient.deleteProject(project.id);
      router.push("/");
    } catch {
      alert("Failed to delete project. Please check backend connection.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover" />
        <span className="text-xs font-mono text-ink-muted">Loading workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-telemetry-rose/10 border border-telemetry-rose/30 flex items-center justify-center text-telemetry-rose mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink">Project Not Found</h2>
          <p className="text-xs text-ink-muted">{error || "The requested workspace does not exist."}</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 border border-hairline text-xs font-medium text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspaces</span>
        </Link>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 hover:bg-telemetry-rose/20 text-xs text-telemetry-rose transition-colors"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>Delete Project</span>
        </button>
      </div>

      {/* Project Banner Header */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold text-ink tracking-tight">
              {project.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
              {project.status}
            </span>
          </div>
          <p className="text-xs text-ink-muted max-w-2xl">
            {project.description || "No project description provided."}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-ink-subtle pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Created {formatDate(project.created_at)}
            </span>
            <span>•</span>
            <span>ID: {project.id}</span>
          </div>
        </div>
      </div>

      {/* Project Navigation Stepper Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline overflow-x-auto pb-px">
        {projectTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? "border-brand-lavender text-brand-hover bg-surface-1/50"
                  : "border-transparent text-ink-muted hover:text-ink hover:border-hairline"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {!tab.ready && tab.id !== "dataset" && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-3 text-ink-faint">
                  Locked
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Workspace Content */}
      {activeTab === "dataset" && (
        <div className="space-y-6">
          {/* Phase 2 Preview: Dataset Upload Prompt */}
          <div className="rounded-xl border border-dashed border-hairline-strong bg-surface-1/50 p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-center text-brand-hover">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-sm font-semibold text-ink">
                Ready for Phase 2: Dataset Upload
              </h3>
              <p className="text-xs text-ink-muted">
                In Phase 2, you will upload CSV or Excel files with automatic schema validation,
                missing value detection, and SHA-256 fingerprinting.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink-subtle px-3 py-1.5 rounded-lg bg-surface-2 border border-hairline">
              <span>Next Phase: POST /api/v1/projects/{project.id}/dataset/upload</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
