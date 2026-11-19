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
        {/* Overall Health Score Card */}
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

          <div className="w-12 h-12 rounded-card border border-border bg-surface-subtle flex items-center justify-center shrink-0">
            {quality_score >= 80 ? (
              <ShieldCheck className="w-6 h-6 text-success" />
            ) : quality_score >= 50 ? (
              <AlertTriangle className="w-6 h-6 text-warning" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-danger" />
            )}
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
    </div>
  );
}
