"use client";

import { TargetSuggestionItem, TargetAnalysisDetailResponse, TaskType } from "@/lib/types";
import { CheckCircle2, ChevronDown, Sparkles, AlertCircle, BarChart2 } from "lucide-react";

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
    <div className="p-6 rounded-xl border border-hairline bg-surface-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <span>Target Feature Selection</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
              Rule 2 Compliant
            </span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Select the column you wish to predict. Task detection is automated as an advisory suggestion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column Selection Dropdown & Suggestions */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-ink-muted">
            Target Column
          </label>
          <div className="relative">
            <select
              value={selectedColumn}
              onChange={(e) => onSelectColumn(e.target.value)}
              disabled={loading}
              className="w-full appearance-none px-3.5 py-2.5 rounded-lg bg-surface-2 border border-hairline hover:border-hairline-strong text-ink text-xs font-mono focus:outline-none focus:border-brand-lavender transition-colors cursor-pointer"
            >
              {suggestions.map((item) => (
                <option key={item.name} value={item.name} className="bg-surface-1 text-ink py-1">
                  {item.name} {item.is_recommended ? "★ (Recommended)" : ""} — {item.dtype}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Recommendations Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-mono text-ink-subtle">Detected Target Candidates:</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((item) => {
                const isSelected = selectedColumn === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onSelectColumn(item.name)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                      isSelected
                        ? "bg-brand-lavender text-ink font-medium shadow-sm"
                        : "bg-surface-2 hover:bg-surface-3 text-ink-muted border border-hairline"
                    }`}
                  >
                    {item.is_recommended && <Sparkles className="w-3 h-3 text-brand-hover" />}
                    <span>{item.name}</span>
                    <span className="text-[10px] text-ink-faint">
                      ({Math.round(item.confidence * 100)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task Type Override (Rule 2) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-ink-muted">
              ML Task Type
            </label>
            {overrideTask && (
              <button
                type="button"
                onClick={() => onOverrideTask(null)}
                className="text-[10px] font-mono text-brand-hover hover:underline"
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
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all border ${
                    isSelected
                      ? "bg-surface-2 border-brand-lavender text-ink shadow-sm"
                      : "bg-surface-1 border-hairline text-ink-muted hover:border-hairline-strong hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-brand-lavender bg-brand-lavender"
                          : "border-hairline bg-surface-2"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-ink" />}
                    </div>
                    <span>{formatTaskName(t)}</span>
                  </div>
                  {isOverridden && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      Manual Override
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Analysis Details: Distribution & Statistics */}
      {analysis && (
        <div className="p-4 rounded-lg bg-surface-2/60 border border-hairline space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-brand-hover" />
              Target Analysis: <span className="text-brand-hover">{analysis.target_column}</span>
            </span>
            <span className="text-ink-muted">
              {analysis.distinct_count} distinct • {analysis.null_count} nulls ({analysis.null_percentage}%)
            </span>
          </div>

          <p className="text-xs text-ink-muted italic border-l-2 border-brand-lavender/50 pl-2.5">
            {analysis.reason}
          </p>

          {/* Classification: Class Distribution Breakdown */}
          {analysis.classes && analysis.classes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-hairline">
              <div className="text-[11px] font-mono text-ink-muted">Class Frequency & Balance:</div>
              <div className="space-y-1.5">
                {analysis.classes.map((cls) => (
                  <div key={cls.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink">
                      <span className="truncate max-w-[200px]">{cls.label}</span>
                      <span className="text-ink-muted">
                        {cls.count} rows ({cls.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full bg-brand-lavender rounded-full transition-all duration-300"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-hairline">
              {Object.entries(analysis.summary_stats).map(([k, v]) => (
                <div key={k} className="p-2 rounded bg-surface-1 border border-hairline">
                  <div className="text-[10px] font-mono uppercase text-ink-subtle">{k}</div>
                  <div className="text-xs font-mono font-medium text-ink mt-0.5">
                    {typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 3 }) : v}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
