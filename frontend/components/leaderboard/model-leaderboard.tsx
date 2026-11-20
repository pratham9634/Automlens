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

  const lowerIsBetter = useMemo(() => {
    if (!latestRun) return false;
    const metric = latestRun.primary_metric.toLowerCase();
    return ["rmse", "mae", "loss", "error"].some((term) => metric.includes(term));
  }, [latestRun]);

  const getFriendlyMetricLabel = (metric: string) => {
    const m = metric.toLowerCase();
    if (m.includes("f1")) return "Balanced Reliability Score (F1 Macro)";
    if (m.includes("accuracy") || m === "acc") return "Overall Accuracy Score";
    if (m.includes("precision")) return "Precision (Positive Exactness)";
    if (m.includes("recall")) return "Recall (Detection Coverage)";
    if (m.includes("roc") || m.includes("auc")) return "Discriminative Separation (ROC-AUC)";
    if (m.includes("rmse")) return "Average Mistake Margin (RMSE)";
    if (m.includes("mae")) return "Median Mistake Margin (MAE)";
    if (m.includes("r2")) return "Pattern Explaining Power (R²)";
    return metric;
  };

  // Sorted models list respecting lower-is-better for error metrics
  const sortedModels = useMemo(() => {
    if (!latestRun) return [];
    const models = [...latestRun.model_runs];

    return models.sort((a, b) => {
      const scoreA = a.primary_metric_score ?? (lowerIsBetter ? Infinity : -Infinity);
      const scoreB = b.primary_metric_score ?? (lowerIsBetter ? Infinity : -Infinity);

      if (sortField === "score") {
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
      // Default rank: if lower is better, ascending; else descending
      return lowerIsBetter ? scoreA - scoreB : scoreB - scoreA;
    });
  }, [latestRun, sortField, sortDir, lowerIsBetter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(lowerIsBetter && field === "score" ? "asc" : "desc");
    }
  };

  const comparisonChartData = useMemo(() => {
    if (!latestRun) return [];
    const byScore = latestRun.model_runs.toSorted((a, b) => {
      const sA = a.primary_metric_score ?? (lowerIsBetter ? Infinity : -Infinity);
      const sB = b.primary_metric_score ?? (lowerIsBetter ? Infinity : -Infinity);
      return lowerIsBetter ? sA - sB : sB - sA;
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
      .toReversed();
  }, [latestRun, lowerIsBetter]);

  const winnerModel = sortedModels[0];

  const liftData = useMemo(() => {
    if (
      !winnerModel ||
      baselineScore === null ||
      winnerModel.primary_metric_score === null ||
      winnerModel.primary_metric_score === undefined
    ) {
      return null;
    }
    const winScore = winnerModel.primary_metric_score;
    if (lowerIsBetter) {
      const reduction =
        ((baselineScore - winScore) / Math.max(Math.abs(baselineScore), 1e-6)) * 100;
      return {
        percent: reduction,
        text: `${reduction >= 0 ? "+" : ""}${reduction.toFixed(1)}% error reduction vs baseline`,
        isPositive: reduction > 0,
      };
    }
    const lift =
      ((winScore - baselineScore) / Math.max(Math.abs(baselineScore), 1e-6)) * 100;
    return {
      percent: lift,
      text: `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}% predictive lift vs baseline`,
      isPositive: lift > 0,
    };
  }, [winnerModel, baselineScore, lowerIsBetter]);

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

  return (
    <div className="space-y-6">
      {/* Executive Story Hero Banner: Winner & Primary Metric */}
      {winnerModel && (
        <Card className="p-5 border-2 border-border bg-emerald-50/60 dark:bg-emerald-950/20 shadow-neo space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-card bg-yellow-200 dark:bg-yellow-900/60 border-2 border-border shadow-neo-sm text-yellow-950 dark:text-yellow-200 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
                  <span>Winning Estimator:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-black text-base">
                    {winnerModel.model_name}
                  </span>
                  <Badge variant="optimal" size="sm" className="font-marker font-bold text-xs">
                    ★ Rank #1 Champion
                  </Badge>
                  {winnerModel.overfit_risk === "high" ? (
                    <Badge variant="danger" size="sm" className="font-mono">
                      High Overfit Risk
                    </Badge>
                  ) : winnerModel.overfit_risk === "moderate" ? (
                    <Badge variant="warning" size="sm" className="font-mono">
                      Moderate Overfit
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" className="font-mono">
                      🟢 Low Overfit Risk
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Evaluated via <strong>5-Fold Cross-Validation</strong> • Metric:{" "}
                  <strong className="text-text-primary">{getFriendlyMetricLabel(latestRun.primary_metric)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-text-muted">Champion Score</div>
                <div className="text-lg font-mono font-black text-text-primary tabular-nums">
                  {winnerModel.primary_metric_score?.toFixed(4)}
                  {winnerModel.primary_metric_std !== null && winnerModel.primary_metric_std !== undefined && (
                    <span className="text-xs text-text-muted font-normal"> ±{winnerModel.primary_metric_std.toFixed(3)}</span>
                  )}
                </div>
              </div>
              {onNavigateToPredict && (
                <Button
                  variant="primary"
                  onClick={() => onNavigateToPredict(winnerModel.model_id)}
                  className="gap-2 font-mono text-xs font-bold"
                >
                  <span>Predict with Winner</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </Button>
              )}
            </div>
          </div>

          {/* Senior ML Executive Debrief (Simple words for non-tech users) */}
          <div className="pt-3 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-surface border border-border flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] text-text-muted uppercase">Baseline Comparison (Rule 4)</div>
                <div className="font-semibold text-text-primary">
                  {liftData ? liftData.text : "Baseline established"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface border border-border flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div>
                <div className="text-[10px] text-text-muted uppercase">Generalization Safety</div>
                <div className="font-semibold text-text-primary">
                  {winnerModel.overfit_gap !== undefined && winnerModel.overfit_gap !== null
                    ? `Train vs Val Gap: ${winnerModel.overfit_gap.toFixed(3)}`
                    : "Zero Data Leakage (Rule 1)"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface border border-border flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <div>
                <div className="text-[10px] text-text-muted uppercase">Production Readyness</div>
                <div className="font-semibold text-text-primary">
                  Joblib pipeline persisted ({winnerModel.train_time_seconds?.toFixed(2)}s fit)
                </div>
              </div>
            </div>
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
              <TableHead className="text-right">Overfit Risk</TableHead>
              <TableHead className="text-right">Lift vs Baseline</TableHead>
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

              let liftPct: number | null = null;
              let isLiftPositive = false;
              if (
                baselineScore !== null &&
                model.primary_metric_score !== null &&
                model.primary_metric_score !== undefined
              ) {
                const s = model.primary_metric_score;
                if (lowerIsBetter) {
                  liftPct = ((baselineScore - s) / Math.max(Math.abs(baselineScore), 1e-6)) * 100;
                  isLiftPositive = liftPct > 0;
                } else {
                  liftPct = ((s - baselineScore) / Math.max(Math.abs(baselineScore), 1e-6)) * 100;
                  isLiftPositive = liftPct > 0;
                }
              }

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

                  {/* Overfit Risk Badge */}
                  <TableCell className="text-right font-mono">
                    {model.overfit_risk === "high" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                        🔴 High Risk
                      </span>
                    ) : model.overfit_risk === "moderate" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                        🟡 Moderate
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                        🟢 Low Risk
                      </span>
                    )}
                  </TableCell>

                  {/* Lift over Baseline */}
                  <TableCell className="text-right font-mono tabular-nums">
                    {model.is_baseline ? (
                      <span className="text-text-muted text-[11px]">Control (Rule 4)</span>
                    ) : liftPct !== null ? (
                      <span
                        className={`font-semibold ${
                          isLiftPositive ? "text-success" : "text-danger"
                        }`}
                      >
                        {isLiftPositive ? `+${liftPct.toFixed(1)}%` : `${liftPct.toFixed(1)}%`}
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
