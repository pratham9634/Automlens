"use client";

import { PreprocessingStep } from "@/lib/types";
import { Filter, Layers, ShieldCheck } from "lucide-react";

interface PreprocessingPipelineCardProps {
  steps: PreprocessingStep[];
}

export function PreprocessingPipelineCard({ steps }: PreprocessingPipelineCardProps) {
  const getStepBadgeColor = (type: string) => {
    switch (type) {
      case "imputation":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "scaling":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "encoding":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "drop":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-surface-3 text-ink-muted border-hairline";
    }
  };

  const getStepLabel = (type: string) => {
    switch (type) {
      case "imputation":
        return "Imputation";
      case "scaling":
        return "Scaling";
      case "encoding":
        return "Encoding";
      case "drop":
        return "Exclusion";
      default:
        return type;
    }
  };

  return (
    <div className="p-6 rounded-xl border border-hairline bg-surface-1 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-hover" />
            <span>Formulated Preprocessing Pipeline</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Rule 1: Leakage-Free (CV Fold Encapsulated)
            </span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Transformations derived by deterministic heuristic rules. All fit transformations occur strictly inside cross-validation splits.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, idx) => (
          <div
            key={`${step.column}-${step.step_type}-${idx}`}
            className="p-3.5 rounded-lg bg-surface-2/60 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-hairline-strong transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-ink">
                  {step.column}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${getStepBadgeColor(
                    step.step_type
                  )}`}
                >
                  {getStepLabel(step.step_type)}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-3 text-ink-muted border border-hairline">
                  strategy: {step.strategy}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {step.reason}
              </p>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="p-6 text-center text-xs font-mono text-ink-muted">
            No transformations needed for selected feature set.
          </div>
        )}
      </div>
    </div>
  );
}
