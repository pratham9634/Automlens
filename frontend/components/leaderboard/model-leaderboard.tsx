"use client";

import { useEffect, useState, useMemo } from "react";
import { ModelRun, TrainingRun } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { ModelInspectorDialog } from "./model-inspector-dialog";
import {
  Trophy,
  ArrowUpDown,
  Eye,
  Play,
  Loader2,
  ArrowRight,
  BarChart2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

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
  const [showChart, setShowChart] = useState(true);

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

  const comparisonChartData = useMemo(() => {
    if (!latestRun) return [];
    const byScore = [...latestRun.model_runs].sort((a, b) => {
      const sA = a.primary_metric_score ?? -Infinity;
      const sB = b.primary_metric_score ?? -Infinity;
      return sB - sA;
    });

    return byScore
      .map((m, idx) => ({
        name: m.model_name,
        score: Number((m.primary_metric_score ?? 0).toFixed(4)),
        std: m.primary_metric_std ?? 0,
        time: m.train_time_seconds ?? 0,
        isBaseline: m.is_baseline,
        isWinner: idx === 0,
        rank: idx + 1,
      }))
      .reverse();
  }, [latestRun]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-text-muted">Loading model leaderboard...</span>
      </div>
    );
  }

  if (!latestRun) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-card bg-surface-subtle border border-border text-text-muted flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6 text-accent" />
        </div>
        <div className="space-y-1">
          <h3 className="card-title text-text-primary">No Trained Models Yet</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Launch cross-validation training to populate the model leaderboard with benchmarked algorithms.
          </p>
        </div>
        {onNavigateToTraining && (
          <Button
            variant="primary"
            onClick={onNavigateToTraining}
            className="gap-2 font-mono text-xs"
          >
            <span>Go to Parallel Training</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </Card>
    );
  }

  const winnerModel = sortedModels[0];

  return (
    <div className="space-y-6">
      {/* Top Highlight Banner: Winner & Primary Metric */}
      {winnerModel && (
        <Card className="p-4 sm:p-5 border-success/30 bg-success/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-card bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                <span>Top by {latestRun.primary_metric}:</span>
                <span className="text-success font-mono">{winnerModel.model_name}</span>
                <Badge variant="success" size="sm">
                  Rank #1
                </Badge>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Primary Metric: <span className="font-mono text-text-primary font-semibold uppercase">{latestRun.primary_metric}</span> • Score:{" "}
                <span className="font-mono text-text-primary font-bold tabular-nums">
                  {winnerModel.primary_metric_score?.toFixed(4)}
                </span>
                {winnerModel.primary_metric_std !== null && winnerModel.primary_metric_std !== undefined && (
                  <span className="font-mono text-text-muted tabular-nums"> ± {winnerModel.primary_metric_std.toFixed(4)} std</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {onNavigateToPredict && (
              <Button
                variant="primary"
                onClick={() => onNavigateToPredict(winnerModel.model_id)}
                className="gap-2 font-mono text-xs"
              >
                <span>Predict with Best Model</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Visual Model Performance Benchmark Chart */}
      {comparisonChartData.length > 0 && (
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <BarChart2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span>Cross-Validated Algorithm Comparison</span>
                  <Badge variant="accent" size="sm" className="font-mono uppercase text-[10px]">
                    Metric: {latestRun.primary_metric}
                  </Badge>
                </h3>
                <p className="text-xs text-text-muted">
                  Mean test fold score across 5-fold cross-validation. Higher is better.
                </p>
              </div>
            </div>

            {/* Legend & Toggle */}
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Winner
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
                Evaluated
              </span>
              {baselineScore !== null && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  Baseline
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowChart(!showChart)}
                className="px-2 py-1 rounded text-[11px] border border-border bg-surface-subtle hover:bg-surface-hover transition-colors text-text-secondary cursor-pointer"
              >
                {showChart ? "Hide Chart" : "Show Chart"}
              </button>
            </div>
          </div>

          {showChart && (
            <div style={{ height: `${Math.max(240, comparisonChartData.length * 44)}px` }} className="w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 35, left: 130, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--border)"
                    opacity={0.6}
                  />
                  <XAxis
                    type="number"
                    stroke="var(--border)"
                    tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--border)"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "monospace" }}
                    tickLine={false}
                    width={150}
                  />
                  {baselineScore !== null && (
                    <ReferenceLine
                      x={baselineScore}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Baseline",
                        fill: "#F59E0B",
                        fontSize: 10,
                        position: "insideTopRight",
                        fontFamily: "monospace",
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: "rgba(14, 165, 233, 0.08)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const lift = baselineScore !== null ? item.score - baselineScore : null;
                        return (
                          <div className="bg-surface border border-border p-3 rounded-card shadow-xl text-xs font-mono space-y-1.5 min-w-[220px]">
                            <div className="text-text-primary font-semibold flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                              <span className={item.isWinner ? "text-emerald-500 font-bold" : "text-accent"}>
                                #{item.rank} {item.name}
                              </span>
                              {item.isBaseline && (
                                <Badge variant="warning" size="sm">
                                  Baseline
                                </Badge>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-text-muted">
                              <span>CV Mean Score:</span>
                              <span className="text-text-primary font-bold tabular-nums">
                                {item.score.toFixed(4)} {item.std > 0 ? `± ${item.std.toFixed(4)}` : ""}
                              </span>
                            </div>
                            {lift !== null && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-text-muted">Lift vs Baseline:</span>
                                <span
                                  className={`font-semibold tabular-nums ${
                                    lift > 0 ? "text-emerald-500" : lift < 0 ? "text-rose-500" : "text-text-muted"
                                  }`}
                                >
                                  {lift >= 0 ? `+${lift.toFixed(4)}` : lift.toFixed(4)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[11px] text-text-muted pt-1 border-t border-border/40">
                              <span>Train Duration:</span>
                              <span className="text-text-secondary tabular-nums">{item.time.toFixed(2)}s</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {comparisonChartData.map((item, index) => {
                      const fill = item.isWinner
                        ? "#10B981"
                        : item.isBaseline
                        ? "#F59E0B"
                        : "#0EA5E9";

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fill}
                          opacity={0.88 + (index / comparisonChartData.length) * 0.12}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-text-muted pb-1">
          <div>
            Evaluating <strong className="text-text-primary">{sortedModels.length} candidate estimators</strong> across 5-fold CV
          </div>
          <div>
            Target: <strong className="text-text-primary font-semibold">{latestRun.target_column}</strong>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead
                onClick={() => toggleSort("name")}
                className="cursor-pointer hover:text-text-primary transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Algorithm</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted" />
                </div>
              </TableHead>
              <TableHead
                onClick={() => toggleSort("score")}
                className="cursor-pointer hover:text-text-primary transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Score (Mean ± Std)</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted" />
                </div>
              </TableHead>
              <TableHead className="text-right">Lift over Baseline</TableHead>
              <TableHead
                onClick={() => toggleSort("time")}
                className="cursor-pointer hover:text-text-primary transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Train Time</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.map((model, idx) => {
              const rank = idx + 1;
              const isWinner = rank === 1;
              const lift =
                baselineScore !== null && model.primary_metric_score !== null && model.primary_metric_score !== undefined
                  ? model.primary_metric_score - baselineScore
                  : null;

              return (
                <TableRow
                  key={model.id}
                  className={isWinner ? "bg-accent/5 hover:bg-accent/10" : undefined}
                >
                  {/* Rank */}
                  <TableCell className="text-center font-semibold text-text-primary">
                    {isWinner ? (
                      <div className="flex items-center justify-center gap-1 text-warning font-mono">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>1</span>
                      </div>
                    ) : (
                      <span className="font-mono text-text-muted">#{rank}</span>
                    )}
                  </TableCell>

                  {/* Model Name & Baseline Badge */}
                  <TableCell className="text-text-primary font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{model.model_name}</span>
                      {model.is_baseline && (
                        <Badge variant="warning" size="sm" className="font-mono">
                          Rule 4 Baseline
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-right font-mono">
                    {model.primary_metric_score !== null && model.primary_metric_score !== undefined ? (
                      <div>
                        <span className="font-semibold text-text-primary tabular-nums">
                          {model.primary_metric_score.toFixed(4)}
                        </span>
                        {model.primary_metric_std !== null && model.primary_metric_std !== undefined && (
                          <span className="text-text-muted text-[11px] ml-1.5 tabular-nums">
                            ± {model.primary_metric_std.toFixed(4)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>

                  {/* Lift over Baseline */}
                  <TableCell className="text-right font-mono tabular-nums">
                    {model.is_baseline ? (
                      <span className="text-text-muted text-[11px]">0.0000 (Control)</span>
                    ) : lift !== null ? (
                      <span
                        className={`font-semibold ${
                          lift > 0
                            ? "text-success"
                            : lift < 0
                            ? "text-danger"
                            : "text-text-muted"
                        }`}
                      >
                        {lift > 0 ? `+${lift.toFixed(4)}` : lift.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>

                  {/* Train Time */}
                  <TableCell className="text-right font-mono text-text-muted tabular-nums">
                    {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                      ? `${model.train_time_seconds.toFixed(2)}s`
                      : "—"}
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setInspectingModel(model)}
                        title="Inspect Fold Metrics & Diagnostics"
                      >
                        <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                      </Button>
                      {onNavigateToPredict && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onNavigateToPredict(model.model_id)}
                          title="Run Predictions with this Model"
                          className="text-accent hover:text-accent hover:bg-accent/10"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
