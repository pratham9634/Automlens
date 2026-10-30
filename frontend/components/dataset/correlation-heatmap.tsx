"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { CorrelationMatrix } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AlertRow } from "@/components/ui/alert-row";
import { Badge } from "@/components/ui/badge";

interface CorrelationHeatmapProps {
  matrix?: CorrelationMatrix | null;
}

export function CorrelationHeatmap({ matrix }: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    featureA: string;
    featureB: string;
    val: number | null;
  } | null>(null);

  if (!matrix || matrix.columns.length < 2) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Network className="w-6 h-6 text-text-muted mx-auto" />
        <p className="text-xs font-mono text-text-muted">
          Need at least 2 numeric features to compute Pearson linear correlation.
        </p>
      </Card>
    );
  }

  const { columns, values, high_correlations } = matrix;

  const getCellBg = (val: number | null) => {
    if (val === null || val === undefined) return "bg-surface-subtle text-text-subtle";
    if (val === 1) return "bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 font-bold";
    if (val > 0) {
      if (val >= 0.7) return "bg-sky-500/35 text-sky-800 dark:text-sky-200 font-semibold";
      if (val >= 0.4) return "bg-sky-500/20 text-sky-700 dark:text-sky-300 font-medium";
      return "bg-sky-500/10 text-text-secondary";
    }
    if (val < 0) {
      if (val <= -0.7) return "bg-rose-500/35 text-rose-800 dark:text-rose-200 font-semibold";
      if (val <= -0.4) return "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-medium";
      return "bg-rose-500/10 text-text-secondary";
    }
    return "bg-surface-subtle text-text-muted";
  };

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      {/* Header and Cell Hover Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Network className="w-4 h-4 text-accent" />
            Pairwise Pearson Correlation Matrix
          </h3>
          <p className="text-xs text-text-muted">
            Measures linear dependencies between continuous variables (-1.00 to +1.00).
          </p>
        </div>

        {hoveredCell ? (
          <div className="px-3 py-1.5 rounded-button border border-border bg-surface-subtle font-mono text-xs flex items-center gap-2">
            <span className="text-text-primary font-medium">
              {hoveredCell.featureA} ↔ {hoveredCell.featureB}:
            </span>
            <span
              className={`font-bold tabular-nums ${
                (hoveredCell.val ?? 0) > 0 ? "text-info" : "text-danger"
              }`}
            >
              r = {hoveredCell.val !== null ? hoveredCell.val.toFixed(4) : "N/A"}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-text-muted">
            Hover any cell to inspect correlation coefficient
          </span>
        )}
      </div>

      {/* Multicollinearity Warning Banner */}
      {high_correlations && high_correlations.length > 0 && (
        <AlertRow
          variant="warning"
          title={`Multicollinearity Risk Detected (${high_correlations.length} Pairs)`}
        >
          <div className="space-y-1.5 pt-1">
            <p className="text-[11.5px] text-text-secondary">
              Features with |r| ≥ 0.85 contain redundant information and can inflate coefficient variance in linear models.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {high_correlations.map((pair, idx) => (
                <Badge key={idx} variant="warning" size="sm" className="font-mono">
                  {pair.feature_a} ↔ {pair.feature_b} (r = {pair.correlation.toFixed(2)})
                </Badge>
              ))}
            </div>
          </div>
        </AlertRow>
      )}

      {/* Interactive Matrix Table */}
      <div className="rounded-card border border-border overflow-x-auto bg-surface-subtle max-h-96">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface sticky top-0 z-10">
              <th className="px-3 py-2.5 text-left text-text-muted text-[11px] font-medium border-r border-border sticky left-0 bg-surface">
                Features
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-text-muted text-[11px] font-medium border-r border-border last:border-r-0 whitespace-nowrap max-w-[120px] truncate"
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowName, rowIdx) => (
              <tr key={rowName} className="border-b border-border/70 last:border-b-0">
                <td
                  className="px-3 py-2 text-left font-medium text-text-primary text-[11px] border-r border-border whitespace-nowrap max-w-[140px] truncate sticky left-0 bg-surface"
                  title={rowName}
                >
                  {rowName}
                </td>
                {columns.map((colName, colIdx) => {
                  const val = values[rowIdx]?.[colIdx] ?? null;
                  return (
                    <td
                      key={colName}
                      onMouseEnter={() =>
                        setHoveredCell({ featureA: rowName, featureB: colName, val })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`px-3 py-2 border-r border-border/60 last:border-r-0 transition-colors cursor-pointer text-[11px] tabular-nums ${getCellBg(
                        val
                      )}`}
                    >
                      {val !== null ? val.toFixed(2) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-text-muted pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-rose-500/35 inline-block border border-rose-500/40" />
            Negative (r &lt; 0)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-surface-subtle inline-block border border-border" />
            Neutral (r ≈ 0)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-sky-500/35 inline-block border border-sky-500/40" />
            Positive (r &gt; 0)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-cyan-500/25 inline-block border border-cyan-500/40" />
            Identity (r = 1.0)
          </span>
        </div>
        <span>Pearson product-moment</span>
      </div>
    </Card>
  );
}
