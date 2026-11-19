"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { DataQualityWarning } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useELI5 } from "@/components/eli5/eli5-context";
import { ELI5Badge } from "@/components/eli5/eli5-badge";

interface QualityWarningsListProps {
  warnings: DataQualityWarning[];
}

export function QualityWarningsList({ warnings }: QualityWarningsListProps) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const { isELI5 } = useELI5();

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

  const getActionPlan = (code: string) => {
    switch (code) {
      case "CONSTANT_COLUMN":
        return "AutoMLens Pipeline: Column will be dropped inside sklearn Pipeline (zero predictive signal).";
      case "HIGH_MISSINGNESS":
        return "AutoMLens Pipeline: Automatically imputed inside CV folds (Median for numeric, Mode for categorical) with zero test leakage.";
      case "DUPLICATE_ROWS":
        return "AutoMLens Rule: Retained in dataset to avoid altering true distribution; cross-validation folds will evaluate real sample density.";
      case "OUTLIERS_DETECTED":
        return "AutoMLens Rule 6: Preserved without auto-removal. Tree models (RandomForest, LightGBM) are naturally robust to extreme values.";
      case "HIGH_CARDINALITY":
        return "AutoMLens Pipeline: Grouped or encoded using one-hot/ordinal encoding to prevent feature matrix dimension explosion.";
      case "HIGH_MULTICOLLINEARITY":
        return "AutoMLens Strategy: Highlighted in Step 2; tree-based algorithms or L2 regularization will be favored over plain linear models.";
      default:
        return "AutoMLens Preprocessing: Handled safely within fold-isolated preprocessing.";
    }
  };

  const getELI5TermKey = (code: string) => {
    switch (code) {
      case "CONSTANT_COLUMN":
        return "constant_columns";
      case "HIGH_MISSINGNESS":
        return "high_missingness";
      case "OUTLIERS_DETECTED":
        return "iqr_outliers";
      case "HIGH_CARDINALITY":
        return "high_cardinality";
      case "HIGH_MULTICOLLINEARITY":
        return "multicollinearity";
      default:
        return "";
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <span>
              {isELI5
                ? "Data Quality Notes & Action Plans"
                : "Data Quality & Preprocessing Advisories"}
            </span>
          </h3>
          <p className="text-xs text-text-muted">
            {isELI5
              ? "Things AutoMLens spotted in your data, and how the machine learning system will safely fix them."
              : "Deterministic rule engine findings to guide missing value imputation, outlier handling, and column filtering."}
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
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {filteredWarnings.map((w, idx) => {
            const termKey = getELI5TermKey(w.code);
            return (
              <div
                key={idx}
                className="p-3 rounded-card border border-border bg-surface-subtle flex flex-col justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(w.severity)}
                    {w.column && (
                      <span className="font-mono text-text-primary font-medium bg-surface px-1.5 py-0.5 rounded-button text-[11px] border border-border">
                        {w.column}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-text-muted">
                      [{w.code}]
                    </span>
                    {termKey && <ELI5Badge termKey={termKey} fallbackText="" />}
                  </div>
                  <p className="text-text-secondary leading-relaxed text-[11.5px]">
                    {w.message}
                  </p>
                </div>

                {/* Automated Remediation Action Plan */}
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono bg-surface border border-border/80 rounded-button px-2.5 py-1 text-accent">
                  <Wrench className="w-3 h-3 text-accent shrink-0" />
                  <span className="truncate">{getActionPlan(w.code)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
