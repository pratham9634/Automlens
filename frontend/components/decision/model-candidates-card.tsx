"use client";

import { useState } from "react";
import { ModelCandidate } from "@/lib/types";
import { Cpu, CheckSquare, Square, Award, ChevronDown, ChevronUp, Layers, Sparkles } from "lucide-react";
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
  const [showAllModels, setShowAllModels] = useState(false);

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

  // Split into AI Recommended (default_selected) vs Additional Candidates
  const recommendedModels = candidates.filter((m) => m.default_selected || m.is_baseline);
  const additionalModels = candidates.filter((m) => !m.default_selected && !m.is_baseline);

  const renderModelItem = (model: ModelCandidate, isRecommended: boolean) => {
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
        className={`p-3.5 rounded-card border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
          isSelected
            ? "bg-surface-subtle border-accent/40 shadow-xs"
            : "bg-surface border-border opacity-70 hover:opacity-100"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {model.is_baseline ? (
                <CheckSquare className="w-4 h-4 text-warning flex-shrink-0" />
              ) : isSelected ? (
                <CheckSquare className="w-4 h-4 text-accent flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-text-muted flex-shrink-0" />
              )}
              <h4 className="text-xs font-semibold text-text-primary">
                {model.name}
              </h4>
            </div>

            <div className="flex items-center gap-1">
              {model.is_baseline ? (
                <Badge variant="warning" className="gap-1 text-[10px] py-0">
                  <Award className="w-2.5 h-2.5" />
                  Rule 4 Baseline
                </Badge>
              ) : isRecommended ? (
                <Badge variant="accent" className="gap-1 text-[10px] py-0 font-mono">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Recommended
                </Badge>
              ) : null}
            </div>
          </div>

          <p className="text-[11px] text-text-muted pl-6 leading-relaxed">
            {model.description}
          </p>
        </div>

        <div className="flex items-center justify-between pl-6 text-[10px] font-mono text-text-muted pt-1 border-t border-border/40">
          <span>Model ID: {model.id}</span>
          <span>{isSelected ? "Active in CV" : "Inactive"}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span>Candidate Algorithms ({selectedModelIds.length} Selected)</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Review the AI-recommended algorithms or add extra models from the full 24-model suite.
          </p>
        </div>

        {/* Primary Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-text-muted whitespace-nowrap">
            Evaluation Metric:
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

      {/* Tier 1: AI Recommended Models */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>AI Recommended Estimators</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendedModels.map((m) => renderModelItem(m, true))}
        </div>
      </div>

      {/* Tier 2: Expandable Algorithm Library */}
      {additionalModels.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border/80">
          <button
            type="button"
            onClick={() => setShowAllModels(!showAllModels)}
            className="flex items-center justify-between w-full p-2.5 rounded-md bg-surface-subtle border border-border hover:bg-surface-subtle/80 transition-colors text-xs font-mono text-text-secondary"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>
                {showAllModels
                  ? "Hide Additional Algorithms"
                  : `Browse Additional Algorithms (${additionalModels.length} more available)`}
              </span>
            </div>
            {showAllModels ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {showAllModels && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {additionalModels.map((m) => renderModelItem(m, false))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
