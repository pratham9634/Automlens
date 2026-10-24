"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ConfirmedTargetResponse,
  DecisionEngineResponse,
  TargetAnalysisDetailResponse,
  TargetSuggestionItem,
  TaskType,
} from "@/lib/types";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { TargetSelector } from "./target-selector";
import { PreprocessingPipelineCard } from "./preprocessing-pipeline-card";
import { ModelCandidatesCard } from "./model-candidates-card";
import { AiRationalePanel } from "./ai-rationale-panel";
import {
  Loader2,
  Lock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sliders,
} from "lucide-react";

interface TargetDecisionViewProps {
  projectId: string;
  onTargetConfirmed?: () => void;
  onNavigateToTraining?: () => void;
}

export function TargetDecisionView({
  projectId,
  onTargetConfirmed,
  onNavigateToTraining,
}: TargetDecisionViewProps) {
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<TargetSuggestionItem[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [overrideTask, setOverrideTask] = useState<TaskType | null>(null);

  const [analysis, setAnalysis] = useState<TargetAnalysisDetailResponse | null>(null);
  const [decision, setDecision] = useState<DecisionEngineResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [primaryMetric, setPrimaryMetric] = useState<string>("");

  const [confirmedTarget, setConfirmedTarget] = useState<ConfirmedTargetResponse | null>(null);

  // Load decision parameters for selected column & override
  const loadDecisionsForColumn = useCallback(
    async (col: string, override: TaskType | null) => {
      if (!col) return;
      setComputing(true);
      setError(null);
      try {
        const [analysisData, decisionData] = await Promise.all([
          apiClient.analyzeTarget(projectId, {
            target_column: col,
            override_task_type: override,
          }),
          apiClient.formulateDecisions(projectId, {
            target_column: col,
            override_task_type: override,
          }),
        ]);

        setAnalysis(analysisData);
        setDecision(decisionData);
        setPrimaryMetric(decisionData.primary_metric);

        // Pre-select all default candidates
        const initialModels = decisionData.candidate_models
          .filter((m) => m.default_selected)
          .map((m) => m.id);
        setSelectedModels(initialModels);
      } catch (err) {
        console.error("Error computing decision engine:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to formulate decision engine plan."
        );
      } finally {
        setComputing(false);
      }
    },
    [projectId]
  );

  // Initial load: check confirmation status and fetch suggestions
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        // 1. Check if already confirmed
        try {
          const confirmed = await apiClient.getConfirmedTarget(projectId);
          if (mounted && confirmed && confirmed.target_column) {
            setConfirmedTarget(confirmed);
            setSelectedColumn(confirmed.target_column);
            setPrimaryMetric(confirmed.primary_metric);
            setSelectedModels(confirmed.selected_models);
          }
        } catch (cErr) {
          if (cErr instanceof ApiClientError && cErr.status === 404) {
            // Not confirmed yet, normal flow
          } else {
            console.error("Error checking target confirmation:", cErr);
          }
        }

        // 2. Fetch suggestions
        const suggestData = await apiClient.suggestTargets(projectId);
        if (!mounted) return;
        setSuggestions(suggestData.suggestions);

        // Determine default column
        const defaultCol =
          suggestData.recommended_target ||
          (suggestData.suggestions[0] ? suggestData.suggestions[0].name : "");

        setSelectedColumn(defaultCol);
        if (defaultCol) {
          await loadDecisionsForColumn(defaultCol, null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize target selection."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [projectId, loadDecisionsForColumn]);

  const handleSelectColumn = (col: string) => {
    setSelectedColumn(col);
    setOverrideTask(null);
    loadDecisionsForColumn(col, null);
  };

  const handleOverrideTask = (task: TaskType | null) => {
    setOverrideTask(task);
    loadDecisionsForColumn(selectedColumn, task);
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleConfirmTarget = async () => {
    if (!selectedColumn || !decision) return;

    if (selectedModels.length === 0) {
      alert("Please select at least one algorithm candidate to train.");
      return;
    }

    setConfirming(true);
    try {
      const response = await apiClient.confirmTarget(projectId, {
        target_column: selectedColumn,
        task_type: overrideTask || decision.task_type,
        selected_models: selectedModels,
        primary_metric: primaryMetric || decision.primary_metric,
      });

      setConfirmedTarget(response);
      if (onTargetConfirmed) {
        onTargetConfirmed();
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to confirm target and configuration."
      );
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover" />
        <span className="text-xs font-mono text-ink-muted">
          Analyzing dataset columns & formulating AI decisions...
        </span>
      </div>
    );
  }

  if (error && !suggestions.length) {
    return (
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-telemetry-rose mx-auto" />
        <div className="text-xs font-semibold text-ink">Target Inference Failed</div>
        <div className="text-xs text-ink-muted">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Confirmed Locked Banner */}
      {confirmedTarget && (
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink flex items-center gap-2">
                <span>Target Locked & Verified</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready for Training
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Target: <span className="font-mono text-ink font-semibold">{confirmedTarget.target_column}</span> • Task:{" "}
                <span className="font-mono text-ink capitalize">{confirmedTarget.task_type.replace("_", " ")}</span> • Models:{" "}
                <span className="font-mono text-ink">{confirmedTarget.selected_models.length} candidates</span> • Metric:{" "}
                <span className="font-mono text-ink uppercase">{confirmedTarget.primary_metric}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {onNavigateToTraining && (
              <button
                onClick={onNavigateToTraining}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-medium transition-colors shadow-sm"
              >
                <span>Proceed to Parallel Training</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Target Column Selection & Distribution */}
      <TargetSelector
        suggestions={suggestions}
        selectedColumn={selectedColumn}
        onSelectColumn={handleSelectColumn}
        analysis={analysis}
        overrideTask={overrideTask}
        onOverrideTask={handleOverrideTask}
        loading={computing}
      />

      {computing ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-hover" />
          <span className="text-xs font-mono text-ink-muted">
            Formulating candidate algorithms and leakage-free pipeline...
          </span>
        </div>
      ) : decision ? (
        <>
          {/* Preprocessing Formulations */}
          <PreprocessingPipelineCard steps={decision.preprocessing_steps} />

          {/* Algorithm Candidates & Primary Metric */}
          <ModelCandidatesCard
            candidates={decision.candidate_models}
            selectedModelIds={selectedModels}
            onToggleModel={handleToggleModel}
            primaryMetric={primaryMetric}
            availableMetrics={decision.available_metrics}
            onChangePrimaryMetric={(m) => setPrimaryMetric(m)}
          />

          {/* AI Decision Rationale */}
          <AiRationalePanel
            rationale={decision.engineering_rationale}
            isLlmEnriched={decision.is_llm_enriched}
          />

          {/* Confirmation & Lock Action Bar */}
          <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-hover" />
                <span>Confirm Configuration & Commit to Audit Ledger</span>
              </div>
              <p className="text-xs text-ink-muted">
                Locks the target column and preprocessing transformations into the experiment audit trail.
              </p>
            </div>

            <button
              onClick={handleConfirmTarget}
              disabled={confirming || selectedModels.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-semibold transition-all shadow-md disabled:opacity-50"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {confirming
                  ? "Locking Configuration..."
                  : confirmedTarget
                  ? "Update & Re-Lock Target Configuration"
                  : "Lock Target & Proceed to Training"}
              </span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
