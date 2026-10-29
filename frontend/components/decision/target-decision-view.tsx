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
import { UserObjectiveInput } from "./user-objective-input";
import { AiReasoningTerminal } from "./ai-reasoning-terminal";
import { ModelCandidatesCard } from "./model-candidates-card";
import {
  Loader2,
  Lock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [userObjective, setUserObjective] = useState<string>("");

  const [analysis, setAnalysis] = useState<TargetAnalysisDetailResponse | null>(null);
  const [decision, setDecision] = useState<DecisionEngineResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [primaryMetric, setPrimaryMetric] = useState<string>("");

  // Real-time AI streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTokens, setStreamingTokens] = useState("");
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>("ollama");

  const [confirmedTarget, setConfirmedTarget] = useState<ConfirmedTargetResponse | null>(null);

  // Trigger streaming decision formulation
  const triggerAiStreaming = useCallback(
    async (col: string, override: TaskType | null, objective: string) => {
      if (!col) return;
      setComputing(true);
      setIsStreaming(true);
      setStreamingTokens("");
      setStreamNotice(null);
      setError(null);

      try {
        // Fetch target column stats
        const analysisData = await apiClient.analyzeTarget(projectId, {
          target_column: col,
          override_task_type: override,
        });
        setAnalysis(analysisData);

        // Stream AI reasoning from Ollama (qwen2.5:3b)
        await apiClient.streamDecisions(
          projectId,
          {
            target_column: col,
            override_task_type: override,
            user_objective: objective || undefined,
          },
          {
            onStatus: (statusData) => {
              if (statusData.provider) {
                setActiveProvider(statusData.provider);
              }
            },
            onToken: (token) => {
              setStreamingTokens((prev) => prev + token);
            },
            onNotice: (notice) => {
              setStreamNotice(notice);
            },
            onPipelineReady: (decisionData) => {
              setDecision(decisionData);
              setPrimaryMetric(decisionData.primary_metric);

              // Pre-select AI recommended models
              const recommended = decisionData.candidate_models
                .filter((m) => m.default_selected)
                .map((m) => m.id);
              setSelectedModels(recommended);
              setIsStreaming(false);
              setComputing(false);
            },
            onError: (err) => {
              console.warn("Stream error, falling back to synchronous formulation:", err);
              // Fallback to synchronous formulation
              apiClient
                .formulateDecisions(projectId, {
                  target_column: col,
                  override_task_type: override,
                  user_objective: objective || undefined,
                })
                .then((syncData) => {
                  setDecision(syncData);
                  setPrimaryMetric(syncData.primary_metric);
                  setStreamingTokens(syncData.engineering_rationale);
                  const recommended = syncData.candidate_models
                    .filter((m) => m.default_selected)
                    .map((m) => m.id);
                  setSelectedModels(recommended);
                })
                .catch((fallbackErr) => {
                  setError(fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
                })
                .finally(() => {
                  setIsStreaming(false);
                  setComputing(false);
                });
            },
          }
        );
      } catch (err) {
        console.error("Error initiating decision stream:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to formulate decision engine plan."
        );
        setIsStreaming(false);
        setComputing(false);
      }
    },
    [projectId]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        // 1. Check if previously confirmed
        try {
          const confirmed = await apiClient.getConfirmedTarget(projectId);
          if (mounted && confirmed && confirmed.target_column) {
            setConfirmedTarget(confirmed);
            setSelectedColumn(confirmed.target_column);
            setPrimaryMetric(confirmed.primary_metric);
            setSelectedModels(confirmed.selected_models);
            if (confirmed.user_objective) {
              setUserObjective(confirmed.user_objective);
            }
          }
        } catch (cErr) {
          if (!(cErr instanceof ApiClientError && cErr.status === 404)) {
            console.error("Error checking target confirmation:", cErr);
          }
        }

        // 2. Fetch suggestions
        const suggestData = await apiClient.suggestTargets(projectId);
        if (!mounted) return;
        setSuggestions(suggestData.suggestions);

        const defaultCol =
          suggestData.recommended_target ||
          (suggestData.suggestions[0] ? suggestData.suggestions[0].name : "");

        setSelectedColumn(defaultCol);
        if (defaultCol) {
          await triggerAiStreaming(defaultCol, null, "");
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
  }, [projectId, triggerAiStreaming]);

  const handleSelectColumn = (col: string) => {
    setSelectedColumn(col);
    setOverrideTask(null);
    triggerAiStreaming(col, null, userObjective);
  };

  const handleOverrideTask = (task: TaskType | null) => {
    setOverrideTask(task);
    triggerAiStreaming(selectedColumn, task, userObjective);
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
        user_objective: userObjective || undefined,
        engineered_features: decision.engineered_features || [],
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
          Analyzing dataset schema and initializing AI decision engine...
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
                <span>Target Locked &amp; Human Approved</span>
                <Badge variant="success" size="sm">
                  Ready for Parallel Training
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Target: <span className="font-mono text-text-primary font-semibold">{confirmedTarget.target_column}</span> • Task:{" "}
                <span className="font-mono text-text-primary capitalize">{confirmedTarget.task_type.replace("_", " ")}</span> • Models:{" "}
                <span className="font-mono text-text-primary">{confirmedTarget.selected_models.length} active</span> • Metric:{" "}
                <span className="font-mono text-text-primary uppercase">{confirmedTarget.primary_metric}</span>
                {confirmedTarget.user_objective && (
                  <span> • Objective: &quot;{confirmedTarget.user_objective}&quot;</span>
                )}
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
        loading={computing && !isStreaming}
      />

      {/* Natural Language User Objective Input */}
      <UserObjectiveInput
        value={userObjective}
        onChange={setUserObjective}
        onSubmit={() => triggerAiStreaming(selectedColumn, overrideTask, userObjective)}
        disabled={computing || !selectedColumn}
        isStreaming={isStreaming}
      />

      {/* Live AI Reasoning Terminal */}
      {(isStreaming || streamingTokens || decision) && (
        <AiReasoningTerminal
          tokens={streamingTokens}
          isStreaming={isStreaming}
          statusMessage="Local Ollama (qwen2.5:3b) analyzing dataset schema..."
          provider={activeProvider}
          notice={streamNotice}
          engineeredFeatures={decision?.engineered_features || []}
          preprocessingSteps={decision?.preprocessing_steps || []}
        />
      )}

      {decision && !isStreaming && (
        <>
          {/* Human Approval Gate: Model Selection Card (24 Models) */}
          <ModelCandidatesCard
            candidates={decision.candidate_models}
            selectedModelIds={selectedModels}
            onToggleModel={handleToggleModel}
            primaryMetric={primaryMetric}
            availableMetrics={decision.available_metrics}
            onChangePrimaryMetric={(m) => setPrimaryMetric(m)}
          />

          {/* Human Approval Gate: Action Bar */}
          <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-accent/30 bg-surface">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Human Approval Checkpoint</span>
              </div>
              <p className="text-xs text-text-muted">
                Review the AI-formulated preprocessing pipeline and selected models. You can approve this plan or add extra models before launching training.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleConfirmTarget}
              disabled={confirming || selectedModels.length === 0}
              isLoading={confirming}
              className="gap-2 font-mono whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {confirming
                  ? "Approving Configuration..."
                  : confirmedTarget
                  ? "Update Approval & Re-Lock"
                  : "Approve & Launch Model Training"}
              </span>
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
