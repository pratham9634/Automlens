"use client";

import { useEffect, useState } from "react";
import {
  ConfirmedTargetResponse,
  DatasetPreviewResponse,
  ModelRun,
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
  Download,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertRow } from "@/components/ui/alert-row";

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
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span className="text-xs font-mono text-text-muted">
          Loading serialized prediction pipeline &amp; model registry...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <AlertRow variant="danger" title="Prediction Pipeline Error">
        {error}
      </AlertRow>
    );
  }

  if (models.length === 0 || !confirmedTarget || !datasetPreview) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="No Trained Models Available"
        description="A trained pipeline is required before running live inferences. Complete parallel training on candidate algorithms first."
        action={
          onNavigateToTraining && (
            <Button
              variant="primary"
              onClick={onNavigateToTraining}
              className="gap-2 font-mono text-xs"
            >
              <Cpu className="w-4 h-4" />
              <span>Go to Parallel Training</span>
            </Button>
          )
        }
      />
    );
  }

  const selectedModel = models.find((m) => m.model_id === selectedModelId);
  const downloadUrl = apiClient.getModelDownloadUrl(projectId, selectedModelId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Model Inference &amp; Sensitivity Testing
              </h2>
              <Badge variant="accent" size="sm" className="font-mono">
                Rule 8 Serialized Pipeline
              </Badge>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Target:{" "}
              <span className="font-mono text-text-primary font-semibold">
                {confirmedTarget.target_column}
              </span>{" "}
              • Preprocessing: Fold-safe transformations fitted on full dataset and bundled with estimator
            </p>
          </div>

          {/* Model Selector & Download */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <div className="relative">
              <select
                aria-label="Active Model Estimator"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="appearance-none pl-3.5 pr-9 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.model_id} value={m.model_id} className="bg-surface text-text-primary">
                    {m.model_name} {m.is_baseline ? "(Baseline)" : ""}
                    {m.primary_metric_score !== null && m.primary_metric_score !== undefined
                      ? ` — ${m.primary_metric_score.toFixed(4)}`
                      : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <a
              href={downloadUrl}
              download
              title="Download Serialized Pipeline (.joblib)"
            >
              <Button variant="secondary" size="sm" className="gap-1.5 font-mono text-xs">
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>.joblib</span>
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {/* Mode Sub-Tabs Toggle */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setSubTab("single")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            subTab === "single"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Single Sample Inference</span>
        </button>

        <button
          onClick={() => setSubTab("batch")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            subTab === "batch"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Batch File Prediction</span>
        </button>

        <button
          onClick={() => setSubTab("what-if")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            subTab === "what-if"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
          <span>Sensitivity Simulator</span>
          <Badge variant="accent" size="sm" className="text-[10px] py-0 px-1.5">
            What-If
          </Badge>
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
