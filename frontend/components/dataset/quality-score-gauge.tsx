"use client";

import { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  CopyCheck,
  FileX,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from "lucide-react";
import { DatasetProfileResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useELI5 } from "@/components/eli5/eli5-context";
import { ELI5Badge } from "@/components/eli5/eli5-badge";

interface QualityScoreGaugeProps {
  profile: DatasetProfileResponse;
}

export function QualityScoreGauge({ profile }: QualityScoreGaugeProps) {
  const { quality_score, duplicate_rows_count, duplicate_rows_percentage, warnings, score_breakdown } =
    profile;
  const { isELI5 } = useELI5();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const highWarnings = warnings.filter((w) => w.severity === "high").length;
  const mediumWarnings = warnings.filter((w) => w.severity === "medium").length;
  const constantColumns = warnings.filter((w) => w.code === "CONSTANT_COLUMN").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Overall Health Score Card with Semi-Circular Gauge */}
        <Card className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                {isELI5 ? "Cleanliness Grade" : "Data Quality Score"}
              </span>
              <ELI5Badge termKey="data_quality_score" fallbackText="" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-text-primary tracking-tight tabular-nums">
                {quality_score.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-text-muted">/ 100</span>
            </div>
            <p className="font-marker font-bold text-xs text-accent">
              {quality_score >= 80
                ? "★ High data fidelity, ready for 5-fold ML"
                : quality_score >= 50
                ? "★ Moderate data quality findings"
                : "★ Severe data quality anomalies"}
            </p>
          </div>

          {/* SVG Semi-Circular Arc Health Gauge */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              {/* Background Arc */}
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="currentColor"
                className="text-surface-subtle"
                strokeWidth="6"
              />
              {/* Active Progress Arc */}
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={
                  quality_score >= 80 ? "#10B981" : quality_score >= 50 ? "#F59E0B" : "#EF4444"
                }
                strokeWidth="6"
                strokeDasharray="163.36"
                strokeDashoffset={163.36 * (1 - Math.min(100, Math.max(0, quality_score)) / 100)}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {quality_score >= 80 ? (
                <ShieldCheck className="w-5 h-5 text-success" />
              ) : quality_score >= 50 ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-danger" />
              )}
            </div>
          </div>
        </Card>

        {/* Duplicate Rows Metric */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Duplicate Rows
            </span>
            <CopyCheck className="w-4 h-4 text-info" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {duplicate_rows_count.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-text-muted pt-0.5">
              {duplicate_rows_percentage > 0 ? (
                <span className="text-warning font-medium tabular-nums">
                  {duplicate_rows_percentage.toFixed(1)}% of total rows
                </span>
              ) : (
                <span className="text-success">0% duplicates detected</span>
              )}
            </div>
          </div>
        </Card>

        {/* Constant Features Flag */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wider">
                {isELI5 ? "Unchanging Cols" : "Zero Variance Cols"}
              </span>
              <ELI5Badge termKey="constant_columns" fallbackText="" />
            </div>
            <FileX className="w-4 h-4 text-danger" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {constantColumns}
            </div>
            <div className="text-[11px] font-mono text-text-muted pt-0.5">
              {constantColumns > 0 ? (
                <span className="text-danger font-medium">Constant features found</span>
              ) : (
                <span className="text-success">All features vary</span>
              )}
            </div>
          </div>
        </Card>

        {/* Quality Issues Summary */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Quality Warnings
            </span>
            <Sliders className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {warnings.length}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono pt-0.5">
              {highWarnings > 0 && (
                <Badge variant="danger" size="sm" className="tabular-nums">
                  {highWarnings} High
                </Badge>
              )}
              {mediumWarnings > 0 && (
                <Badge variant="warning" size="sm" className="tabular-nums">
                  {mediumWarnings} Med
                </Badge>
              )}
              {warnings.length === 0 && (
                <span className="text-success">Clean dataset</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Academic Score Breakdown Bar */}
      <div className="rounded-card border border-border bg-surface p-3 text-xs">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="w-full flex items-center justify-between text-left text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 font-mono">
            <Info className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-text-primary">
              Deterministic Quality Formula &amp; Deduction Breakdown
            </span>
            <span className="text-[10px] text-text-muted hidden sm:inline">
              (starts at 100.0, bounded penalties for missing cells, duplicates, zero-variance &amp; outliers)
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-accent">
            <span>{showBreakdown ? "Hide Details" : "Inspect Formula"}</span>
            {showBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-button bg-surface-subtle border border-border">
              <span className="text-text-muted uppercase text-[10px] block">Base Score</span>
              <span className="text-base font-bold text-text-primary">100.0</span>
            </div>
            <div className="p-2.5 rounded-button bg-surface-subtle border border-border">
              <span className="text-text-muted uppercase text-[10px] block">Missing Penalty</span>
              <span className="text-base font-bold text-danger">
                -{score_breakdown?.missing_penalty?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-[9px] text-text-subtle block">max -30.0</span>
            </div>
            <div className="p-2.5 rounded-button bg-surface-subtle border border-border">
              <span className="text-text-muted uppercase text-[10px] block">Duplicates Penalty</span>
              <span className="text-base font-bold text-danger">
                -{score_breakdown?.duplicate_penalty?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-[9px] text-text-subtle block">max -15.0</span>
            </div>
            <div className="p-2.5 rounded-button bg-surface-subtle border border-border">
              <span className="text-text-muted uppercase text-[10px] block">Constant Cols Penalty</span>
              <span className="text-base font-bold text-danger">
                -{score_breakdown?.constant_penalty?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-[9px] text-text-subtle block">max -25.0</span>
            </div>
            <div className="p-2.5 rounded-button bg-surface-subtle border border-border">
              <span className="text-text-muted uppercase text-[10px] block">IQR Outlier Penalty</span>
              <span className="text-base font-bold text-danger">
                -{score_breakdown?.outlier_penalty?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-[9px] text-text-subtle block">max -15.0</span>
            </div>
          </div>
        )}
      </div>

      {/* Executive Data Health Briefing */}
      {(() => {
        const totalRows = profile.total_rows || 1;
        const totalCols = profile.total_columns || 1;
        const totalCells = totalRows * totalCols;
        const totalNulls =
          profile.numeric_columns.reduce((a, c) => a + c.null_count, 0) +
          profile.categorical_columns.reduce((a, c) => a + c.null_count, 0);
        const completenessPct = Math.max(0, 100 - (totalNulls / Math.max(totalCells, 1)) * 100);
        const ratio = Math.round(totalRows / Math.max(totalCols, 1));
        const outlierColsCount = profile.numeric_columns.filter((c) => c.outlier_count > 0).length;

        return (
          <div className="p-3.5 sm:p-4 rounded-card border border-border bg-surface-subtle/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Executive Data Health Briefing</span>
              </span>
              <span className="text-[10px] text-text-muted">Automated Diagnostic Assessment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono pt-0.5">
              <div className="p-2.5 rounded-button bg-surface border border-border space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  1. Completeness ({completenessPct.toFixed(1)}%)
                </span>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {completenessPct >= 95
                    ? "High density across features. Standard median/mode imputation in CV folds will preserve maximum sample fidelity."
                    : "Missingness detected in specific columns. High-null features will be evaluated for automated dropping in Step 2."}
                </p>
              </div>

              <div className="p-2.5 rounded-button bg-surface border border-border space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-info flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" />
                  2. Dimensionality ({ratio}:1 Ratio)
                </span>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {ratio >= 15
                    ? `${totalRows.toLocaleString()} samples over ${totalCols} columns provides sufficient power for 5-fold CV without overfitting.`
                    : "Compact sample-to-feature ratio. Regularized models (Ridge/Lasso) and shallow trees will be favored."}
                </p>
              </div>

              <div className="p-2.5 rounded-button bg-surface border border-border space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-warning flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  3. Outliers ({outlierColsCount} Cols Flagged)
                </span>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {constantColumns === 0
                    ? "All columns exhibit variance (0 constant columns). Extreme values are preserved per Rule 6 without silent loss."
                    : `${constantColumns} constant zero-variance feature(s) detected. Automatically pruned inside sklearn Pipeline.`}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
