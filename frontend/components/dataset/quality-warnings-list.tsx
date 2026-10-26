"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DataQualityWarning } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        return <Badge variant="danger" size="sm">High</Badge>;
      case "medium":
        return <Badge variant="warning" size="sm">Medium</Badge>;
      default:
        return <Badge variant="info" size="sm">Low</Badge>;
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="card-title text-text-primary">
            Data Quality &amp; Preprocessing Advisories
          </h3>
          <p className="text-xs text-text-muted">
            Deterministic rule engine findings to guide missing value imputation, outlier handling, and column filtering.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 rounded-card border border-border bg-surface-subtle p-0.5 text-xs font-mono self-start sm:self-auto">
          {(["all", "high", "medium", "low"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2.5 py-1 rounded-[6px] text-[11px] capitalize transition-colors cursor-pointer ${
                filter === lvl
                  ? "bg-surface text-text-primary font-semibold shadow-xs border border-border/80"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {filteredWarnings.length === 0 ? (
        <div className="p-6 rounded-card border border-dashed border-border bg-surface-subtle/50 text-center flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-success" />
          <p className="text-xs font-medium text-text-primary">
            {filter === "all"
              ? "No data quality warnings detected. The dataset is clean."
              : `No ${filter}-severity warnings found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredWarnings.map((w, idx) => (
            <div
              key={idx}
              className="p-3 rounded-card border border-border bg-surface-subtle flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(w.severity)}
                  {w.column && (
                    <span className="font-mono text-text-primary font-medium bg-surface px-1.5 py-0.5 rounded-button text-[11px] border border-border">
                      {w.column}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-muted">
                    [{w.code}]
                  </span>
                </div>
                <p className="text-text-secondary leading-relaxed text-[11.5px]">
                  {w.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
