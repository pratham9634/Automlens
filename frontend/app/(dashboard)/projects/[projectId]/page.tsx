"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  FileText,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DatasetPreviewResponse, DatasetProfileResponse, Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AnalystTrigger } from "@/components/analyst/analyst-trigger";

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
    title: "5. Reports & Exports",
    subtitle: "Audit ledger & executive report",
    icon: HardDriveDownload,
  },
];

const secondaryTabs = [
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3 },
  { id: "explanations", label: "SHAP Explainability", icon: Sparkles },
  { id: "audit", label: "Audit Ledger", icon: History },
];

const VALID_TABS = new Set([
  "dataset",
  "target",
  "training",
  "leaderboard",
  "predict",
  "explanations",
  "audit",
  "exports",
]);

function TabParamSync({
  onSyncTab,
}: {
  onSyncTab: (tab: string) => void;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");

  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam)) {
      onSyncTab(tabParam);
    }
  }, [tabParam, onSyncTab]);

  return null;
}

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
  const selectTab = useCallback(
    (nextTab: string) => {
      if (!VALID_TABS.has(nextTab)) return;
      setActiveTab(nextTab);
      if (projectId) {
        router.replace(`/projects/${projectId}?tab=${nextTab}`, { scroll: false });
      }
    },
    [projectId, router]
  );
  const syncTabFromUrl = useCallback((tabFromUrl: string) => {
    setActiveTab((prev) => (prev === tabFromUrl ? prev : tabFromUrl));
  }, []);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [selectedPredictModelId, setSelectedPredictModelId] = useState<string | null>(null);

  // Modal dialog states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneError, setCloneError] = useState<string | null>(null);

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
      console.error("Profiling error:", err);
    } finally {
      setProfilingLoading(false);
    }
  };

  const handleResetRunConfirm = async () => {
    if (!project) return;
    setResetting(true);
    setResetError(null);
    try {
      const updated = await apiClient.resetProject(project.id);
      setProject(updated);
      selectTab("dataset");
      setShowResetModal(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset workspace");
    } finally {
      setResetting(false);
    }
  };

  const handleOpenCloneModal = () => {
    if (!project) return;
    setCloneName(`${project.name} (Clone)`);
    setCloneError(null);
    setShowCloneModal(true);
  };

  const handleCloneConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !cloneName.trim()) return;

    setCloning(true);
    setCloneError(null);
    try {
      const cloned = await apiClient.cloneProject(project.id, cloneName.trim());
      setShowCloneModal(false);
      router.push(`/projects/${cloned.id}`);
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Failed to clone workspace");
    } finally {
      setCloning(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!project) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteProject(project.id);
      setShowDeleteModal(false);
      router.push("/dashboard");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete project. Please check backend connection."
      );
    } finally {
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
          href="/dashboard"
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
    <div className="max-w-7xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <TabParamSync onSyncTab={syncTabFromUrl} />
      </Suspense>

      {/* Top Navigation & Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspaces</span>
        </Link>

        {/* Header Action Suite: Clone, Reset, Delete, Executive Report */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => selectTab("exports")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-border bg-yellow-200 dark:bg-yellow-900/60 hover:bg-yellow-300 dark:hover:bg-yellow-800/80 text-xs font-mono font-bold text-slate-950 dark:text-yellow-200 shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            title="Jump to Executive Report & Exports"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Report</span>
          </button>

          <button
            onClick={handleOpenCloneModal}
            disabled={cloning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-border bg-surface hover:bg-surface-subtle text-xs font-mono font-bold text-text-primary shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            title="Clone this workspace configuration and dataset"
          >
            <Copy className="w-3.5 h-3.5 text-text-muted" />
            <span>Clone</span>
          </button>

          {isTrainingReady && (
            <button
              onClick={() => {
                setResetError(null);
                setShowResetModal(true);
              }}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-border bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              title="Reset training models while keeping dataset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Run</span>
            </button>
          )}

          <button
            onClick={() => {
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-border bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-xs font-mono font-bold text-rose-900 dark:text-rose-200 shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            title="Delete this workspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Project Banner Header */}
      <div className="p-5 sm:p-6 rounded-card border-2 border-border bg-surface shadow-neo flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-semibold font-display text-text-primary tracking-tight">
              {project.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-marker font-bold uppercase bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-2 border-border shadow-[2px_2px_0px_0px_var(--neo-shadow-color)]">
              ★ {project.status}
            </span>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed font-medium">
            {project.description || "Human-assisted tabular AutoML pipeline with zero-leakage isolation and SHAP explainability."}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-text-muted pt-1">
            <span className="flex items-center gap-1.5 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              Created {formatDate(project.created_at)}
            </span>
            <span>•</span>
            <span className="truncate">ID: {project.id}</span>
          </div>
        </div>
      </div>

      {/* 5-Stage Guided Pipeline Progress Stepper */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
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

            const isCompleted =
              (step.id === "dataset" && isTargetReady) ||
              (step.id === "target" && isTrainingReady) ||
              (step.id === "training" && isResultsReady) ||
              (step.id === "predict" && isResultsReady);

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isAccessible) {
                    selectTab(step.id);
                  }
                }}
                disabled={!isAccessible}
                className={`p-3.5 rounded-card border-2 border-border text-left transition-all duration-150 flex flex-col justify-between ${
                  isCurrent
                    ? "bg-sky-100 dark:bg-sky-950/80 shadow-neo -translate-x-0.5 -translate-y-0.5 font-bold text-text-primary"
                    : isAccessible
                    ? "bg-surface shadow-neo-sm hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                    : "bg-surface-subtle opacity-50 cursor-not-allowed shadow-none"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`p-1.5 rounded-md border-2 border-border ${
                      isCurrent
                        ? "bg-surface text-accent shadow-[2px_2px_0px_0px_var(--neo-shadow-color)]"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-success"
                        : "bg-surface-subtle text-text-muted"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : null}
                </div>
                <div>
                  <div
                    className={`text-xs font-bold tracking-tight ${
                      isCurrent ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[10px] text-text-muted truncate mt-0.5 font-medium">
                    {step.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Sub-Tabs for Fast Access */}
        <div className="flex items-center gap-1 border-b-2 border-border overflow-x-auto pb-px text-xs font-mono font-bold">
          <button
            onClick={() => selectTab("dataset")}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "dataset"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
            }`}
          >
            Dataset &amp; Quality
          </button>
          <button
            onClick={() => selectTab("target")}
            disabled={!isTargetReady}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "target"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : isTargetReady
                ? "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
                : "border-transparent text-text-subtle cursor-not-allowed opacity-40"
            }`}
          >
            Target &amp; Decision
          </button>
          <button
            onClick={() => selectTab("training")}
            disabled={!isTrainingReady}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "training"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : isTrainingReady
                ? "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
                : "border-transparent text-text-subtle cursor-not-allowed opacity-40"
            }`}
          >
            Training Monitor
          </button>
          <button
            onClick={() => selectTab("leaderboard")}
            disabled={!isResultsReady}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "leaderboard"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : isResultsReady
                ? "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
                : "border-transparent text-text-subtle cursor-not-allowed opacity-40"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => selectTab("predict")}
            disabled={!isResultsReady}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "predict"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : isResultsReady
                ? "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
                : "border-transparent text-text-subtle cursor-not-allowed opacity-40"
            }`}
          >
            Predict &amp; What-If
          </button>
          <button
            onClick={() => selectTab("explanations")}
            disabled={!isResultsReady}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "explanations"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : isResultsReady
                ? "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
                : "border-transparent text-text-subtle cursor-not-allowed opacity-40"
            }`}
          >
            SHAP Explainability
          </button>
          <button
            onClick={() => selectTab("audit")}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "audit"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
            }`}
          >
            Audit Ledger
          </button>
          <button
            onClick={() => selectTab("exports")}
            className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "exports"
                ? "border-accent text-accent font-black bg-surface-subtle/50"
                : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-subtle/30"
            }`}
          >
            Reports &amp; Exports
          </button>
        </div>
      </div>

      {/* Active Tab Workspace Content */}
      {activeTab === "dataset" && (
        <div className="space-y-6">
          {datasetPreview ? (
            <div className="space-y-6">
              {/* Dataset Sub-Tab Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDatasetSubTab("preview")}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                      datasetSubTab === "preview"
                        ? "bg-surface text-text-primary border-2 border-border shadow-neo-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Raw Data Preview
                  </button>
                  <button
                    onClick={() => setDatasetSubTab("profile")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                      datasetSubTab === "profile"
                        ? "bg-surface text-text-primary border-2 border-border shadow-neo-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <span>Statistical Profile</span>
                    {profile ? (
                      <span className="w-2 h-2 rounded-full bg-success" />
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-accent font-semibold border border-border">
                        New
                      </span>
                    )}
                  </button>
                </div>

                {!profile && datasetSubTab === "preview" && (
                  <button
                    onClick={handleGenerateProfile}
                    disabled={profilingLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-border bg-sky-200 dark:bg-sky-900/60 hover:bg-sky-300 dark:hover:bg-sky-800 text-slate-950 dark:text-sky-200 text-xs font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
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
                    <div className="p-10 rounded-card border-2 border-dashed border-border bg-surface text-center flex flex-col items-center justify-center space-y-4">
                      <div className="w-14 h-14 rounded-card border-2 border-border bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-accent shadow-neo-sm">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h3 className="text-sm font-bold text-text-primary">
                          Compute Statistical Profile &amp; Quality Engine
                        </h3>
                        <p className="text-xs text-text-muted leading-relaxed">
                          Analyze univariate distributions, IQR outlier boundaries,
                          missing value distributions, and pairwise Pearson correlations across continuous features.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateProfile}
                        disabled={profilingLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-border bg-sky-200 dark:bg-sky-900/60 hover:bg-sky-300 dark:hover:bg-sky-800 text-slate-950 dark:text-sky-200 text-xs font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
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

              {/* Bottom Workflow Progression Banner */}
              <div className="p-4 sm:p-5 rounded-card border-2 border-border bg-surface shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                    <h4 className="text-sm font-bold font-display text-text-primary">
                      Step 1 Complete: Dataset &amp; Health Verified
                    </h4>
                  </div>
                  <p className="text-xs text-text-muted">
                    {profile
                      ? `Data Quality Score: ${profile.quality_score.toFixed(1)}/100 • Ready to select target column and configure zero-leakage strategy.`
                      : `Raw tabular dataset loaded (${datasetPreview.dataset.row_count.toLocaleString()} rows × ${datasetPreview.dataset.column_count} features). Proceed to Step 2.`}
                  </p>
                </div>

                <button
                  onClick={() => selectTab("target")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-border bg-sky-200 dark:bg-sky-900/80 hover:bg-sky-300 dark:hover:bg-sky-800 text-slate-950 dark:text-sky-200 text-xs font-mono font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
                >
                  <span>Proceed to Step 2: AI Strategy &amp; Target</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
        <div key="target" className="am-panel-enter">
          <TargetDecisionView
            projectId={project.id}
            onTargetConfirmed={() => {
              setProject((prev) =>
                prev ? { ...prev, status: "target_confirmed" } : null
              );
            }}
            onNavigateToTraining={() => {
              selectTab("training");
            }}
          />
        </div>
      )}

      {/* Active Tab: Parallel Multi-Model Training */}
      {activeTab === "training" && (
        <div key="training" className="am-panel-enter">
          <TrainingDashboard
            projectId={project.id}
            onTrainingCompleted={() => {
              setProject((prev) =>
                prev ? { ...prev, status: "trained" } : null
              );
            }}
            onNavigateToLeaderboard={() => {
              selectTab("leaderboard");
            }}
          />
        </div>
      )}

      {/* Active Tab: Model Leaderboard & Inspector */}
      {activeTab === "leaderboard" && (
        <div key="leaderboard" className="am-panel-enter">
          <ModelLeaderboard
            projectId={project.id}
            onNavigateToPredict={(modelId) => {
              setSelectedPredictModelId(modelId);
              selectTab("predict");
            }}
            onNavigateToTraining={() => {
              selectTab("training");
            }}
          />
        </div>
      )}

      {/* Active Tab: Single, Batch & What-If Predictions */}
      {activeTab === "predict" && (
        <div key="predict" className="am-panel-enter">
          <PredictionView
            projectId={project.id}
            initialSelectedModelId={selectedPredictModelId}
            onNavigateToTraining={() => {
              selectTab("training");
            }}
          />
        </div>
      )}

      {/* Active Tab: SHAP Model Interpretability */}
      {activeTab === "explanations" && (
        <div key="explanations" className="am-panel-enter">
          <ExplanationView
            projectId={project.id}
            onNavigateToTraining={() => {
              selectTab("training");
            }}
          />
        </div>
      )}

      {/* Active Tab: Immutable Audit Ledger (Phase 9) */}
      {activeTab === "audit" && (
        <div key="audit" className="am-panel-enter">
          <AuditLedger projectId={project.id} />
        </div>
      )}

      {/* Active Tab: Artifact Export Hub & Executive Report */}
      {activeTab === "exports" && (
        <div key="exports" className="am-panel-enter">
          <ExportView projectId={project.id} projectName={project.name} />
        </div>
      )}

      {/* Floating Tabular AI Analyst Trigger & Drawer */}
      <AnalystTrigger projectId={project.id} projectName={project.name} />

      {/* Explicit Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!deleting) {
            setShowDeleteModal(open);
            if (!open) setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-danger mb-1">
              <div className="w-8 h-8 rounded-md bg-rose-100 dark:bg-rose-950/80 border-2 border-border shadow-neo-sm flex items-center justify-center text-danger shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <DialogTitle className="text-base font-bold text-text-primary">
                Delete Project Workspace
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-text-muted">
              Are you sure you want to delete <span className="font-bold text-text-primary">&quot;{project.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-text-secondary bg-surface-subtle border-2 border-border p-3.5 rounded-card leading-relaxed my-2 space-y-1.5">
            <p className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <span>⚠️ Permanent Action</span>
            </p>
            <p>
              This will permanently delete this workspace, including all uploaded dataset files, statistical profiles, model pipelines, 5-fold CV weights, predictions, and the immutable PostgreSQL audit ledger.
            </p>
          </div>

          {deleteError && (
            <div className="text-xs text-danger bg-danger/10 border-2 border-danger/30 p-2.5 rounded-md font-medium my-1">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteError(null);
              }}
              disabled={deleting}
              className="font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleting}
              className="gap-1.5 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Workspace</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Explicit Reset Confirmation Dialog */}
      <Dialog
        open={showResetModal}
        onOpenChange={(open) => {
          if (!resetting) {
            setShowResetModal(open);
            if (!open) setResetError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <div className="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-950/80 border-2 border-border shadow-neo-sm flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-text-primary">
                Reset Workspace Training Runs
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-text-muted">
              Reset model training runs and target configuration for <span className="font-bold text-text-primary">&quot;{project.name}&quot;</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-text-secondary bg-surface-subtle border-2 border-border p-3.5 rounded-card leading-relaxed my-2 space-y-1.5">
            <p className="font-bold text-emerald-700 dark:text-emerald-400">
              ✓ Ingested dataset &amp; profile will be preserved.
            </p>
            <p>
              Trained models, 5-fold cross-validation metrics, predictions, and SHAP explainability caches will be cleared so you can re-configure targets or re-train fresh candidate models.
            </p>
          </div>

          {resetError && (
            <div className="text-xs text-danger bg-danger/10 border-2 border-danger/30 p-2.5 rounded-md font-medium my-1">
              {resetError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowResetModal(false);
                setResetError(null);
              }}
              disabled={resetting}
              className="font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleResetRunConfirm}
              isLoading={resetting}
              className="gap-1.5 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Runs</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Explicit Clone Workspace Dialog */}
      <Dialog
        open={showCloneModal}
        onOpenChange={(open) => {
          if (!cloning) {
            setShowCloneModal(open);
            if (!open) setCloneError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md bg-sky-100 dark:bg-sky-950/80 border-2 border-border shadow-neo-sm flex items-center justify-center text-accent shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-text-primary">
                Clone Workspace
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-text-muted">
              Create a duplicate of <span className="font-bold text-text-primary">&quot;{project.name}&quot;</span> with the same dataset and configuration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCloneConfirm} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="clone-workspace-name" className="text-xs font-bold text-text-primary">
                New Workspace Name
              </label>
              <Input
                id="clone-workspace-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Workspace name..."
                required
                className="text-xs"
              />
            </div>

            {cloneError && (
              <div className="text-xs text-danger bg-danger/10 border-2 border-danger/30 p-2.5 rounded-md font-medium my-1">
                {cloneError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneError(null);
                }}
                disabled={cloning}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={cloning || !cloneName.trim()}
                isLoading={cloning}
                className="gap-1.5 font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clone Workspace</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
