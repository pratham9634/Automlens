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
      case "neg_root_mean_squared_error":
        return "Root Mean Squared Error (RMSE)";
      case "mae":
      case "neg_mean_absolute_error":
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
        className={`p-3.5 rounded-card border transition-all duration-160 cursor-pointer flex flex-col justify-between gap-2.5 ${
          isSelected
            ? "bg-surface-subtle border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.12)]"
            : "bg-surface border-border/80 opacity-70 hover:opacity-100 hover:border-accent/40"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {model.is_baseline ? (
                <CheckSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : isSelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-text-muted flex-shrink-0" />
              )}
              <h4 className="text-xs font-semibold text-text-primary font-sans">
                {model.name}
              </h4>
            </div>

            <div className="flex items-center gap-1">
              {model.is_baseline ? (
                <Badge variant="warning" className="gap-1 text-[10px] py-0">
                  <Award className="w-2.5 h-2.5 text-amber-400" />
                  Rule 4 Baseline
                </Badge>
              ) : isRecommended ? (
                <Badge variant="optimal" className="gap-1 text-[10px] py-0 font-mono">
                  <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                  AI Recommended
                </Badge>
              ) : null}
            </div>
          </div>

          <p className="text-[11px] text-text-muted pl-6 leading-relaxed font-sans">
            {model.description}
          </p>
        </div>

        <div className="flex items-center justify-between pl-6 text-[10px] font-mono text-text-muted pt-1 border-t border-border/40">
          <span>Model ID: {model.id}</span>
          <span className={isSelected ? "text-cyan-400 font-semibold" : "text-text-subtle"}>
            {isSelected ? "Active in CV" : "Inactive"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card accentTop="azure" className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-sans font-semibold text-sm">
              Candidate Estimators ({selectedModelIds.length} Selected)
            </span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5 font-sans">
            Review the AI-recommended algorithms or add extra models from the full 24-model suite.
          </p>
        </div>

        {/* Primary Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-text-muted whitespace-nowrap uppercase tracking-wider text-[11px]">
            Evaluation Metric:
          </label>
          <div className="relative">
            <select
              value={primaryMetric}
              onChange={(e) => onChangePrimaryMetric(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-button bg-surface border border-border/80 text-xs font-mono text-text-primary focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_8px_rgba(6,182,212,0.3)] cursor-pointer"
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
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary font-mono uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
            className="flex items-center justify-between w-full p-2.5 rounded-button bg-surface-subtle border border-border/80 hover:border-cyan-500/40 transition-colors text-xs font-mono text-text-secondary cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {showAllModels
                  ? "Hide Additional Algorithms"
                  : `Browse Additional Algorithms (${additionalModels.length} more available in 24-model suite)`}
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
