"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Zap,
  Sparkles,
  HelpCircle,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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

type SortField = "metric" | "name" | "time" | "overfit";
type SortDirection = "asc" | "desc";
type ViewMode = "standard" | "matrix";

/** Returns true if a lower metric value represents superior performance */
const isMetricLowerBetter = (metric: string): boolean => {
  const m = metric.toLowerCase();
  return ["rmse", "mae", "loss", "error", "medae", "mape", "rmsle"].some((term) =>
    m.includes(term)
  );
};

/** Formats metric keys into readable academic and plain-English labels (Rule 9) */
const getFriendlyMetricLabel = (metric: string): string => {
  const m = metric.toLowerCase();
  if (m.includes("f1_macro") || m === "f1") return "Balanced Reliability (F1 Macro)";
  if (m.includes("f1_weighted")) return "Weighted F1 Score";
  if (m.includes("balanced_accuracy")) return "Balanced Accuracy";
  if (m.includes("accuracy") || m === "acc") return "Overall Accuracy Score";
  if (m.includes("precision_macro")) return "Precision (Positive Exactness)";
  if (m.includes("precision_weighted")) return "Weighted Precision";
  if (m.includes("recall_macro")) return "Recall (Detection Coverage)";
  if (m.includes("recall_weighted")) return "Weighted Recall";
  if (m.includes("roc") || m.includes("auc")) return "Discriminative Separation (ROC-AUC)";
  if (m.includes("pr_auc")) return "PR-AUC (Avg Precision)";
  if (m.includes("mcc")) return "Matthews Correlation (MCC)";
  if (m.includes("log_loss")) return "Log Loss (Cross-Entropy)";
  if (m.includes("rmse")) return "Average Mistake Margin (RMSE)";
  if (m.includes("mae")) return "Median Mistake Margin (MAE)";
  if (m.includes("r2")) return "Pattern Explaining Power (R²)";
  if (m.includes("medae")) return "Median Absolute Error (MedAE)";
  if (m.includes("explained_variance")) return "Explained Variance Score";
  if (m.includes("mape")) return "Mean Absolute % Error (MAPE)";
  if (m.includes("rmsle")) return "Root Mean Squared Log Error (RMSLE)";
  return metric;
};

/** Compact abbreviation for table headers and compact chips */
const getMetricShortName = (metric: string): string => {
  const m = metric.toLowerCase();
  if (m.includes("f1_macro")) return "F1 (Macro)";
  if (m.includes("f1_weighted")) return "F1 (Weight)";
  if (m.includes("balanced_accuracy")) return "Bal. Acc";
  if (m.includes("accuracy")) return "Accuracy";
  if (m.includes("precision_macro")) return "Precision";
  if (m.includes("recall_macro")) return "Recall";
  if (m.includes("roc_auc")) return "ROC-AUC";
  if (m.includes("pr_auc")) return "PR-AUC";
  if (m.includes("mcc")) return "MCC";
  if (m.includes("log_loss")) return "Log Loss";
  if (m.includes("rmse")) return "RMSE";
  if (m.includes("mae")) return "MAE";
  if (m.includes("r2")) return "R²";
  if (m.includes("medae")) return "MedAE";
  return metric.toUpperCase();
};

/** Contextual help for non-technical users */
const getMetricPlainEnglishHelp = (metric: string): string => {
  const m = metric.toLowerCase();
  if (m.includes("f1")) {
    return "Balances false alarms and missed detections. Critical when class distribution is skewed. Higher is better (0 to 1).";
  }
  if (m.includes("accuracy")) {
    return "Percentage of all predictions that were exactly correct. Higher is better (0% to 100%).";
  }
  if (m.includes("precision")) {
    return "When the model flags a positive result, how often it was right. Minimizes false alarms.";
  }
  if (m.includes("recall")) {
    return "Of all actual positive cases, how many the model successfully discovered. Minimizes missed cases.";
  }
  if (m.includes("roc")) {
    return "Measures how cleanly the model separates classes across all probability thresholds. Higher is better.";
  }
  if (m.includes("mcc")) {
    return "Matthews correlation coefficient (-1 to +1). Regarded by senior researchers as the most unbiased metric for imbalanced classes.";
  }
  if (m.includes("rmse")) {
    return "Average mistake magnitude in target units. Penalizes severe outlier errors heavily. Lower is better.";
  }
  if (m.includes("mae")) {
    return "Typical absolute difference between predictions and actual targets. Outlier-robust. Lower is better.";
  }
  if (m.includes("r2")) {
    return "Percentage of target variability explained by the model features (0% to 100%). Higher is better.";
  }
  return "Evaluated across 5-fold cross-validation on unseen hold-out folds to guarantee zero data leakage.";
};

export function ModelLeaderboard({
  projectId,
  onNavigateToPredict,
  onNavigateToTraining,
}: ModelLeaderboardProps) {
  const [latestRun, setLatestRun] = useState<TrainingRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sorting & metric selection states
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("metric");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("standard");

  const [inspectingModel, setInspectingModel] = useState<ModelRun | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [showScoreExplainer, setShowScoreExplainer] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function fetchRuns() {
      try {
        const runs = await apiClient.listTrainingRuns(projectId);
        const completedRuns = runs.filter((r) => r.status === "completed");
        if (mounted && completedRuns.length > 0) {
          const run = completedRuns[0];
          setLatestRun(run);
          if (run.primary_metric) {
            setSelectedMetric(run.primary_metric);
            setSortDir(isMetricLowerBetter(run.primary_metric) ? "asc" : "desc");
          }
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

  // Available metrics derived from the training run
  const availableMetrics = useMemo(() => {
    if (!latestRun) return [];
    const metricSet = new Set<string>();
    if (latestRun.primary_metric) {
      metricSet.add(latestRun.primary_metric);
    }
    latestRun.model_runs.forEach((m) => {
      if (m.all_metrics) {
        Object.keys(m.all_metrics).forEach((k) => {
          if (!k.startsWith("_") && !k.startsWith("neg_")) {
            metricSet.add(k);
          }
        });
      }
    });
    return Array.from(metricSet);
  }, [latestRun]);

  const activeMetric = selectedMetric || latestRun?.primary_metric || "score";
  const activeMetricIsLowerBetter = isMetricLowerBetter(activeMetric);
  const isAiRecommended = activeMetric.toLowerCase() === latestRun?.primary_metric.toLowerCase();

  // Helper to safely extract a metric value (mean ± std) from any model
  const getModelMetricValue = useCallback(
    (
      model: ModelRun,
      metric: string
    ): { mean: number | null; std: number | null } => {
      if (
        (metric === latestRun?.primary_metric || metric === model.primary_metric_name) &&
        model.primary_metric_score !== null &&
        model.primary_metric_score !== undefined
      ) {
        return {
          mean: model.primary_metric_score,
          std: model.primary_metric_std ?? null,
        };
      }
      if (model.all_metrics && model.all_metrics[metric]) {
        const agg = model.all_metrics[metric];
        if (typeof agg === "object" && agg !== null && "mean" in agg) {
          return {
            mean: typeof agg.mean === "number" ? agg.mean : null,
            std: typeof agg.std === "number" ? agg.std : null,
          };
        }
        if (typeof agg === "number") {
          return { mean: agg, std: null };
        }
      }
      return { mean: null, std: null };
    },
    [latestRun]
  );

  // TRUE CHAMPION: Statically anchored to latestRun.best_model_id (NOT table row index 0)
  const championModel = useMemo(() => {
    if (!latestRun || !latestRun.model_runs.length) return null;
    if (latestRun.best_model_id) {
      const found = latestRun.model_runs.find((m) => m.model_id === latestRun.best_model_id);
      if (found) return found;
    }
    const primaryLower = isMetricLowerBetter(latestRun.primary_metric);
    return [...latestRun.model_runs].sort((a, b) => {
      const sA = a.primary_metric_score ?? (primaryLower ? Infinity : -Infinity);
      const sB = b.primary_metric_score ?? (primaryLower ? Infinity : -Infinity);
      return primaryLower ? sA - sB : sB - sA;
    })[0] ?? null;
  }, [latestRun]);

  // Rule 4 Baseline Control model
  const baselineModel = latestRun?.model_runs.find((m) => m.is_baseline);
  const baselineScore = baselineModel?.primary_metric_score ?? null;

  // Fastest model in the training pool
  const fastestModel = useMemo(() => {
    if (!latestRun || !latestRun.model_runs.length) return null;
    const candidatesWithTime = latestRun.model_runs.filter(
      (m) => m.train_time_seconds !== null && m.train_time_seconds !== undefined && !m.is_baseline
    );
    if (!candidatesWithTime.length) return null;
    return [...candidatesWithTime].sort(
      (a, b) => (a.train_time_seconds ?? 0) - (b.train_time_seconds ?? 0)
    )[0];
  }, [latestRun]);

  // Lift of the true tournament champion vs baseline (Rule 4)
  const primaryLower = latestRun ? isMetricLowerBetter(latestRun.primary_metric) : false;
  const liftData = useMemo(() => {
    if (
      !championModel ||
      baselineScore === null ||
      championModel.primary_metric_score === null ||
      championModel.primary_metric_score === undefined
    ) {
      return null;
    }
    const winScore = championModel.primary_metric_score;
    if (primaryLower) {
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
  }, [championModel, baselineScore, primaryLower]);

  // Sorted models list respecting the user's active metric & sort preferences
  const sortedModels = useMemo(() => {
    if (!latestRun) return [];
    const models = [...latestRun.model_runs];

    return models.sort((a, b) => {
      if (sortField === "metric") {
        const valA =
          getModelMetricValue(a, activeMetric).mean ??
          (activeMetricIsLowerBetter ? Infinity : -Infinity);
        const valB =
          getModelMetricValue(b, activeMetric).mean ??
          (activeMetricIsLowerBetter ? Infinity : -Infinity);
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      if (sortField === "time") {
        const timeA = a.train_time_seconds ?? Infinity;
        const timeB = b.train_time_seconds ?? Infinity;
        return sortDir === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "name") {
        return sortDir === "asc"
          ? a.model_name.localeCompare(b.model_name)
          : b.model_name.localeCompare(a.model_name);
      }
      if (sortField === "overfit") {
        const gapA = a.overfit_gap ?? 0;
        const gapB = b.overfit_gap ?? 0;
        return sortDir === "asc" ? gapA - gapB : gapB - gapA;
      }

      // Default fallback
      const valA =
        getModelMetricValue(a, activeMetric).mean ??
        (activeMetricIsLowerBetter ? Infinity : -Infinity);
      const valB =
        getModelMetricValue(b, activeMetric).mean ??
        (activeMetricIsLowerBetter ? Infinity : -Infinity);
      return activeMetricIsLowerBetter ? valA - valB : valB - valA;
    });
  }, [latestRun, sortField, sortDir, activeMetric, activeMetricIsLowerBetter, getModelMetricValue]);

  const handleMetricChange = (newMetric: string) => {
    setSelectedMetric(newMetric);
    setSortField("metric");
    setSortDir(isMetricLowerBetter(newMetric) ? "asc" : "desc");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "metric") {
        setSortDir(activeMetricIsLowerBetter ? "asc" : "desc");
      } else if (field === "time") {
        setSortDir("asc"); // fastest first
      } else {
        setSortDir("asc");
      }
    }
  };

  // Visual Benchmark chart data synchronized with activeMetric
  const comparisonChartData = useMemo(() => {
    if (!latestRun) return [];
    const withValues = latestRun.model_runs.map((m) => {
      const val = getModelMetricValue(m, activeMetric);
      return {
        model: m,
        val: val.mean,
        std: val.std ?? 0,
      };
    });

    const sortedForChart = withValues.toSorted((a, b) => {
      const sA = a.val ?? (activeMetricIsLowerBetter ? Infinity : -Infinity);
      const sB = b.val ?? (activeMetricIsLowerBetter ? Infinity : -Infinity);
      return activeMetricIsLowerBetter ? sA - sB : sB - sA;
    });

    return sortedForChart
      .map((item, idx) => ({
        name: item.model.model_name,
        score: item.val !== null ? Number(item.val.toFixed(4)) : 0,
        std: item.std,
        time: item.model.train_time_seconds ?? 0,
        isBaseline: item.model.is_baseline,
        isChampion: item.model.model_id === championModel?.model_id,
        isTopInMetric: idx === 0,
        rank: idx + 1,
      }))
      .toReversed();
  }, [latestRun, activeMetric, activeMetricIsLowerBetter, championModel, getModelMetricValue]);

  // Metrics to show in Multi-Metric Matrix comparison view
  const matrixMetrics = useMemo(() => {
    if (!latestRun) return [];
    const isClassification = latestRun.task_type !== "regression";
    const defaultOrder = isClassification
      ? ["f1_macro", "accuracy", "precision_macro", "recall_macro", "roc_auc", "mcc"]
      : ["rmse", "mae", "r2", "medae", "explained_variance"];

    return defaultOrder.filter((m) => availableMetrics.includes(m));
  }, [latestRun, availableMetrics]);

  // Find the top performer in each metric for matrix highlighting
  const topPerformerPerMetric = useMemo(() => {
    if (!latestRun) return {};
    const result: Record<string, string> = {};

    matrixMetrics.forEach((mKey) => {
      const isLower = isMetricLowerBetter(mKey);
      let bestVal: number | null = null;
      let bestModelId: string | null = null;

      latestRun.model_runs.forEach((m) => {
        const val = getModelMetricValue(m, mKey).mean;
        if (val !== null) {
          if (bestVal === null) {
            bestVal = val;
            bestModelId = m.model_id;
          } else if (isLower ? val < bestVal : val > bestVal) {
            bestVal = val;
            bestModelId = m.model_id;
          }
        }
      });

      if (bestModelId) {
        result[mKey] = bestModelId;
      }
    });

    return result;
  }, [latestRun, matrixMetrics, getModelMetricValue]);

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
      {/* Executive Story Hero Banner: STABLE TOURNAMENT CHAMPION (Locked to best_model_id) */}
      {championModel && (
        <Card className="p-5 border-2 border-border bg-emerald-50/60 dark:bg-emerald-950/20 shadow-neo space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-card bg-yellow-200 dark:bg-yellow-900/60 border-2 border-border shadow-neo-sm text-yellow-950 dark:text-yellow-200 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
                  <span>Tournament Champion:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-black text-base">
                    {championModel.model_name}
                  </span>
                  <Badge variant="optimal" size="sm" className="font-marker font-bold text-xs">
                    ★ Best Overall Estimator
                  </Badge>
                  {championModel.overfit_risk === "high" ? (
                    <Badge variant="danger" size="sm" className="font-mono">
                      High Overfit Risk
                    </Badge>
                  ) : championModel.overfit_risk === "moderate" ? (
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
                  Evaluated via <strong>5-Fold Cross-Validation</strong> • AI Recommended Benchmark:{" "}
                  <strong className="text-text-primary">
                    {getFriendlyMetricLabel(latestRun.primary_metric)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-text-muted">Champion Score</div>
                <div className="text-lg font-mono font-black text-text-primary tabular-nums">
                  {championModel.primary_metric_score?.toFixed(4)}
                  {championModel.primary_metric_std !== null && championModel.primary_metric_std !== undefined && (
                    <span className="text-xs text-text-muted font-normal">
                      {" "}
                      ±{championModel.primary_metric_std.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
              {onNavigateToPredict && (
                <Button
                  variant="primary"
                  onClick={() => onNavigateToPredict(championModel.model_id)}
                  className="gap-2 font-mono text-xs font-bold"
                >
                  <span>Predict with Champion</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </Button>
              )}
            </div>
          </div>

          {/* Academic Audit Debrief */}
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
                  {championModel.overfit_gap !== undefined && championModel.overfit_gap !== null
                    ? `Train vs Val Gap: ${championModel.overfit_gap.toFixed(3)}`
                    : "Zero Data Leakage (Rule 1)"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface border border-border flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <div>
                <div className="text-[10px] text-text-muted uppercase">Production Readiness</div>
                <div className="font-semibold text-text-primary">
                  Joblib pipeline persisted ({championModel.train_time_seconds?.toFixed(2)}s fit)
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
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                  <span>Cross-Validated Algorithm Comparison</span>
                  <Badge
                    variant={isAiRecommended ? "optimal" : "accent"}
                    size="sm"
                    className="font-mono text-[10px]"
                  >
                    {isAiRecommended && "★ "}Metric: {getMetricShortName(activeMetric)}
                    {isAiRecommended && " (AI Recommended)"}
                  </Badge>
                </h3>
                <p className="text-xs text-text-muted">
                  Mean test fold score across 5-fold cross-validation.{" "}
                  <strong>{activeMetricIsLowerBetter ? "Lower is better (error margin)" : "Higher is better"}</strong>.
                </p>
              </div>
            </div>

            {/* Legend & Toggle */}
            <div className="flex items-center gap-2.5 text-xs font-mono flex-wrap">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Champion
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
            <div
              style={{ height: `${Math.max(240, comparisonChartData.length * 44)}px` }}
              className="w-full pt-2"
            >
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
                  {baselineScore !== null && isAiRecommended && (
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
                        return (
                          <div className="bg-surface border border-border p-3 rounded-card shadow-xl text-xs font-mono space-y-1.5 min-w-[220px]">
                            <div className="text-text-primary font-semibold flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                              <span
                                className={item.isChampion ? "text-emerald-500 font-bold" : "text-accent"}
                              >
                                {item.isChampion ? "★ " : ""}#{item.rank} {item.name}
                              </span>
                              {item.isChampion && (
                                <Badge variant="optimal" size="sm">
                                  Champion
                                </Badge>
                              )}
                              {item.isBaseline && (
                                <Badge variant="warning" size="sm">
                                  Baseline
                                </Badge>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-text-muted">
                              <span>{getMetricShortName(activeMetric)} CV Mean:</span>
                              <span className="text-text-primary font-bold tabular-nums">
                                {item.score.toFixed(4)} {item.std > 0 ? `± ${item.std.toFixed(4)}` : ""}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-text-muted pt-1 border-t border-border/40">
                              <span>Train Duration:</span>
                              <span className="text-text-secondary tabular-nums">
                                {item.time.toFixed(2)}s
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {comparisonChartData.map((item, index) => {
                      const fill = item.isChampion
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

      {/* Leaderboard Table & Controls */}
      <Card className="p-4 sm:p-5 space-y-4">
        {/* Modern Interactive Toolbar: Metric Sorting & View Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-2 border-b border-border">
          {/* Metric Selector with prominent AI-Recommended Tag */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-xs font-mono font-semibold text-text-secondary flex items-center gap-1.5 whitespace-nowrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
              <span>Rank & Sort By:</span>
            </span>

            <div className="w-full sm:w-72">
              <Select
                value={activeMetric}
                onChange={(e) => handleMetricChange(e.target.value)}
                className="text-xs font-mono py-1.5 h-9"
              >
                {/* AI Recommended Metric Option First */}
                {latestRun.primary_metric && (
                  <option value={latestRun.primary_metric}>
                    ★ {getMetricShortName(latestRun.primary_metric)} [AI Recommended]
                  </option>
                )}

                {/* Other Available Metrics */}
                {availableMetrics
                  .filter((m) => m !== latestRun.primary_metric)
                  .map((m) => (
                    <option key={m} value={m}>
                      {getMetricShortName(m)} — {getFriendlyMetricLabel(m).split(" (")[0]}
                    </option>
                  ))}
              </Select>
            </div>

            {isAiRecommended ? (
              <Badge variant="optimal" size="sm" className="font-mono text-[11px] shrink-0">
                ★ AI Recommended Metric
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="font-mono text-[11px] text-text-muted shrink-0">
                Custom Metric View
              </Badge>
            )}
          </div>

          {/* View Mode Switcher & Metric Explainer Trigger */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            {/* Standard vs Multi-Metric Matrix View */}
            <div className="inline-flex rounded-md border border-border p-0.5 bg-surface-subtle text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode("standard")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "standard"
                    ? "bg-accent text-accent-contrast font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Standard View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  viewMode === "matrix"
                    ? "bg-accent text-accent-contrast font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>All Metrics Matrix</span>
              </button>
            </div>

            {/* Explainer Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScoreExplainer(!showScoreExplainer)}
              className="gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary h-8"
              title="Explain what these scores mean in plain English"
            >
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              <span>{showScoreExplainer ? "Hide Help" : "What is Score?"}</span>
            </Button>
          </div>
        </div>

        {/* Plain-English Educational Explainer Card (Expands when clicked) */}
        {showScoreExplainer && (
          <div className="p-4 rounded-card bg-surface-subtle border-2 border-dashed border-accent/40 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <h4 className="font-semibold text-text-primary">
                  Understanding Leaderboard Scores &amp; 5-Fold Cross-Validation
                </h4>
                <p className="text-text-muted leading-relaxed">
                  In AutoMLens, every score is calculated via <strong>5-Fold Cross-Validation</strong>.
                  The dataset is partitioned into 5 independent folds. Each model is trained on 4 folds
                  and evaluated on the unseen 5th fold. This process guarantees <strong>zero data leakage</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-surface border border-border">
                    <span className="font-bold text-text-primary">Mean Score:</span> The average performance
                    across the 5 hold-out tests. For accuracy/F1/R², higher is better (up to 1.0 or 100%).
                    For RMSE/MAE, lower is better (0 is a perfect score).
                  </div>
                  <div className="p-2 rounded bg-surface border border-border">
                    <span className="font-bold text-text-primary">± Std Deviation:</span> Measures fold-to-fold
                    variance. A small standard deviation (e.g. ±0.012) means the algorithm is stable and dependable
                    across different subsets of your data.
                  </div>
                </div>
                <div className="pt-1 text-accent font-mono text-[11px]">
                  💡 <strong>Currently Viewing:</strong> {getFriendlyMetricLabel(activeMetric)} —{" "}
                  {getMetricPlainEnglishHelp(activeMetric)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 1: STANDARD LEADERBOARD TABLE */}
        {viewMode === "standard" && (
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

                {/* Dynamic Active Metric Column Header */}
                <TableHead
                  onClick={() => toggleSort("metric")}
                  className="cursor-pointer hover:text-text-primary transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-accent font-semibold">
                      {getMetricShortName(activeMetric)} (Mean ± Std)
                    </span>
                    {isAiRecommended && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">★</span>
                    )}
                    <ArrowUpDown className="w-3 h-3 text-accent" />
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => toggleSort("overfit")}
                  className="cursor-pointer hover:text-text-primary transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Overfit Risk</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </TableHead>

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
                const isChampion = model.model_id === championModel?.model_id;
                const isFastest = model.model_id === fastestModel?.model_id && !model.is_baseline;
                const rankNumber = idx + 1;

                // Active Metric Score
                const metricVal = getModelMetricValue(model, activeMetric);

                // Baseline Lift for this model on the primary metric
                let liftPct: number | null = null;
                let isLiftPositive = false;
                if (
                  baselineScore !== null &&
                  model.primary_metric_score !== null &&
                  model.primary_metric_score !== undefined
                ) {
                  const s = model.primary_metric_score;
                  if (primaryLower) {
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
                    className={
                      isChampion
                        ? "bg-emerald-500/10 dark:bg-emerald-950/20 hover:bg-emerald-500/15 font-medium border-l-4 border-l-emerald-500"
                        : undefined
                    }
                  >
                    {/* Rank Number (Visual order) + Trophy on Champion */}
                    <TableCell className="text-center font-semibold text-text-primary">
                      {isChampion ? (
                        <div className="flex items-center justify-center gap-1 text-warning font-mono font-bold" title="Tournament Champion">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span>#{rankNumber}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-text-muted">#{rankNumber}</span>
                      )}
                    </TableCell>

                    {/* Model Name & Contextual Badges */}
                    <TableCell className="text-text-primary font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold">{model.model_name}</span>

                          {/* True Champion badge stays pinned */}
                          {isChampion && (
                            <Badge variant="optimal" size="sm" className="font-mono text-[10px]">
                              ★ Champion
                            </Badge>
                          )}

                          {/* Fastest model badge */}
                          {isFastest && (
                            <Badge variant="accent" size="sm" className="font-mono text-[10px] flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              <span>Fastest</span>
                            </Badge>
                          )}

                          {/* Baseline model badge */}
                          {model.is_baseline && (
                            <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                              Rule 4 Baseline
                            </Badge>
                          )}
                        </div>

                        {/* Quick multi-metric insight chips under the model name */}
                        {model.all_metrics && (
                          <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
                            {model.all_metrics.accuracy && (
                              <span>Acc: {(model.all_metrics.accuracy.mean * 100).toFixed(1)}%</span>
                            )}
                            {model.all_metrics.f1_macro && (
                              <span>• F1: {model.all_metrics.f1_macro.mean.toFixed(3)}</span>
                            )}
                            {model.all_metrics.roc_auc && (
                              <span>• AUC: {model.all_metrics.roc_auc.mean.toFixed(3)}</span>
                            )}
                            {model.all_metrics.rmse && (
                              <span>RMSE: {model.all_metrics.rmse.mean.toFixed(2)}</span>
                            )}
                            {model.all_metrics.r2 && (
                              <span>• R²: {model.all_metrics.r2.mean.toFixed(3)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Score for the Active Metric */}
                    <TableCell className="text-right font-mono">
                      {metricVal.mean !== null ? (
                        <div>
                          <span className="font-bold text-text-primary tabular-nums text-xs">
                            {metricVal.mean.toFixed(4)}
                          </span>
                          {metricVal.std !== null && (
                            <span className="text-text-muted text-[11px] ml-1.5 tabular-nums">
                              ± {metricVal.std.toFixed(4)}
                            </span>
                          )}
                          <div className="text-[10px] text-text-muted">
                            {activeMetricIsLowerBetter ? "Lower is better" : "Higher is better"}
                          </div>
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

                    {/* Lift over Baseline (Rule 4) */}
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
        )}

        {/* View 2: ALL METRICS MATRIX COMPARISON TABLE */}
        {viewMode === "matrix" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Algorithm</TableHead>
                  {matrixMetrics.map((mKey) => (
                    <TableHead
                      key={mKey}
                      onClick={() => handleMetricChange(mKey)}
                      className="cursor-pointer hover:text-text-primary text-right transition-colors"
                      title={getFriendlyMetricLabel(mKey)}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className={activeMetric === mKey ? "text-accent font-bold" : undefined}>
                          {getMetricShortName(mKey)}
                        </span>
                        {mKey === latestRun.primary_metric && (
                          <span className="text-emerald-500 font-bold text-[10px]">★</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Train Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModels.map((model, idx) => {
                  const isChampion = model.model_id === championModel?.model_id;

                  return (
                    <TableRow
                      key={model.id}
                      className={
                        isChampion
                          ? "bg-emerald-500/10 dark:bg-emerald-950/20 font-medium"
                          : undefined
                      }
                    >
                      <TableCell className="text-center font-mono text-text-muted text-xs">
                        {isChampion ? (
                          <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mx-auto" />
                        ) : (
                          `#${idx + 1}`
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-text-primary">
                        <div className="flex items-center gap-1.5">
                          <span>{model.model_name}</span>
                          {isChampion && (
                            <Badge variant="optimal" size="sm" className="text-[9px]">
                              Champion
                            </Badge>
                          )}
                          {model.is_baseline && (
                            <Badge variant="warning" size="sm" className="text-[9px]">
                              Baseline
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Score in Each Matrix Metric */}
                      {matrixMetrics.map((mKey) => {
                        const val = getModelMetricValue(model, mKey);
                        const isBestInColumn = topPerformerPerMetric[mKey] === model.model_id;

                        return (
                          <TableCell
                            key={mKey}
                            className={`text-right font-mono text-xs tabular-nums ${
                              isBestInColumn
                                ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5"
                                : "text-text-secondary"
                            }`}
                          >
                            {val.mean !== null ? (
                              <span title={`± ${val.std?.toFixed(4) ?? 0} std`}>
                                {val.mean.toFixed(4)}
                                {isBestInColumn && " ★"}
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-right font-mono text-xs text-text-muted tabular-nums">
                        {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                          ? `${model.train_time_seconds.toFixed(2)}s`
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setInspectingModel(model)}
                            title="Inspect Fold Metrics & Diagnostics"
                          >
                            <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
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
