"use client";

import { useEffect, useState, useMemo } from "react";
import { ModelRun, TaskType, TrainingRun } from "@/lib/types";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { ModelInspectorDialog } from "./model-inspector-dialog";
import {
  Trophy,
  ArrowUpDown,
  Download,
  Eye,
  Play,
  Cpu,
  Award,
  Loader2,
  AlertCircle,
  Zap,
  ArrowRight,
} from "lucide-react";

interface ModelLeaderboardProps {
  projectId: string;
  onNavigateToPredict?: (modelId: string) => void;
  onNavigateToTraining?: () => void;
}

type SortField = "rank" | "name" | "score" | "time";
type SortDirection = "asc" | "desc";

export function ModelLeaderboard({
  projectId,
  onNavigateToPredict,
  onNavigateToTraining,
}: ModelLeaderboardProps) {
  const [latestRun, setLatestRun] = useState<TrainingRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [inspectingModel, setInspectingModel] = useState<ModelRun | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function fetchRuns() {
      try {
        const runs = await apiClient.listTrainingRuns(projectId);
        const completedRuns = runs.filter((r) => r.status === "completed");
        if (mounted && completedRuns.length > 0) {
          setLatestRun(completedRuns[0]);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load model leaderboard."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRuns();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  // Baseline model and score for calculating lift
  const baselineModel = latestRun?.model_runs.find((m) => m.is_baseline);
  const baselineScore = baselineModel?.primary_metric_score ?? null;

  // Sorted models list
  const sortedModels = useMemo(() => {
    if (!latestRun) return [];
    const models = [...latestRun.model_runs];

    return models.sort((a, b) => {
      if (sortField === "score") {
        const scoreA = a.primary_metric_score ?? -Infinity;
        const scoreB = b.primary_metric_score ?? -Infinity;
        return sortDir === "asc" ? scoreA - scoreB : scoreB - scoreA;
      }
      if (sortField === "time") {
        const timeA = a.train_time_seconds ?? 0;
        const timeB = b.train_time_seconds ?? 0;
        return sortDir === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "name") {
        return sortDir === "asc"
          ? a.model_name.localeCompare(b.model_name)
          : b.model_name.localeCompare(a.model_name);
      }
      // Default: Rank by score descending (baseline at bottom if lower)
      const scoreA = a.primary_metric_score ?? -Infinity;
      const scoreB = b.primary_metric_score ?? -Infinity;
      return scoreB - scoreA;
    });
  }, [latestRun, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-hover" />
        <span className="text-xs font-mono text-ink-muted">Loading model leaderboard...</span>
      </div>
    );
  }

  if (!latestRun) {
    return (
      <div className="p-8 rounded-xl border border-hairline bg-surface-1 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-brand-lavender/30 text-brand-hover flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink">No Trained Models Yet</h3>
          <p className="text-xs text-ink-muted">
            Launch cross-validation training to populate the model leaderboard with benchmarked algorithms.
          </p>
        </div>
        {onNavigateToTraining && (
          <button
            onClick={onNavigateToTraining}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm"
          >
            <span>Go to Parallel Training</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  const winnerModel = sortedModels[0];

  return (
    <div className="space-y-6">
      {/* Top Highlight Banner: Winner & Primary Metric */}
      {winnerModel && (
        <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-ink flex items-center gap-2">
                <span>Top Performing Estimator:</span>
                <span className="text-brand-hover font-mono">{winnerModel.model_name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Rank #1
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Primary Metric: <span className="font-mono text-ink font-semibold uppercase">{latestRun.primary_metric}</span> • Score:{" "}
                <span className="font-mono text-ink font-bold text-sm">
                  {winnerModel.primary_metric_score?.toFixed(4)}
                </span>
                {winnerModel.primary_metric_std !== null && winnerModel.primary_metric_std !== undefined && (
                  <span className="font-mono text-ink-muted"> ± {winnerModel.primary_metric_std.toFixed(4)} std</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {onNavigateToPredict && (
              <button
                onClick={() => onNavigateToPredict(winnerModel.model_id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm"
              >
                <span>Predict with Best Model</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="p-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1/50">
          <div className="text-xs font-mono text-ink-muted">
            Evaluating <strong className="text-ink">{sortedModels.length} candidate estimators</strong> across 5-fold cross-validation
          </div>
          <div className="text-xs font-mono text-ink-muted">
            Target: <strong className="text-ink">{latestRun.target_column}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-2 text-ink-muted border-b border-hairline">
              <tr>
                <th className="py-3 px-4 w-14">Rank</th>
                <th
                  onClick={() => toggleSort("name")}
                  className="py-3 px-4 cursor-pointer hover:text-ink transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Algorithm</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("score")}
                  className="py-3 px-4 cursor-pointer hover:text-ink transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Score (Mean ± Std)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Lift over Baseline</th>
                <th
                  onClick={() => toggleSort("time")}
                  className="py-3 px-4 cursor-pointer hover:text-ink transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Train Time</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sortedModels.map((model, idx) => {
                const rank = idx + 1;
                const isWinner = rank === 1;
                const lift =
                  baselineScore !== null && model.primary_metric_score !== null && model.primary_metric_score !== undefined
                    ? model.primary_metric_score - baselineScore
                    : null;

                return (
                  <tr
                    key={model.id}
                    className={`transition-colors ${
                      isWinner
                        ? "bg-brand-lavender/5 hover:bg-brand-lavender/10"
                        : model.is_baseline
                        ? "bg-surface-2/30 hover:bg-surface-2/50"
                        : "hover:bg-surface-2/20"
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 font-semibold text-ink">
                      {isWinner ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>1</span>
                        </div>
                      ) : (
                        <span>#{rank}</span>
                      )}
                    </td>

                    {/* Model Name & Baseline Badge */}
                    <td className="py-3 px-4 text-ink font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{model.model_name}</span>
                        {model.is_baseline && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
                            Rule 4 Baseline
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4">
                      {model.primary_metric_score !== null && model.primary_metric_score !== undefined ? (
                        <div>
                          <span className="font-semibold text-ink">
                            {model.primary_metric_score.toFixed(4)}
                          </span>
                          {model.primary_metric_std !== null && model.primary_metric_std !== undefined && (
                            <span className="text-ink-muted text-[11px] ml-1.5">
                              ± {model.primary_metric_std.toFixed(4)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>

                    {/* Lift over Baseline */}
                    <td className="py-3 px-4">
                      {model.is_baseline ? (
                        <span className="text-ink-muted text-[11px]">0.0000 (Control)</span>
                      ) : lift !== null ? (
                        <span
                          className={`font-semibold ${
                            lift > 0
                              ? "text-emerald-400"
                              : lift < 0
                              ? "text-rose-400"
                              : "text-ink-muted"
                          }`}
                        >
                          {lift > 0 ? `+${lift.toFixed(4)}` : lift.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>

                    {/* Train Time */}
                    <td className="py-3 px-4 text-ink-muted">
                      {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                        ? `${model.train_time_seconds.toFixed(2)}s`
                        : "—"}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingModel(model)}
                          title="Inspect Fold Metrics & Diagnostics"
                          className="p-1.5 rounded-lg border border-hairline hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onNavigateToPredict && (
                          <button
                            onClick={() => onNavigateToPredict(model.model_id)}
                            title="Run Predictions with this Model"
                            className="p-1.5 rounded-lg border border-hairline hover:bg-surface-2 text-brand-hover hover:border-brand-lavender/40 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Inspector Modal */}
      {inspectingModel && (
        <ModelInspectorDialog
          projectId={projectId}
          model={inspectingModel}
          taskType={latestRun.task_type}
          isOpen={Boolean(inspectingModel)}
          onClose={() => setInspectingModel(null)}
          onSelectForPredict={(mId) => {
            if (onNavigateToPredict) onNavigateToPredict(mId);
          }}
        />
      )}
    </div>
  );
}
