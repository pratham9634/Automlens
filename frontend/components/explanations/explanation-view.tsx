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
  Scale,
  BrainCircuit,
  Loader2,
  AlertCircle,
  BarChart3,
  Search,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

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

  // Initial load: dataset, confirmed target, and training runs
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

  // Load global explanation whenever selectedModelId changes
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
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-xs font-mono text-ink-muted">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span>Loading model explainability environment...</span>
      </div>
    );
  }

  if (initError || models.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-surface-1 border border-hairline text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-ink">No Trained Models Available</h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {initError ||
              "Please complete training candidate models before accessing SHAP feature attribution."}
          </p>
        </div>
        {onNavigateToTraining && (
          <button
            type="button"
            onClick={onNavigateToTraining}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-xs rounded-lg transition-colors shadow-sm"
          >
            <span>Go to Parallel Training</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Model Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-1 border border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-ink">Model Interpretability & SHAP</h2>
          </div>
          <p className="text-xs text-ink-muted font-mono">
            Scientific feature attribution and local waterfall decomposition for {targetColumn}
          </p>
        </div>

        {/* Model Selector Dropdown with dark options and custom chevron */}
        <div className="flex items-center gap-2">
          <label htmlFor="model-select" className="text-xs font-mono text-ink-muted whitespace-nowrap">
            Target Model:
          </label>
          <div className="relative">
            <select
              id="model-select"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-lg bg-surface-2 border border-hairline hover:border-hairline-strong text-xs font-mono text-ink focus:outline-none focus:border-emerald-500/50 cursor-pointer shadow-sm transition-colors"
            >
              {models.map((m) => (
                <option
                  key={m.model_id}
                  value={m.model_id}
                  className="bg-[#0B0F19] text-[#F9FAFB] py-1 font-mono"
                >
                  {m.model_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-ink-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Rule 10 Academic Causation Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
            Scientific Rigor Note — Correlation vs. Causation (Rule 10)
          </h4>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Feature attribution explains how the model formulated its prediction based on correlated
            statistical patterns in the training data. A high SHAP attribution score indicates predictive
            influence, but does <strong>not</strong> prove real-world cause and effect.
          </p>
        </div>
      </div>

      {/* Layman Executive Summary Card */}
      {globalData?.layman_summary && (
        <div className="p-5 rounded-xl bg-surface-1 border border-hairline space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 font-mono">
            <Sparkles className="w-4 h-4" />
            Executive Summary (Plain English)
          </div>
          <p className="text-xs text-ink leading-relaxed">
            {globalData.layman_summary}
          </p>
        </div>
      )}

      {/* View Switcher Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
            activeTab === "global"
              ? "bg-surface-2 text-emerald-400 border border-hairline font-semibold shadow-sm"
              : "text-ink-muted hover:text-ink hover:bg-surface-2/40"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Global Feature Importance (SHAP)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("local")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
            activeTab === "local"
              ? "bg-surface-2 text-emerald-400 border border-hairline font-semibold shadow-sm"
              : "text-ink-muted hover:text-ink hover:bg-surface-2/40"
          }`}
        >
          <Search className="w-4 h-4" />
          Local Observation Waterfall
        </button>
      </div>

      {/* Content Rendering */}
      {explLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-xs font-mono text-ink-muted">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>Computing SHAP matrix on background samples...</span>
        </div>
      ) : explError ? (
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold">Failed to Load Explanations</h4>
            <p className="text-xs mt-1 font-mono">{explError}</p>
          </div>
        </div>
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
