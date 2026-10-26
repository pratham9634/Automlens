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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

interface ModelTrainingCardProps {
  model: ModelRun;
  isWinner?: boolean;
}

export function ModelTrainingCard({ model, isWinner }: ModelTrainingCardProps) {
  const getStatusBadge = () => {
    switch (model.status) {
      case "completed":
        return (
          <Badge variant="success" size="sm" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        );
      case "training":
        return (
          <Badge variant="accent" size="sm" className="gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Training 5 Folds...
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="danger" size="sm" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="gap-1">
            <Clock className="w-3 h-3" />
            Queued
          </Badge>
        );
    }
  };

  return (
    <Card
      className={`p-4 transition-all duration-150 flex flex-col justify-between space-y-3.5 ${
        isWinner
          ? "border-accent bg-surface-subtle shadow-xs ring-1 ring-accent/30"
          : model.status === "completed"
          ? "border-border bg-surface"
          : model.status === "training"
          ? "border-accent/40 bg-surface-subtle"
          : "border-border bg-surface opacity-75"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Cpu className="w-4 h-4 text-accent shrink-0" />
          <span className="text-xs font-mono font-semibold text-text-primary">
            {model.model_name}
          </span>

          {model.is_baseline && (
            <Badge variant="warning" size="sm" className="gap-1 font-mono">
              <Award className="w-3 h-3" />
              Rule 4 Baseline
            </Badge>
          )}

          {isWinner && (
            <Badge variant="accent" size="sm" className="gap-1 font-mono">
              <Zap className="w-3 h-3 text-accent" />
              Top by {model.primary_metric_name}
            </Badge>
          )}
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Score & Std Display */}
        <div>
          <div className="text-[10px] font-mono uppercase text-text-muted">
            Primary Metric ({model.primary_metric_name})
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            {model.primary_metric_score !== null && model.primary_metric_score !== undefined ? (
              <>
                <span className="text-base font-mono font-semibold text-text-primary tabular-nums">
                  {model.primary_metric_score.toFixed(4)}
                </span>
                {model.primary_metric_std !== null && model.primary_metric_std !== undefined && (
                  <span className="text-xs font-mono text-text-muted tabular-nums">
                    ± {model.primary_metric_std.toFixed(4)} std
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-mono text-text-subtle">
                {model.status === "training" ? "Computing fold metrics..." : "Awaiting execution"}
              </span>
            )}
          </div>
        </div>

        {/* Training Duration Clock */}
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase text-text-muted">Train Time</div>
          <div className="text-xs font-mono text-text-primary mt-0.5 flex items-center gap-1 sm:justify-end tabular-nums">
            <Clock className="w-3 h-3 text-text-muted" />
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
        <AlertRow variant="danger" title="Training Failed">
          <span className="font-mono text-xs">{model.error_message}</span>
        </AlertRow>
      )}
    </Card>
  );
}
