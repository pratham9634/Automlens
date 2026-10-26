"use client";

import { ModelCandidate } from "@/lib/types";
import { Cpu, CheckSquare, Square, Award, ChevronDown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span>Candidate Algorithms &amp; Primary Metric</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Select candidate models to be evaluated in parallel across 5-fold cross-validation.
          </p>
        </div>

        {/* Primary Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-text-muted whitespace-nowrap">
            Primary Metric:
          </label>
          <div className="relative">
            <select
              value={primaryMetric}
              onChange={(e) => onChangePrimaryMetric(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-input bg-surface border border-border text-xs font-mono text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m} className="bg-surface text-text-primary">
                  {formatMetricName(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className={`p-4 rounded-card border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-surface-subtle border-accent/40 shadow-xs"
                  : "bg-surface border-border opacity-70 hover:opacity-100"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span className="text-xs font-mono font-semibold text-text-primary">
                      {model.name}
                    </span>
                  </div>

                  {model.is_baseline && (
                    <Badge variant="warning" size="sm" className="gap-1 shrink-0 font-mono">
                      <Award className="w-3 h-3" />
                      Rule 4 Baseline
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-text-muted leading-relaxed pl-6">
                  {model.description}
                </p>
              </div>

              {model.is_baseline && (
                <div className="text-[10px] font-mono text-text-subtle pl-6 flex items-center gap-1">
                  <Info className="w-3 h-3 text-text-muted" />
                  Mandatory baseline for scientific validity (cannot be deselected)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
