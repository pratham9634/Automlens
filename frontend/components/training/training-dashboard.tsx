"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ConfirmedTargetResponse,
  ModelRun,
  TrainingRun,
} from "@/lib/types";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ModelTrainingCard } from "./model-training-card";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Clock,
  Layers,
  ArrowRight,
  RotateCw,
  Trophy,
  ShieldCheck,
} from "lucide-react";

interface TrainingDashboardProps {
  projectId: string;
  onTrainingCompleted?: () => void;
  onNavigateToLeaderboard?: () => void;
}

export function TrainingDashboard({
  projectId,
  onTrainingCompleted,
  onNavigateToLeaderboard,
}: TrainingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmedTarget, setConfirmedTarget] = useState<ConfirmedTargetResponse | null>(null);
  const [activeRun, setActiveRun] = useState<TrainingRun | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Setup EventSource listener for a specific run ID
  const connectSSE = useCallback(
    (runId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = apiClient.getTrainingStreamUrl(runId);
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener("run_started", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveRun((prev) =>
            prev ? { ...prev, status: "running" } : null
          );
        } catch (err) {
          console.error("Error parsing run_started event:", err);
        }
      });

      es.addEventListener("model_completed", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveRun((prev) => {
            if (!prev) return null;
            const updatedModels = prev.model_runs.map((m) =>
              m.model_id === payload.model_id
                ? {
                    ...m,
                    status: payload.status,
                    primary_metric_score: payload.score,
                    primary_metric_std: payload.std,
                    all_metrics: payload.metrics,
                    train_time_seconds: payload.train_time_seconds,
                    error_message: payload.error_message,
                  }
                : m
            );
            const compCount = updatedModels.filter((m) => m.status === "completed").length;
            return {
              ...prev,
              completed_models: compCount,
              model_runs: updatedModels,
            };
          });
        } catch (err) {
          console.error("Error parsing model_completed event:", err);
        }
      });

      es.addEventListener("run_completed", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveRun((prev) =>
            prev
              ? {
                  ...prev,
                  status: "completed",
                  best_model_id: payload.best_model_id,
                  best_score: payload.best_score,
                  completed_models: payload.completed_models,
                }
              : null
          );
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (onTrainingCompleted) {
            onTrainingCompleted();
          }
          es.close();
        } catch (err) {
          console.error("Error parsing run_completed event:", err);
        }
      });

      es.addEventListener("run_failed", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveRun((prev) =>
            prev ? { ...prev, status: "failed", error_message: payload.error_message } : null
          );
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          es.close();
        } catch (err) {
          console.error("Error parsing run_failed event:", err);
        }
      });

      es.onerror = () => {
        // SSE handles reconnection automatically
      };
    },
    [onTrainingCompleted]
  );

  // Initial load: Fetch confirmed target and latest run
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch confirmed target
        try {
          const confirmed = await apiClient.getConfirmedTarget(projectId);
          if (mounted) setConfirmedTarget(confirmed);
        } catch (cErr) {
          if (cErr instanceof ApiClientError && cErr.status === 404) {
            setConfirmedTarget(null);
          }
        }

        // 2. Fetch past training runs
        const runs = await apiClient.listTrainingRuns(projectId);
        if (mounted && runs.length > 0) {
          const latest = runs[0];
          setActiveRun(latest);

          // If still running, connect SSE
          if (latest.status === "running" || latest.status === "pending") {
            connectSSE(latest.id);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize training dashboard."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [projectId, connectSSE]);

  // Timer effect for live training execution
  useEffect(() => {
    if (activeRun?.status === "running") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeRun?.status]);

  const handleStartTraining = async () => {
    if (!confirmedTarget) return;

    setStarting(true);
    setError(null);
    setElapsedSeconds(0);
    try {
      const response = await apiClient.startTraining(projectId);
      // Fetch fresh full run representation
      const runData = await apiClient.getTrainingRun(response.run_id);
      setActiveRun(runData);
      connectSSE(response.run_id);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to schedule parallel training run."
      );
    } finally {
      setStarting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover" />
        <span className="text-xs font-mono text-ink-muted">
          Loading training status and cluster telemetry...
        </span>
      </div>
    );
  }

  if (!confirmedTarget) {
    return (
      <div className="p-8 rounded-xl border border-hairline bg-surface-1 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink">Target Not Confirmed</h3>
          <p className="text-xs text-ink-muted">
            Please select and lock your target column and candidate models in the
            <strong> AI Target & Decision</strong> tab before launching training.
          </p>
        </div>
      </div>
    );
  }

  const isTrainingActive = activeRun?.status === "running" || activeRun?.status === "pending";
  const progressPercent = activeRun && activeRun.total_models > 0
    ? Math.round((activeRun.completed_models / activeRun.total_models) * 100)
    : 0;

  // Find baseline score for lift calculation
  const baselineModel = activeRun?.model_runs.find((m) => m.is_baseline);
  const winnerModel = activeRun?.model_runs.find((m) => m.model_id === activeRun.best_model_id);
  const baselineScore = baselineModel?.primary_metric_score ?? null;
  const winnerScore = winnerModel?.primary_metric_score ?? null;
  const lift = baselineScore !== null && winnerScore !== null
    ? winnerScore - baselineScore
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-hover" />
              <span>Parallel Multi-Model Training Engine</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Rule 1 & Rule 3 Compliant (5-Fold CV)
            </span>
          </div>

          <p className="text-xs text-ink-muted max-w-2xl">
            Target: <span className="font-mono text-ink font-semibold">{confirmedTarget.target_column}</span> • Task:{" "}
            <span className="font-mono text-ink capitalize">{confirmedTarget.task_type.replace("_", " ")}</span> • Models:{" "}
            <span className="font-mono text-ink">{confirmedTarget.selected_models.length} Candidates</span> • Primary Metric:{" "}
            <span className="font-mono text-ink uppercase">{confirmedTarget.primary_metric}</span>
          </p>
        </div>

        <div>
          <button
            onClick={handleStartTraining}
            disabled={starting || isTrainingActive}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-semibold transition-all shadow-md disabled:opacity-50"
          >
            {starting || isTrainingActive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>
              {isTrainingActive
                ? "Training In Progress..."
                : activeRun
                ? "Re-Run Training"
                : "Launch Parallel Training"}
            </span>
          </button>
        </div>
      </div>

      {/* Live Training Progress Panel */}
      {activeRun && (
        <div className="space-y-6">
          {/* Progress Header & Timer Bar */}
          <div className="p-5 rounded-xl border border-hairline bg-surface-1/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-ink font-semibold">
                  {isTrainingActive ? "Evaluating Estimators Across 5 Folds:" : "Training Run Result:"}
                </span>
                <span className="text-brand-hover">
                  {activeRun.completed_models} / {activeRun.total_models} Models Completed ({progressPercent}%)
                </span>
              </div>

              <div className="flex items-center gap-4 text-ink-muted">
                {isTrainingActive && (
                  <span className="flex items-center gap-1.5 text-brand-hover">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Elapsed: {formatSeconds(elapsedSeconds)}</span>
                  </span>
                )}
                <span>Run ID: {activeRun.id.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeRun.status === "completed"
                    ? "bg-emerald-500"
                    : activeRun.status === "failed"
                    ? "bg-rose-500"
                    : "bg-brand-lavender"
                }`}
                style={{ width: `${Math.max(3, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Winner Celebration Banner upon Completion */}
          {activeRun.status === "completed" && winnerModel && (
            <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-ink flex items-center gap-2">
                    <span>Highest Scoring Estimator:</span>
                    <span className="text-emerald-400 font-mono">{winnerModel.model_name}</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Score: <span className="font-mono text-ink font-semibold">{winnerModel.primary_metric_score?.toFixed(4)}</span>
                    {winnerModel.primary_metric_std !== null && winnerModel.primary_metric_std !== undefined && (
                      <span className="font-mono text-ink-muted"> ± {winnerModel.primary_metric_std.toFixed(4)} std</span>
                    )}
                    {lift !== null && (
                      <span className="text-emerald-300 font-mono ml-2">
                        ({lift >= 0 ? `+${lift.toFixed(4)}` : lift.toFixed(4)} lift over Dummy baseline)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] font-mono text-ink-subtle">
                    Full pipeline refitted on 100% data and persisted to disk (Rule 8).
                  </p>
                </div>
              </div>

              {onNavigateToLeaderboard && (
                <button
                  onClick={onNavigateToLeaderboard}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-semibold transition-colors shadow-sm self-end md:self-auto shrink-0"
                >
                  <span>View Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Model Candidate Evaluation Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-ink-subtle tracking-wider">
              Evaluated Candidate Algorithms (5-Fold Cross-Validation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRun.model_runs.map((m) => (
                <ModelTrainingCard
                  key={m.id}
                  model={m}
                  isWinner={m.model_id === activeRun.best_model_id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
