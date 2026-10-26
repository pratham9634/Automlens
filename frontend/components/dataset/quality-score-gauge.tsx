"use client";

import { ShieldCheck, AlertTriangle, ShieldAlert, CopyCheck, FileX, Sliders } from "lucide-react";
import { DatasetProfileResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QualityScoreGaugeProps {
  profile: DatasetProfileResponse;
}

export function QualityScoreGauge({ profile }: QualityScoreGaugeProps) {
  const { quality_score, duplicate_rows_count, duplicate_rows_percentage, warnings } = profile;

  const scoreBadgeVariant =
    quality_score >= 80 ? "success" : quality_score >= 50 ? "warning" : "danger";

  const highWarnings = warnings.filter((w) => w.severity === "high").length;
  const mediumWarnings = warnings.filter((w) => w.severity === "medium").length;
  const constantColumns = warnings.filter((w) => w.code === "CONSTANT_COLUMN").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Overall Health Score Card */}
      <Card className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            Data Quality Score
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-text-primary tracking-tight tabular-nums">
              {quality_score.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-text-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-text-muted">
            {quality_score >= 80
              ? "High data fidelity, ready for ML"
              : quality_score >= 50
              ? "Moderate data quality findings"
              : "Severe data quality anomalies"}
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
          <span className="text-[11px] font-mono uppercase tracking-wider">
            Zero Variance Cols
          </span>
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
  );
}
