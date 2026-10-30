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
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  Copy,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DatasetPreviewResponse, DatasetProfileResponse, Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DatasetUploadZone } from "@/components/dataset/dataset-upload-zone";
import { DatasetPreviewTable } from "@/components/dataset/dataset-preview-table";
import { StatisticalProfileView } from "@/components/dataset/statistical-profile-view";
import { TargetDecisionView } from "@/components/decision/target-decision-view";
import { TrainingDashboard } from "@/components/training/training-dashboard";
import { ModelLeaderboard } from "@/components/leaderboard/model-leaderboard";
import { PredictionView } from "@/components/predictions/prediction-view";
import { ExplanationView } from "@/components/explanations/explanation-view";
import { AuditLedger } from "@/components/audit/audit-ledger";
import { ExportView } from "@/components/exports/export-view";

const pipelineSteps = [
  {
    step: 1,
    id: "dataset",
    title: "1. Data & Health",
    subtitle: "Ingestion, preview & profiling",
    icon: Database,
  },
  {
    step: 2,
    id: "target",
    title: "2. AI Strategy",
    subtitle: "Target column & zero-leakage plan",
    icon: Sliders,
  },
  {
    step: 3,
    id: "training",
    title: "3. Training & Leaderboard",
    subtitle: "Parallel 5-fold CV & benchmarks",
    icon: Cpu,
  },
  {
    step: 4,
    id: "predict",
    title: "4. Inference & What-If",
    subtitle: "Predictions & live scenarios",
    icon: FileSpreadsheet,
  },
  {
    step: 5,
    id: "exports",
    title: "5. Governance & Viva",
    subtitle: "Audit ledger & defense summary",
    icon: GraduationCap,
  },
];

const secondaryTabs = [
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3 },
  { id: "explanations", label: "SHAP Explainability", icon: Sparkles },
  { id: "audit", label: "Audit Ledger", icon: History },
];

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreviewResponse | null>(null);
  const [profile, setProfile] = useState<DatasetProfileResponse | null>(null);
  const [datasetSubTab, setDatasetSubTab] = useState<"preview" | "profile">("preview");
  const [profilingLoading, setProfilingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dataset");
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [selectedPredictModelId, setSelectedPredictModelId] = useState<string | null>(null);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectData = await apiClient.getProject(projectId);
      setProject(projectData);

      // Fetch dataset if already uploaded
      try {
        const datasetData = await apiClient.getDataset(projectId);
        setDatasetPreview(datasetData);

        // Fetch profile if already generated
        try {
          const profileData = await apiClient.getProfile(projectId);
          setProfile(profileData);
        } catch (pErr) {
          if (pErr instanceof ApiClientError && pErr.status === 404) {
            setProfile(null);
          }
        }
      } catch (dsErr) {
        if (dsErr instanceof ApiClientError && dsErr.status === 404) {
          setDatasetPreview(null);
          setProfile(null);
        } else {
          console.error("Error fetching dataset preview:", dsErr);
        }
      }
    } catch {
      setError(`Failed to load workspace for ID: ${projectId}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchWorkspaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleGenerateProfile = async () => {
    if (!project) return;
    setProfilingLoading(true);
    try {
      const profileData = await apiClient.generateProfile(project.id);
      setProfile(profileData);
      setProject((prev) => (prev ? { ...prev, status: "profiled" } : null));
      setDatasetSubTab("profile");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to run statistical profiling."
      );
    } finally {
      setProfilingLoading(false);
    }
  };

  const handleResetRun = async () => {
    if (!project) return;
    if (
      !window.confirm(
        `Are you sure you want to reset training runs and target configuration for "${project.name}"?\n\nThe uploaded dataset will be preserved.`
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      const updated = await apiClient.resetProject(project.id);
      setProject(updated);
      setActiveTab("dataset");
      alert("Workspace training runs reset successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset workspace");
    } finally {
      setResetting(false);
    }
  };

  const handleCloneProject = async () => {
    if (!project) return;
    const newName = window.prompt(
      `Enter name for the cloned workspace:`,
      `${project.name} (Clone)`
    );
    if (!newName || !newName.trim()) return;

    setCloning(true);
    try {
      const cloned = await apiClient.cloneProject(project.id, newName.trim());
      router.push(`/projects/${cloned.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clone workspace");
      setCloning(false);
    }
  };

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

  // Calculate readiness of each step
  const isTargetReady = Boolean(datasetPreview);
  const isTrainingReady = ["target_confirmed", "trained", "completed"].includes(project.status);
  const isResultsReady = ["trained", "completed"].includes(project.status);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Navigation & Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspaces</span>
        </Link>

        {/* Header Action Suite: Clone, Reset, Delete, Viva Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("exports")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-lavender/30 bg-brand-lavender/10 hover:bg-brand-lavender/20 text-xs font-mono text-brand-hover transition-colors"
            title="Jump to Viva Defense Report"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Viva Summary</span>
          </button>

          <button
            onClick={handleCloneProject}
            disabled={cloning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-mono text-ink transition-colors"
            title="Clone this workspace configuration and dataset"
          >
            {cloning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-ink-muted" />
            )}
            <span>Clone</span>
          </button>

          {isTrainingReady && (
            <button
              onClick={handleResetRun}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-mono text-ink transition-colors"
              title="Reset training models while keeping dataset"
            >
              {resetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-telemetry-amber" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-telemetry-amber" />
              )}
              <span>Reset Run</span>
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 hover:bg-telemetry-rose/20 text-xs font-mono text-telemetry-rose transition-colors"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Project Banner Header */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
              {project.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
              {project.status}
            </span>
          </div>
          <p className="text-xs text-ink-muted max-w-2xl leading-relaxed">
            {project.description || "Human-assisted tabular AutoML pipeline with zero-leakage isolation and SHAP explainability."}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-ink-subtle pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Created {formatDate(project.created_at)}
            </span>
            <span>•</span>
            <span className="truncate">ID: {project.id}</span>
          </div>
        </div>
      </div>

      {/* 5-Stage Guided Pipeline Progress Stepper */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            const isCurrent =
              (step.id === "dataset" && activeTab === "dataset") ||
              (step.id === "target" && activeTab === "target") ||
              (step.id === "training" && (activeTab === "training" || activeTab === "leaderboard")) ||
              (step.id === "predict" && (activeTab === "predict" || activeTab === "explanations")) ||
              (step.id === "exports" && (activeTab === "exports" || activeTab === "audit"));

            const isAccessible =
              step.id === "dataset" ||
              step.id === "exports" ||
              (step.id === "target" && isTargetReady) ||
              (step.id === "training" && isTrainingReady) ||
              (step.id === "predict" && isResultsReady);

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isAccessible) {
                    setActiveTab(step.id);
                  }
                }}
                disabled={!isAccessible}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-surface-2 border-brand-lavender/50 shadow-[0_0_15px_rgba(99,102,241,0.12)]"
                    : isAccessible
                    ? "bg-surface-1/60 hover:bg-surface-2/80 border-hairline cursor-pointer"
                    : "bg-surface-1/30 border-hairline/40 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`p-1.5 rounded-lg border ${
                      isCurrent
                        ? "bg-brand-lavender/20 border-brand-lavender/40 text-brand-hover"
                        : "bg-surface-2 border-hairline text-ink-muted"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-brand-lavender animate-pulse" />
                  )}
                </div>
                <div>
                  <div
                    className={`text-xs font-semibold tracking-tight ${
                      isCurrent ? "text-brand-hover" : "text-ink"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[10px] text-ink-subtle truncate mt-0.5">
                    {step.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Sub-Tabs for Fast Access */}
        <div className="flex items-center gap-1 border-b border-hairline overflow-x-auto pb-px text-xs font-mono">
          <button
            onClick={() => setActiveTab("dataset")}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "dataset"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Dataset &amp; Quality
          </button>
          <button
            onClick={() => setActiveTab("target")}
            disabled={!isTargetReady}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "target"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : isTargetReady
                ? "border-transparent text-ink-muted hover:text-ink"
                : "border-transparent text-ink-faint cursor-not-allowed opacity-40"
            }`}
          >
            Target &amp; Decision
          </button>
          <button
            onClick={() => setActiveTab("training")}
            disabled={!isTrainingReady}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "training"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : isTrainingReady
                ? "border-transparent text-ink-muted hover:text-ink"
                : "border-transparent text-ink-faint cursor-not-allowed opacity-40"
            }`}
          >
            Training Monitor
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            disabled={!isResultsReady}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "leaderboard"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : isResultsReady
                ? "border-transparent text-ink-muted hover:text-ink"
                : "border-transparent text-ink-faint cursor-not-allowed opacity-40"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("predict")}
            disabled={!isResultsReady}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "predict"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : isResultsReady
                ? "border-transparent text-ink-muted hover:text-ink"
                : "border-transparent text-ink-faint cursor-not-allowed opacity-40"
            }`}
          >
            Predict &amp; What-If
          </button>
          <button
            onClick={() => setActiveTab("explanations")}
            disabled={!isResultsReady}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "explanations"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : isResultsReady
                ? "border-transparent text-ink-muted hover:text-ink"
                : "border-transparent text-ink-faint cursor-not-allowed opacity-40"
            }`}
          >
            SHAP Explainability
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "audit"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Audit Ledger
          </button>
          <button
            onClick={() => setActiveTab("exports")}
            className={`px-3 py-1.5 border-b-2 transition-colors ${
              activeTab === "exports"
                ? "border-cyan-400 text-cyan-400 font-semibold shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Viva &amp; Exports
          </button>
        </div>
      </div>

      {/* Active Tab Workspace Content */}
      {activeTab === "dataset" && (
        <div className="space-y-6">
          {datasetPreview ? (
            <div className="space-y-6">
              {/* Dataset Sub-Tab Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDatasetSubTab("preview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      datasetSubTab === "preview"
                        ? "bg-surface-2 text-ink font-semibold border border-hairline"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    Raw Data Preview
                  </button>
                  <button
                    onClick={() => setDatasetSubTab("profile")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      datasetSubTab === "profile"
                        ? "bg-surface-2 text-ink font-semibold border border-hairline"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span>Statistical Profile</span>
                    {profile ? (
                      <span className="w-2 h-2 rounded-full bg-telemetry-emerald" />
                    ) : (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-surface-3 text-brand-hover">
                        New
                      </span>
                    )}
                  </button>
                </div>

                {!profile && datasetSubTab === "preview" && (
                  <button
                    onClick={handleGenerateProfile}
                    disabled={profilingLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {profilingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Run Statistical Profiling</span>
                  </button>
                )}
              </div>

              {/* Sub-tab 1: Raw Preview */}
              {datasetSubTab === "preview" && (
                <DatasetPreviewTable
                  projectId={project.id}
                  data={datasetPreview}
                  onDeleteSuccess={() => {
                    setDatasetPreview(null);
                    setProfile(null);
                    setProject((prev) =>
                      prev ? { ...prev, status: "created" } : null
                    );
                  }}
                />
              )}

              {/* Sub-tab 2: Deep Statistical Profile */}
              {datasetSubTab === "profile" && (
                <div>
                  {profile ? (
                    <StatisticalProfileView
                      projectId={project.id}
                      initialProfile={profile}
                      onProfileUpdated={(p) => setProfile(p)}
                    />
                  ) : (
                    <div className="p-12 rounded-xl border border-dashed border-hairline-strong bg-surface-1/60 text-center flex flex-col items-center justify-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-brand-lavender/30 flex items-center justify-center text-brand-hover">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h3 className="text-sm font-semibold text-ink">
                          Compute Statistical Profile &amp; Quality Engine
                        </h3>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          Analyze univariate distributions, IQR outlier boundaries,
                          missing value distributions, and pairwise Pearson correlations across all continuous features.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateProfile}
                        disabled={profilingLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-md disabled:opacity-50"
                      >
                        {profilingLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>
                          {profilingLoading
                            ? "Computing Statistics & Correlations..."
                            : "Run Statistical Profiling"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <DatasetUploadZone
              projectId={project.id}
              onUploadSuccess={(data) => {
                setDatasetPreview(data);
                setProject((prev) =>
                  prev ? { ...prev, status: "dataset_uploaded" } : null
                );
              }}
            />
          )}
        </div>
      )}

      {/* Active Tab: AI Target & Decision Engine */}
      {activeTab === "target" && (
        <TargetDecisionView
          projectId={project.id}
          onTargetConfirmed={() => {
            setProject((prev) =>
              prev ? { ...prev, status: "target_confirmed" } : null
            );
          }}
          onNavigateToTraining={() => {
            setActiveTab("training");
          }}
        />
      )}

      {/* Active Tab: Parallel Multi-Model Training */}
      {activeTab === "training" && (
        <TrainingDashboard
          projectId={project.id}
          onTrainingCompleted={() => {
            setProject((prev) =>
              prev ? { ...prev, status: "trained" } : null
            );
          }}
          onNavigateToLeaderboard={() => {
            setActiveTab("leaderboard");
          }}
        />
      )}

      {/* Active Tab: Model Leaderboard & Inspector */}
      {activeTab === "leaderboard" && (
        <ModelLeaderboard
          projectId={project.id}
          onNavigateToPredict={(modelId) => {
            setSelectedPredictModelId(modelId);
            setActiveTab("predict");
          }}
          onNavigateToTraining={() => {
            setActiveTab("training");
          }}
        />
      )}

      {/* Active Tab: Single, Batch & What-If Predictions */}
      {activeTab === "predict" && (
        <PredictionView
          projectId={project.id}
          initialSelectedModelId={selectedPredictModelId}
          onNavigateToTraining={() => {
            setActiveTab("training");
          }}
        />
      )}

      {/* Active Tab: SHAP Model Interpretability */}
      {activeTab === "explanations" && (
        <ExplanationView
          projectId={project.id}
          onNavigateToTraining={() => {
            setActiveTab("training");
          }}
        />
      )}

      {/* Active Tab: Immutable Audit Ledger (Phase 9) */}
      {activeTab === "audit" && (
        <AuditLedger projectId={project.id} />
      )}

      {/* Active Tab: Artifact Export Hub & Viva Executive Summary */}
      {activeTab === "exports" && (
        <ExportView projectId={project.id} projectName={project.name} />
      )}
    </div>
  );
}
