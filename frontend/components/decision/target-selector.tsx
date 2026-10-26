"use client";

import { TargetSuggestionItem, TargetAnalysisDetailResponse, TaskType } from "@/lib/types";
import { CheckCircle2, ChevronDown, Sparkles, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TargetSelectorProps {
  suggestions: TargetSuggestionItem[];
  selectedColumn: string;
  onSelectColumn: (col: string) => void;
  analysis: TargetAnalysisDetailResponse | null;
  overrideTask: TaskType | null;
  onOverrideTask: (task: TaskType | null) => void;
  loading: boolean;
}

export function TargetSelector({
  suggestions,
  selectedColumn,
  onSelectColumn,
  analysis,
  overrideTask,
  onOverrideTask,
  loading,
}: TargetSelectorProps) {
  const currentTask = overrideTask || (analysis ? analysis.task_type : null);

  const formatTaskName = (t: TaskType) => {
    switch (t) {
      case "binary_classification":
        return "Binary Classification";
      case "multiclass_classification":
        return "Multiclass Classification";
      case "regression":
        return "Regression";
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <span>Target Feature &amp; Task Confirmation</span>
            <Badge variant="accent" size="sm">
              Rule 2 Compliant
            </Badge>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Select the column you wish to predict. Automated task detection is advisory and requires explicit confirmation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column Selection Dropdown & Candidates */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-text-muted">
            Target Column
          </label>
          <div className="relative">
            <select
              value={selectedColumn}
              onChange={(e) => onSelectColumn(e.target.value)}
              disabled={loading}
              className="w-full appearance-none px-3.5 py-2 rounded-input bg-surface border border-border hover:border-border-strong text-text-primary text-xs font-mono focus:outline-none focus:border-accent transition-colors cursor-pointer"
            >
              {suggestions.map((item) => (
                <option key={item.name} value={item.name} className="bg-surface text-text-primary py-1">
                  {item.name} {item.is_recommended ? "★ (Recommended)" : ""} — {item.dtype}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Recommendations Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-mono text-text-muted">Inferred Target Candidates:</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((item) => {
                const isSelected = selectedColumn === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onSelectColumn(item.name)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-button text-[11px] font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-accent text-white font-medium shadow-xs"
                        : "bg-surface-subtle hover:bg-surface-hover text-text-muted hover:text-text-primary border border-border"
                    }`}
                  >
                    {item.is_recommended && <Sparkles className="w-3 h-3 text-warning" />}
                    <span>{item.name}</span>
                    <span className="text-[10px] opacity-80 tabular-nums">
                      ({Math.round(item.confidence * 100)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task Type Selection & Override (Rule 2) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-text-muted">
              ML Task Type
            </label>
            {overrideTask && (
              <button
                type="button"
                onClick={() => onOverrideTask(null)}
                className="text-[10px] font-mono text-accent hover:underline cursor-pointer"
              >
                Reset to Auto-Inferred
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(
              [
                "binary_classification",
                "multiclass_classification",
                "regression",
              ] as TaskType[]
            ).map((t) => {
              const isSelected = currentTask === t;
              const isOverridden = overrideTask === t;

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onOverrideTask(t)}
                  className={`flex items-center justify-between px-3 py-2 rounded-card text-xs font-mono transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-surface-subtle border-accent text-text-primary font-medium"
                      : "bg-surface border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border bg-surface"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>{formatTaskName(t)}</span>
                  </div>
                  {isOverridden && (
                    <Badge variant="warning" size="sm">
                      Manual Override
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Analysis Details: Distribution & Statistics */}
      {analysis && (
        <div className="p-4 rounded-card bg-surface-subtle border border-border space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-primary font-semibold flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-accent" />
              Target Analysis: <span className="text-accent">{analysis.target_column}</span>
            </span>
            <span className="text-text-muted tabular-nums">
              {analysis.distinct_count} distinct • {analysis.null_count} nulls ({analysis.null_percentage}%)
            </span>
          </div>

          <p className="text-xs text-text-secondary italic border-l-2 border-accent/60 pl-2.5 leading-relaxed">
            {analysis.reason}
          </p>

          {/* Classification: Class Distribution Breakdown */}
          {analysis.classes && analysis.classes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-[11px] font-mono text-text-muted">Class Frequency &amp; Balance:</div>
              <div className="space-y-1.5">
                {analysis.classes.map((cls) => (
                  <div key={cls.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-text-primary">
                      <span className="truncate max-w-[200px]">{cls.label}</span>
                      <span className="text-text-muted tabular-nums">
                        {cls.count.toLocaleString()} rows ({cls.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-pill bg-surface border border-border/60 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-pill transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, cls.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regression: Summary Statistics */}
          {analysis.summary_stats && Object.keys(analysis.summary_stats).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
              {Object.entries(analysis.summary_stats).map(([k, v]) => (
                <div key={k} className="p-2 rounded-card bg-surface border border-border">
                  <div className="text-[10px] font-mono uppercase text-text-muted">{k}</div>
                  <div className="text-xs font-mono font-medium text-text-primary mt-0.5 tabular-nums">
                    {typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 3 }) : v}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
