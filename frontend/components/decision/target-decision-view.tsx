"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Unlock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionExplainerGuide } from "@/components/ui/section-explainer-guide";
import { Sliders, Target, ShieldCheck as ShieldCheckIcon } from "lucide-react";

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

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
  const [activeProvider, setActiveProvider] = useState<string>("gemini");
  const [activeGeminiModel, setActiveGeminiModel] = useState<string>("gemini-3.5-flash-lite");

  // Stream cancellation & target concurrency management
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeStreamTargetRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const model = localStorage.getItem("automlens_gemini_model") || "gemini-3.5-flash-lite";
      setActiveGeminiModel(model);
    }
  }, []);

  const [confirmedTarget, setConfirmedTarget] = useState<ConfirmedTargetResponse | null>(null);

  // Trigger streaming decision formulation
  const triggerAiStreaming = useCallback(
    async (col: string, override: TaskType | null, objective: string) => {
      if (!col) return;

      // 1. Abort any previous active stream immediately to prevent race conditions
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }

      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      activeStreamTargetRef.current = col;

      setSelectedColumn(col);
      setComputing(true);
      setIsStreaming(true);
      setStreamingTokens("");
      setStreamNotice(null);
      setError(null);
      setValidationError(null);

      // Watchdog timer (15s) to guarantee spinner recovery if SSE drops
      const watchdog = setTimeout(() => {
        if (activeStreamTargetRef.current === col) {
          setIsStreaming((curr) => {
            if (curr) {
              console.warn("Decision stream watchdog timed out after 15s. Resolving state.");
              setComputing(false);
              return false;
            }
            return curr;
          });
        }
      }, 15000);

      try {
        // Fetch target column stats (recalculated dynamically on override)
        const analysisData = await apiClient.analyzeTarget(projectId, {
          target_column: col,
          override_task_type: override,
        });

        // Guard against stale responses if target changed while fetching analysis
        if (abortController.signal.aborted || activeStreamTargetRef.current !== col) {
          return;
        }
        setAnalysis(analysisData);

        // Stream AI reasoning from Google Gemini
        await apiClient.streamDecisions(
          projectId,
          {
            target_column: col,
            override_task_type: override,
            user_objective: objective || undefined,
          },
          {
            onStatus: (statusData) => {
              if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
              if (statusData.provider) {
                setActiveProvider(statusData.provider);
              }
            },
            onToken: (token) => {
              if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
              setStreamingTokens((prev) => prev + token);
            },
            onNotice: (notice) => {
              if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
              setStreamNotice(notice);
            },
            onPipelineReady: (decisionData) => {
              clearTimeout(watchdog);
              if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
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
              clearTimeout(watchdog);
              if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
              console.warn("Stream error, falling back to synchronous formulation:", err);
              // Fallback to synchronous formulation
              apiClient
                .formulateDecisions(projectId, {
                  target_column: col,
                  override_task_type: override,
                  user_objective: objective || undefined,
                })
                .then((syncData) => {
                  if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
                  setDecision(syncData);
                  setPrimaryMetric(syncData.primary_metric);
                  setStreamingTokens(syncData.engineering_rationale);
                  const recommended = syncData.candidate_models
                    .filter((m) => m.default_selected)
                    .map((m) => m.id);
                  setSelectedModels(recommended);
                })
                .catch((fallbackErr) => {
                  if (abortController.signal.aborted || activeStreamTargetRef.current !== col) return;
                  setError(fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
                })
                .finally(() => {
                  if (activeStreamTargetRef.current === col) {
                    setIsStreaming(false);
                    setComputing(false);
                  }
                });
            },
          },
          abortController.signal
        );
      } catch (err) {
        clearTimeout(watchdog);
        if (abortController.signal.aborted || activeStreamTargetRef.current !== col) {
          return;
        }
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
        let confirmedCol: string | null = null;
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
            confirmedCol = confirmed.target_column;
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
          confirmedCol ||
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
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
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
      setValidationError("Please select at least one candidate algorithm to train alongside Rule 4 Baseline.");
      return;
    }

    setConfirming(true);
    setValidationError(null);
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
      setIsUnlocked(false);
      if (onTargetConfirmed) {
        onTargetConfirmed();
      }
    } catch (err) {
      setValidationError(
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
      {/* PLAIN-ENGLISH AI STRATEGY & TARGET GUIDE DROPDOWN BOX */}
      <SectionExplainerGuide
        title="What is AI Strategy & Target Selection? (1-Minute Plain-English Guide)"
        subtitle="Click to understand how choosing a target column configures your machine learning tournament."
        badgeText="For Non-Tech Users"
        cards={[
          {
            icon: Target,
            title: "What is a 'Target Column'?",
            description:
              "The target column is the exact question you want the AI to answer. All other columns become clues (features) that the algorithms study to predict that answer.",
          },
          {
            icon: Sliders,
            title: "Classification vs. Regression",
            description:
              "If the answer is a category or label (e.g. Yes/No, Churn/Retain), it's Classification. If it is a continuous number (e.g. Price, Temperature), it's Regression.",
          },
          {
            icon: ShieldCheckIcon,
            title: "Zero-Leakage Guard (Rule 1 & 2)",
            description:
              "The AI recommends candidate models and metrics, but requires your explicit human approval (Rule 2). Once locked, test data is strictly isolated to prevent cheating.",
          },
        ]}
        tipsTitle="How to configure your target strategy:"
        tips={[
          {
            label: "1. Select Target Column",
            text: "Pick the column you wish to predict from the suggested candidates below.",
          },
          {
            label: "2. Optional User Objective",
            text: "Type any specific goal (e.g., 'prioritize catching all fraud') to steer the AI's algorithm choices.",
          },
          {
            label: "3. Review & Lock Strategy",
            text: "Click 'Confirm Target & Lock Strategy' to create the leakage-safe training blueprint.",
          },
        ]}
      />

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

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnlocked((prev) => !prev)}
              className="gap-1.5 font-mono text-xs cursor-pointer border-border hover:border-border-strong"
            >
              {isUnlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isUnlocked ? "Close Editor" : "Unlock & Reconfigure"}</span>
            </Button>
            {onNavigateToTraining && (
              <Button
                variant="primary"
                onClick={onNavigateToTraining}
                className="gap-2 font-mono text-xs cursor-pointer"
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
          statusMessage={`Google Gemini (${activeGeminiModel}) formulating strategy...`}
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

          {/* Validation Alert Banner */}
          {validationError && (
            <Card className="p-3.5 border-danger/40 bg-danger/10 text-danger text-xs font-mono flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                <span>{validationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-text-muted hover:text-text-primary text-[11px] underline cursor-pointer"
              >
                Dismiss
              </button>
            </Card>
          )}

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
