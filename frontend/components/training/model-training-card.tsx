"use client";

import { ModelRun } from "@/lib/types";
import {
  CheckCircle2,
  Clock,
  Cpu,
  AlertCircle,
  Loader2,
  Award,
  Zap,
} from "lucide-react";

interface ModelTrainingCardProps {
  model: ModelRun;
  isWinner?: boolean;
}

export function ModelTrainingCard({ model, isWinner }: ModelTrainingCardProps) {
  const getStatusBadge = () => {
    switch (model.status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case "training":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-brand-lavender/15 text-brand-hover border border-brand-lavender/30">
            <Loader2 className="w-3 h-3 animate-spin" />
            Training 5 Folds...
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-surface-3 text-ink-muted border border-hairline">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isWinner
          ? "bg-surface-2 border-brand-lavender/60 shadow-md ring-1 ring-brand-lavender/30"
          : model.status === "completed"
          ? "bg-surface-1 border-hairline"
          : model.status === "training"
          ? "bg-surface-2/70 border-brand-lavender/40 animate-pulse"
          : "bg-surface-1/50 border-hairline opacity-75"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Cpu className="w-4 h-4 text-brand-hover shrink-0" />
          <span className="text-xs font-mono font-semibold text-ink">
            {model.model_name}
          </span>

          {model.is_baseline && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30 flex items-center gap-1">
              <Award className="w-3 h-3" />
              Rule 4 Baseline
            </span>
          )}

          {isWinner && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-400" />
              Highest Scoring
            </span>
          )}
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Score & Std Display */}
        <div>
          <div className="text-[10px] font-mono uppercase text-ink-subtle">
            Primary Metric ({model.primary_metric_name})
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            {model.primary_metric_score !== null && model.primary_metric_score !== undefined ? (
              <>
                <span className="text-base font-mono font-semibold text-ink">
                  {model.primary_metric_score.toFixed(4)}
                </span>
                {model.primary_metric_std !== null && model.primary_metric_std !== undefined && (
                  <span className="text-xs font-mono text-ink-muted">
                    ± {model.primary_metric_std.toFixed(4)} std
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-mono text-ink-faint">
                {model.status === "training" ? "Computing fold scores..." : "Awaiting execution"}
              </span>
            )}
          </div>
        </div>

        {/* Training Duration Clock */}
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase text-ink-subtle">Train Time</div>
          <div className="text-xs font-mono text-ink mt-0.5 flex items-center gap-1 sm:justify-end">
            <Clock className="w-3 h-3 text-ink-muted" />
            <span>
              {model.train_time_seconds !== null && model.train_time_seconds !== undefined
                ? `${model.train_time_seconds.toFixed(2)}s`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner if Model Failed */}
      {model.error_message && (
        <div className="mt-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
          {model.error_message}
        </div>
      )}
    </div>
  );
}
