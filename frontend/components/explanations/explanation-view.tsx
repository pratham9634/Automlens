"use client";

import { useState, useEffect } from "react";
import {
  ColumnInfo,
  GlobalExplanationResponse,
  ModelRun,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { GlobalImportanceChart } from "./global-importance-chart";
import { LocalAttributionCard } from "./local-attribution-card";
import {
  BrainCircuit,
  Loader2,
  BarChart3,
  Search,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";
import { EmptyState } from "@/components/ui/empty-state";

interface ExplanationViewProps {
  projectId: string;
  onNavigateToTraining?: () => void;
}

export function ExplanationView({
  projectId,
  onNavigateToTraining,
}: ExplanationViewProps) {
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [models, setModels] = useState<ModelRun[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"global" | "local">("global");
  const [globalData, setGlobalData] = useState<GlobalExplanationResponse | null>(null);
  const [explLoading, setExplLoading] = useState<boolean>(false);
  const [explError, setExplError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setInitLoading(true);

    async function loadWorkspace() {
      try {
        const [dsData, targetData, runsData] = await Promise.all([
          apiClient.getDataset(projectId),
          apiClient.getConfirmedTarget(projectId),
          apiClient.listTrainingRuns(projectId),
        ]);

        if (!mounted) return;
        setColumns(dsData.dataset.columns);
        setTargetColumn(targetData.target_column);

        const completedRuns = runsData.filter((r) => r.status === "completed");
        if (completedRuns.length > 0) {
          const latestRun = completedRuns[0];
          setModels(latestRun.model_runs);

          const defaultModel =
            latestRun.best_model_id ||
            latestRun.model_runs[0]?.model_id ||
            "";
          setSelectedModelId(defaultModel);
        }
      } catch (err) {
        if (mounted) {
          setInitError(
            err instanceof Error ? err.message : "Failed to load explanation environment."
          );
        }
      } finally {
        if (mounted) setInitLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedModelId) return;

    async function fetchGlobal() {
      setExplLoading(true);
      setExplError(null);
      try {
        const res = await apiClient.getGlobalExplanation(projectId, selectedModelId);
        if (isMounted) {
          setGlobalData(res);
        }
      } catch (err) {
        if (isMounted) {
          setExplError(
            err instanceof Error ? err.message : "Failed to load global model explanations."
          );
        }
      } finally {
        if (isMounted) {
          setExplLoading(false);
        }
      }
    }

    fetchGlobal();
    return () => {
      isMounted = false;
    };
  }, [projectId, selectedModelId]);

  if (initLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span>Loading model interpretability environment...</span>
      </div>
    );
  }

  if (initError || models.length === 0) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No Trained Models Available"
        description={
          initError ||
          "Please complete candidate model training before accessing SHAP feature attribution."
        }
        action={
          onNavigateToTraining && (
            <Button
              variant="primary"
              onClick={onNavigateToTraining}
              className="gap-2 font-mono text-xs"
            >
              <span>Go to Parallel Training</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Model Switcher */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Model Interpretability &amp; SHAP Attribution
              </h2>
              <Badge variant="accent" size="sm" className="font-mono">
                Rule 9 &amp; 10 Compliant
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              Feature attribution and local observation decomposition for target:{" "}
              <strong className="text-text-primary font-mono">{targetColumn}</strong>
            </p>
          </div>

          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <label htmlFor="model-select" className="text-xs font-mono text-text-muted whitespace-nowrap">
              Estimator:
            </label>
            <div className="relative">
              <select
                id="model-select"
                aria-label="Estimator"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer transition-colors"
              >
                {models.map((m) => (
                  <option key={m.model_id} value={m.model_id} className="bg-surface text-text-primary">
                    {m.model_name} {m.is_baseline ? "(Baseline)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Rule 10 Scientific Rigor Attribution Notice */}
      <AlertRow variant="warning" title="Correlation vs. Causation (Rule 10)">
        Feature attribution explains how the model formulated its prediction based on correlated statistical patterns in the training data. A high SHAP attribution score indicates predictive influence, but does <strong>not</strong> prove real-world cause and effect.
      </AlertRow>

      {/* Layman Executive Summary Card */}
      {globalData?.layman_summary && (
        <Card className="p-5 sm:p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent font-mono">
            <Sparkles className="w-4 h-4" />
            <span>Executive Summary (Plain English)</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {globalData.layman_summary}
          </p>
        </Card>
      )}

      {/* View Switcher Sub-tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "global"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Global Feature Importance (SHAP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("local")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            activeTab === "local"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Local Observation Decomposition</span>
        </button>
      </div>

      {/* Content Rendering */}
      {explLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span>Computing SHAP matrix on background sample folds...</span>
        </div>
      ) : explError ? (
        <AlertRow variant="danger" title="Failed to Load Explanations">
          {explError}
        </AlertRow>
      ) : activeTab === "global" && globalData ? (
        <GlobalImportanceChart data={globalData} />
      ) : (
        <LocalAttributionCard
          projectId={projectId}
          modelId={selectedModelId}
          columns={columns}
          targetColumn={targetColumn}
        />
      )}
    </div>
  );
}
