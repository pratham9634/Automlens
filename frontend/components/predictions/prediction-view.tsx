"use client";

import { useEffect, useState } from "react";
import {
  ColumnInfo,
  ConfirmedTargetResponse,
  DatasetPreviewResponse,
  ModelRun,
  TrainingRun,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { SinglePredictionForm } from "./single-prediction-form";
import { BatchPredictionZone } from "./batch-prediction-zone";
import { WhatIfSimulator } from "./what-if-simulator";
import {
  FileSpreadsheet,
  Play,
  UploadCloud,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  AlertCircle,
  Download,
  Award,
} from "lucide-react";

interface PredictionViewProps {
  projectId: string;
  initialSelectedModelId?: string | null;
  onNavigateToTraining?: () => void;
}

export function PredictionView({
  projectId,
  initialSelectedModelId,
  onNavigateToTraining,
}: PredictionViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datasetPreview, setDatasetPreview] = useState<DatasetPreviewResponse | null>(null);
  const [confirmedTarget, setConfirmedTarget] = useState<ConfirmedTargetResponse | null>(null);
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const [subTab, setSubTab] = useState<"single" | "batch" | "what-if">("single");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const [dsData, targetData, runsData] = await Promise.all([
          apiClient.getDataset(projectId),
          apiClient.getConfirmedTarget(projectId),
          apiClient.listTrainingRuns(projectId),
        ]);

        if (!mounted) return;
        setDatasetPreview(dsData);
        setConfirmedTarget(targetData);

        const completedRuns = runsData.filter((r) => r.status === "completed");
        if (completedRuns.length > 0) {
          const latestRun = completedRuns[0];
          setModels(latestRun.model_runs);

          // Select specified model, or best model, or first model
          const defaultModel =
            initialSelectedModelId ||
            latestRun.best_model_id ||
            latestRun.model_runs[0]?.model_id ||
            "";
          setSelectedModelId(defaultModel);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load prediction environment."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [projectId, initialSelectedModelId]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover" />
        <span className="text-xs font-mono text-ink-muted">
          Loading prediction engine & model pipelines...
        </span>
      </div>
    );
  }

  if (models.length === 0 || !confirmedTarget || !datasetPreview) {
    return (
      <div className="p-8 rounded-xl border border-hairline bg-surface-1 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-brand-lavender/30 text-brand-hover flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink">No Trained Models Available</h3>
          <p className="text-xs text-ink-muted">
            You must train models before generating live predictions.
          </p>
        </div>
        {onNavigateToTraining && (
          <button
            onClick={onNavigateToTraining}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm"
          >
            <span>Go to Parallel Training</span>
          </button>
        )}
      </div>
    );
  }

  const selectedModel = models.find((m) => m.model_id === selectedModelId);
  const downloadUrl = apiClient.getModelDownloadUrl(projectId, selectedModelId);

  return (
    <div className="space-y-6">
      {/* Top Model Selector & Header Bar */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-hover" />
            <span>Interactive Prediction Interface</span>
          </h2>
          <p className="text-xs text-ink-muted">
            Target: <span className="font-mono text-ink font-semibold">{confirmedTarget.target_column}</span> • Preprocessing: Full Leakage-Free Pipeline Fitted
          </p>
        </div>

        {/* Model Selector Dropdown & Download */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="appearance-none pl-3.5 pr-9 py-2 rounded-lg bg-surface-2 border border-hairline hover:border-hairline-strong text-xs font-mono text-ink focus:outline-none focus:border-brand-lavender cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id} className="bg-surface-1 text-ink">
                  {m.model_name} {m.is_baseline ? "(Baseline)" : ""}
                  {m.primary_metric_score !== null && m.primary_metric_score !== undefined
                    ? ` — ${m.primary_metric_score.toFixed(4)}`
                    : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <a
            href={downloadUrl}
            download
            className="p-2 rounded-lg border border-hairline hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
            title="Download Model Pipeline (.joblib)"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Mode Sub-Tabs Toggle */}
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <button
          onClick={() => setSubTab("single")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            subTab === "single"
              ? "bg-surface-2 text-ink font-semibold border border-hairline"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Single Sample Inference</span>
        </button>

        <button
          onClick={() => setSubTab("batch")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            subTab === "batch"
              ? "bg-surface-2 text-ink font-semibold border border-hairline"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Batch File Prediction</span>
        </button>

        <button
          onClick={() => setSubTab("what-if")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            subTab === "what-if"
              ? "bg-surface-2 text-ink font-semibold border border-brand-lavender/40 text-brand-hover"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand-hover" />
          <span>What-If Simulator</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-lavender/15 text-brand-hover">
            New
          </span>
        </button>
      </div>

      {/* Mode Content */}
      {subTab === "single" ? (
        <SinglePredictionForm
          projectId={projectId}
          modelId={selectedModelId}
          columns={datasetPreview.dataset.columns}
          targetColumn={confirmedTarget.target_column}
        />
      ) : subTab === "batch" ? (
        <BatchPredictionZone
          projectId={projectId}
          modelId={selectedModelId}
          targetColumn={confirmedTarget.target_column}
        />
      ) : (
        <WhatIfSimulator
          projectId={projectId}
          modelId={selectedModelId}
          columns={datasetPreview.dataset.columns}
          targetColumn={confirmedTarget.target_column}
        />
      )}
    </div>
  );
}
