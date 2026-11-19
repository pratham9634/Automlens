"use client";

import { useState, useMemo } from "react";
import { Network, Filter, Info } from "lucide-react";
import { CorrelationMatrix } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { AlertRow } from "@/components/ui/alert-row";
import { Badge } from "@/components/ui/badge";
import { useELI5 } from "@/components/eli5/eli5-context";
import { ELI5Badge } from "@/components/eli5/eli5-badge";

interface CorrelationHeatmapProps {
  matrix?: CorrelationMatrix | null;
}

export function CorrelationHeatmap({ matrix }: CorrelationHeatmapProps) {
  const { isELI5 } = useELI5();
  const [filterHighOnly, setFilterHighOnly] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    featureA: string;
    featureB: string;
    val: number | null;
  } | null>(null);

  const { columns, values, high_correlations } = matrix || {
    columns: [],
    values: [],
    high_correlations: [],
  };

  // Determine subset of columns that have at least one correlation |r| >= 0.70 (excluding diagonal r=1.0)
  const correlatedColIndices = useMemo(() => {
    if (!matrix || matrix.columns.length < 2) return [];
    const set = new Set<number>();
    for (let i = 0; i < matrix.columns.length; i++) {
      for (let j = 0; j < matrix.columns.length; j++) {
        if (i !== j) {
          const val = matrix.values[i]?.[j];
          if (val !== null && val !== undefined && Math.abs(val) >= 0.7) {
            set.add(i);
            set.add(j);
          }
        }
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [matrix]);

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

  const activeColIndices = filterHighOnly && correlatedColIndices.length > 0
    ? correlatedColIndices
    : columns.map((_, i) => i);

  const activeColumns = activeColIndices.map((i) => columns[i]);

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
            <span>{isELI5 ? "Column Similarity Map" : "Pairwise Pearson Correlation Matrix"}</span>
            <ELI5Badge termKey="pearson_correlation" fallbackText="" />
          </h3>
          <p className="text-xs text-text-muted">
            {isELI5
              ? "Shows which number columns rise and fall together (-1.00 to +1.00)."
              : "Measures linear dependencies between continuous variables (-1.00 to +1.00)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* High Collinearity Filter Toggle */}
          {correlatedColIndices.length > 0 && correlatedColIndices.length < columns.length && (
            <button
              type="button"
              onClick={() => setFilterHighOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-button text-xs font-mono border transition-colors cursor-pointer ${
                filterHighOnly
                  ? "bg-accent/15 border-accent text-accent font-semibold"
                  : "bg-surface-subtle border-border text-text-muted hover:text-text-primary"
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>
                {filterHighOnly
                  ? `Showing Correlated (${activeColumns.length})`
                  : `Filter High Collinearity (|r| ≥ 0.7)`}
              </span>
            </button>
          )}

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
            <span className="text-[11px] font-mono text-text-muted hidden md:inline">
              Hover any cell to inspect coefficient
            </span>
          )}
        </div>
      </div>

      {/* Multicollinearity Warning Banner */}
      {high_correlations && high_correlations.length > 0 && (
        <AlertRow
          variant="warning"
          title={`Multicollinearity Risk Detected (${high_correlations.length} Pairs)`}
        >
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <p className="text-[11.5px] text-text-secondary">
                Features with |r| ≥ 0.85 contain redundant information and can inflate coefficient variance in linear models. Tree ensembles (RandomForest, LightGBM) are naturally robust to this.
              </p>
              <ELI5Badge termKey="multicollinearity" fallbackText="" />
            </div>
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
                Features ({activeColumns.length})
              </th>
              {activeColumns.map((col) => (
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
            {activeColIndices.map((origRowIdx) => {
              const rowName = columns[origRowIdx];
              return (
                <tr key={rowName} className="border-b border-border/70 last:border-b-0">
                  <td
                    className="px-3 py-2 text-left font-medium text-text-primary text-[11px] border-r border-border whitespace-nowrap max-w-[140px] truncate sticky left-0 bg-surface"
                    title={rowName}
                  >
                    {rowName}
                  </td>
                  {activeColIndices.map((origColIdx) => {
                    const colName = columns[origColIdx];
                    const val = values[origRowIdx]?.[origColIdx] ?? null;
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend & Academic Note */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-text-muted gap-2">
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

        <p className="text-[10.5px] font-mono text-text-subtle leading-relaxed flex items-center gap-1">
          <Info className="w-3 h-3 text-text-muted shrink-0" />
          <span>
            Pearson measures linear co-dependence only. Downstream non-linear algorithms (RandomForest, LightGBM) automatically discover non-linear and interaction effects.
          </span>
        </p>
      </div>
    </Card>
  );
}
