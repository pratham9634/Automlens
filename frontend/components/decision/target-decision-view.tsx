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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertRow } from "@/components/ui/alert-row";

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
      alert("Please select at least one candidate algorithm to train.");
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
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-text-muted">
          Analyzing dataset features and formulating fold-safe pipeline...
        </span>
      </div>
    );
  }

  if (error && !suggestions.length) {
    return (
      <Card className="p-6 text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-danger mx-auto" />
        <div className="text-xs font-semibold text-text-primary">Target Inference Failed</div>
        <div className="text-xs text-text-muted">{error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Confirmed Locked Banner */}
      {confirmedTarget && (
        <Card className="p-4 sm:p-5 border-success/30 bg-success/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-button bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span>Target Locked &amp; Verified</span>
                <Badge variant="success" size="sm">
                  Ready for Training
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Target: <span className="font-mono text-text-primary font-semibold">{confirmedTarget.target_column}</span> • Task:{" "}
                <span className="font-mono text-text-primary capitalize">{confirmedTarget.task_type.replace("_", " ")}</span> • Models:{" "}
                <span className="font-mono text-text-primary">{confirmedTarget.selected_models.length} candidates</span> • Metric:{" "}
                <span className="font-mono text-text-primary uppercase">{confirmedTarget.primary_metric}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {onNavigateToTraining && (
              <Button
                variant="primary"
                onClick={onNavigateToTraining}
                className="gap-2 font-mono text-xs"
              >
                <span>Proceed to Parallel Training</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </Card>
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
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-xs font-mono text-text-muted">
            Formulating candidate algorithms and fold-safe pipeline...
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
          <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Confirm Configuration &amp; Commit to Audit Ledger</span>
              </div>
              <p className="text-xs text-text-muted">
                Locks the target column and preprocessing transformations into the experiment audit trail.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleConfirmTarget}
              disabled={confirming || selectedModels.length === 0}
              isLoading={confirming}
              className="gap-2 font-mono"
            >
              <Lock className="w-4 h-4" />
              <span>
                {confirming
                  ? "Locking Configuration..."
                  : confirmedTarget
                  ? "Update & Re-Lock Configuration"
                  : "Lock Target & Proceed to Training"}
              </span>
            </Button>
          </Card>
        </>
      ) : null}
    </div>
  );
}
