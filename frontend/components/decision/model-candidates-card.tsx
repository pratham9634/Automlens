"use client";

import { ModelCandidate } from "@/lib/types";
import { Cpu, CheckSquare, Square, Award, ChevronDown, Info } from "lucide-react";

interface ModelCandidatesCardProps {
  candidates: ModelCandidate[];
  selectedModelIds: string[];
  onToggleModel: (modelId: string) => void;
  primaryMetric: string;
  availableMetrics: string[];
  onChangePrimaryMetric: (metric: string) => void;
}

export function ModelCandidatesCard({
  candidates,
  selectedModelIds,
  onToggleModel,
  primaryMetric,
  availableMetrics,
  onChangePrimaryMetric,
}: ModelCandidatesCardProps) {
  const formatMetricName = (m: string) => {
    switch (m) {
      case "f1_macro":
        return "F1-Score (Macro)";
      case "accuracy":
        return "Accuracy";
      case "roc_auc":
        return "ROC-AUC";
      case "r2":
        return "R² Score (Coefficient of Determination)";
      case "rmse":
        return "Root Mean Squared Error (RMSE)";
      case "mae":
        return "Mean Absolute Error (MAE)";
      default:
        return m;
    }
  };

  return (
    <div className="p-6 rounded-xl border border-hairline bg-surface-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-hover" />
            <span>Algorithm Candidates & Primary Metric</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Select candidate models to be evaluated in parallel across 5-fold cross-validation.
          </p>
        </div>

        {/* Primary Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-ink-muted whitespace-nowrap">
            Primary Metric:
          </label>
          <div className="relative">
            <select
              value={primaryMetric}
              onChange={(e) => onChangePrimaryMetric(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-surface-2 border border-hairline text-xs font-mono text-ink focus:outline-none focus:border-brand-lavender cursor-pointer"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m} className="bg-surface-1 text-ink">
                  {formatMetricName(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Model Selection List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {candidates.map((model) => {
          const isSelected = selectedModelIds.includes(model.id);

          return (
            <div
              key={model.id}
              onClick={() => {
                if (model.is_baseline) {
                  // Rule 4: Baseline is mandatory
                  return;
                }
                onToggleModel(model.id);
              }}
              className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-surface-2/80 border-brand-lavender/50 shadow-sm"
                  : "bg-surface-1/50 border-hairline opacity-60 hover:opacity-100"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-hover shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-muted shrink-0" />
                    )}
                    <span className="text-xs font-mono font-semibold text-ink">
                      {model.name}
                    </span>
                  </div>

                  {model.is_baseline && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lavender/15 text-brand-hover border border-brand-lavender/30 flex items-center gap-1 shrink-0">
                      <Award className="w-3 h-3" />
                      Rule 4 Baseline
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-muted leading-relaxed pl-6">
                  {model.description}
                </p>
              </div>

              {model.is_baseline && (
                <div className="text-[10px] font-mono text-ink-faint pl-6 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Mandatory baseline for scientific validity (cannot be deselected)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
