"use client";

import { ShieldCheck, AlertTriangle, ShieldAlert, CopyCheck, FileX, Sliders } from "lucide-react";
import { DatasetProfileResponse } from "@/lib/types";

interface QualityScoreGaugeProps {
  profile: DatasetProfileResponse;
}

export function QualityScoreGauge({ profile }: QualityScoreGaugeProps) {
  const { quality_score, duplicate_rows_count, duplicate_rows_percentage, warnings } = profile;

  // Determine score color tier
  const scoreColor =
    quality_score >= 80
      ? "text-telemetry-emerald border-telemetry-emerald/30 bg-telemetry-emerald/10"
      : quality_score >= 50
      ? "text-telemetry-amber border-telemetry-amber/30 bg-telemetry-amber/10"
      : "text-telemetry-rose border-telemetry-rose/30 bg-telemetry-rose/10";

  const highWarnings = warnings.filter((w) => w.severity === "high").length;
  const mediumWarnings = warnings.filter((w) => w.severity === "medium").length;
  const constantColumns = warnings.filter((w) => w.code === "CONSTANT_COLUMN").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Overall Health Score Card */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            Data Quality Score
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-ink tracking-tight">
              {quality_score.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-ink-subtle">/ 100</span>
          </div>
          <p className="text-[11px] text-ink-muted">
            {quality_score >= 80
              ? "High data fidelity, ready for ML"
              : quality_score >= 50
              ? "Moderate data issues detected"
              : "Severe data quality anomalies"}
          </p>
        </div>

        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${scoreColor}`}
        >
          {quality_score >= 80 ? (
            <ShieldCheck className="w-7 h-7" />
          ) : quality_score >= 50 ? (
            <AlertTriangle className="w-7 h-7" />
          ) : (
            <ShieldAlert className="w-7 h-7" />
          )}
        </div>
      </div>

      {/* Duplicate Rows Metric */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-[11px] font-mono uppercase tracking-wider">
            Duplicate Rows
          </span>
          <CopyCheck className="w-4 h-4 text-telemetry-cyan" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-ink">
            {duplicate_rows_count.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-ink-muted pt-0.5">
            {duplicate_rows_percentage > 0 ? (
              <span className="text-telemetry-amber">
                {duplicate_rows_percentage.toFixed(1)}% of total rows
              </span>
            ) : (
              <span className="text-telemetry-emerald">0% duplicates detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Constant Features Flag */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-[11px] font-mono uppercase tracking-wider">
            Zero Variance Cols
          </span>
          <FileX className="w-4 h-4 text-telemetry-rose" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-ink">
            {constantColumns}
          </div>
          <div className="text-[11px] font-mono text-ink-muted pt-0.5">
            {constantColumns > 0 ? (
              <span className="text-telemetry-rose font-medium">Constant features found</span>
            ) : (
              <span className="text-telemetry-emerald">All features vary</span>
            )}
          </div>
        </div>
      </div>

      {/* Quality Issues Summary */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-[11px] font-mono uppercase tracking-wider">
            Quality Warnings
          </span>
          <Sliders className="w-4 h-4 text-brand-hover" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-ink">
            {warnings.length}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono pt-0.5">
            {highWarnings > 0 && (
              <span className="text-telemetry-rose">{highWarnings} High</span>
            )}
            {mediumWarnings > 0 && (
              <span className="text-telemetry-amber">{mediumWarnings} Med</span>
            )}
            {warnings.length === 0 && (
              <span className="text-telemetry-emerald">No warnings</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
