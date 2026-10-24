"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { DataQualityWarning } from "@/lib/types";

interface QualityWarningsListProps {
  warnings: DataQualityWarning[];
}

export function QualityWarningsList({ warnings }: QualityWarningsListProps) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const filteredWarnings =
    filter === "all" ? warnings : warnings.filter((w) => w.severity === filter);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-rose/10 text-telemetry-rose border border-telemetry-rose/30">
            <AlertCircle className="w-3 h-3" /> High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30">
            <AlertTriangle className="w-3 h-3" /> Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30">
            <Info className="w-3 h-3" /> Low
          </span>
        );
    }
  };

  return (
    <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            Data Quality & Preprocessing Advisories
          </h3>
          <p className="text-xs text-ink-muted">
            Deterministic rule engine findings to guide missing value imputation, outlier handling, and column filtering.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2 p-1 text-xs font-mono self-start sm:self-auto">
          {(["all", "high", "medium", "low"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                filter === lvl
                  ? "bg-surface-3 text-ink font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {filteredWarnings.length === 0 ? (
        <div className="p-6 rounded-lg border border-hairline-subtle bg-surface-2/40 text-center flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-telemetry-emerald" />
          <p className="text-xs font-medium text-ink">
            {filter === "all"
              ? "No data quality warnings detected! The dataset is clean."
              : `No ${filter}-severity warnings found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredWarnings.map((w, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-hairline bg-surface-2/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(w.severity)}
                  {w.column && (
                    <span className="font-mono text-ink font-semibold bg-surface-3 px-1.5 py-0.5 rounded text-[11px] border border-hairline">
                      {w.column}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-ink-subtle">
                    [{w.code}]
                  </span>
                </div>
                <p className="text-ink-muted leading-relaxed text-[11.5px]">
                  {w.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
