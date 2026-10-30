"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ConfirmedTargetResponse,
  TrainingRun,
} from "@/lib/types";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ModelTrainingCard } from "./model-training-card";
import {
  Play,
  Loader2,
  Cpu,
  Clock,
  ArrowRight,
  Trophy,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

      es.addEventListener("run_started", () => {
        setActiveRun((prev) =>
          prev ? { ...prev, status: "running" } : null
        );
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
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-text-muted">
          Loading training status and worker processes...
        </span>
      </div>
    );
  }

  if (!confirmedTarget) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-card bg-warning/10 border border-warning/20 text-warning flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="card-title text-text-primary">Target Not Confirmed</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Please select and confirm your target column and candidate models in the
            <strong> AI Strategy</strong> tab before launching training.
          </p>
        </div>
      </Card>
    );
  }

  const isTrainingActive = activeRun?.status === "running" || activeRun?.status === "pending";
  const progressPercent = activeRun && activeRun.total_models > 0
    ? Math.round((activeRun.completed_models / activeRun.total_models) * 100)
    : 0;

  const baselineModel = activeRun?.model_runs.find((m) => m.is_baseline);
  const winnerModel = activeRun?.model_runs.find((m) => m.model_id === activeRun?.best_model_id);
  const baselineScore = baselineModel?.primary_metric_score ?? null;
  const winnerScore = winnerModel?.primary_metric_score ?? null;
  const lift = baselineScore !== null && winnerScore !== null
    ? winnerScore - baselineScore
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <Card className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="card-title text-text-primary flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent" />
              <span>Parallel Multi-Model Training Engine</span>
            </h2>
            <Badge variant="success" size="sm" className="gap-1 font-mono">
              <ShieldCheck className="w-3 h-3" />
              Rule 1 &amp; Rule 3 Compliant (5-Fold CV)
            </Badge>
          </div>

          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Target: <span className="font-mono text-text-primary font-semibold">{confirmedTarget.target_column}</span> • Task:{" "}
            <span className="font-mono text-text-primary capitalize">{confirmedTarget.task_type.replace("_", " ")}</span> • Models:{" "}
            <span className="font-mono text-text-primary tabular-nums">{confirmedTarget.selected_models.length} Candidates</span> • Metric:{" "}
            <span className="font-mono text-text-primary uppercase">{confirmedTarget.primary_metric}</span>
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            onClick={handleStartTraining}
            disabled={starting || isTrainingActive}
            isLoading={starting || isTrainingActive}
            className="gap-2 font-mono text-xs"
          >
            {!starting && !isTrainingActive && <Play className="w-4 h-4 fill-current" />}
            <span>
              {isTrainingActive
                ? "Training In Progress..."
                : activeRun
                ? "Re-Run Training"
                : "Launch Parallel Training"}
            </span>
          </Button>
        </div>
      </Card>

      {/* Live Training Progress Panel */}
      {activeRun && (
        <div className="space-y-6">
          {/* Progress Header & Timer Bar */}
          <Card className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-semibold">
                  {isTrainingActive ? "Evaluating Estimators Across 5 Folds:" : "Training Run Result:"}
                </span>
                <span className="text-accent font-medium tabular-nums">
                  {activeRun.completed_models} / {activeRun.total_models} Models Completed ({progressPercent}%)
                </span>
              </div>

              <div className="flex items-center gap-4 text-text-muted">
                {isTrainingActive && (
                  <span className="flex items-center gap-1.5 text-accent font-medium">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span className="tabular-nums">Elapsed: {formatSeconds(elapsedSeconds)}</span>
                  </span>
                )}
                <span>Run ID: {activeRun.id.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full h-2 rounded-pill bg-surface-subtle border border-border overflow-hidden">
              <div
                className={`h-full rounded-pill transition-all duration-500 ${
                  activeRun.status === "completed"
                    ? "bg-success"
                    : activeRun.status === "failed"
                    ? "bg-danger"
                    : "bg-accent"
                }`}
                style={{ width: `${Math.max(3, progressPercent)}%` }}
              />
            </div>
          </Card>

          {/* Winner Celebration Banner upon Completion */}
          {activeRun.status === "completed" && winnerModel && (
            <Card className="p-4 sm:p-5 border-success/30 bg-success/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-card bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <span>Highest Scoring Estimator:</span>
                    <span className="text-success font-mono">{winnerModel.model_name}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Score: <span className="font-mono text-text-primary font-semibold tabular-nums">{winnerModel.primary_metric_score?.toFixed(4)}</span>
                    {winnerModel.primary_metric_std !== null && winnerModel.primary_metric_std !== undefined && (
                      <span className="font-mono text-text-muted tabular-nums"> ± {winnerModel.primary_metric_std.toFixed(4)} std</span>
                    )}
                    {lift !== null && (
                      <span className="text-success font-mono ml-2 tabular-nums">
                        ({lift >= 0 ? `+${lift.toFixed(4)}` : lift.toFixed(4)} lift over Dummy baseline)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] font-mono text-text-subtle">
                    Full pipeline refitted on 100% data and persisted to disk (Rule 8).
                  </p>
                </div>
              </div>

              {onNavigateToLeaderboard && (
                <Button
                  variant="primary"
                  onClick={onNavigateToLeaderboard}
                  className="gap-2 font-mono text-xs self-end md:self-auto shrink-0"
                >
                  <span>View Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </Card>
          )}

          {/* Model Candidate Evaluation Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-text-muted tracking-wider">
              Evaluated Candidate Algorithms (5-Fold Cross-Validation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
