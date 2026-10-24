"use client";

import { useState } from "react";
import { Network, AlertTriangle, Layers } from "lucide-react";
import { CorrelationMatrix } from "@/lib/types";

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
      <div className="p-8 rounded-xl border border-hairline bg-surface-1 text-center space-y-2">
        <Network className="w-6 h-6 text-ink-subtle mx-auto" />
        <p className="text-xs font-mono text-ink-muted">
          Need at least 2 numeric features to compute Pearson linear correlation.
        </p>
      </div>
    );
  }

  const { columns, values, high_correlations } = matrix;

  const getCellBg = (val: number | null) => {
    if (val === null || val === undefined) return "bg-surface-3/30 text-ink-faint";
    if (val === 1) return "bg-brand-lavender/30 text-brand-hover font-bold";
    if (val > 0) {
      if (val >= 0.7) return "bg-telemetry-cyan/25 text-telemetry-cyan font-semibold";
      if (val >= 0.4) return "bg-telemetry-cyan/15 text-telemetry-cyan";
      return "bg-telemetry-cyan/5 text-ink-muted";
    }
    if (val < 0) {
      if (val <= -0.7) return "bg-telemetry-rose/30 text-telemetry-rose font-semibold";
      if (val <= -0.4) return "bg-telemetry-rose/20 text-telemetry-rose";
      return "bg-telemetry-rose/5 text-ink-muted";
    }
    return "bg-surface-2 text-ink-subtle";
  };

  return (
    <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-5">
      {/* Header and Cell Hover Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Network className="w-4 h-4 text-brand-hover" />
            Pairwise Pearson Correlation Matrix
          </h3>
          <p className="text-xs text-ink-muted">
            Measures linear dependencies between continuous variables (-1.0 to +1.0).
          </p>
        </div>

        {hoveredCell ? (
          <div className="px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 font-mono text-xs flex items-center gap-2">
            <span className="text-ink font-semibold">
              {hoveredCell.featureA} ↔ {hoveredCell.featureB}:
            </span>
            <span
              className={`font-bold ${
                (hoveredCell.val ?? 0) > 0 ? "text-telemetry-cyan" : "text-telemetry-rose"
              }`}
            >
              r = {hoveredCell.val !== null ? hoveredCell.val.toFixed(4) : "N/A"}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-ink-subtle">
            Hover any cell to inspect correlation coefficient
          </span>
        )}
      </div>

      {/* Multicollinearity Warning Banner */}
      {high_correlations && high_correlations.length > 0 && (
        <div className="p-3.5 rounded-lg border border-telemetry-amber/30 bg-telemetry-amber/10 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-telemetry-amber mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-telemetry-amber">
              Multicollinearity Risk Detected ({high_correlations.length} Pairs)
            </h4>
            <p className="text-[11.5px] text-ink-muted">
              Features with |r| ≥ 0.85 contain redundant information and can inflate coefficient variance in linear models.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {high_correlations.map((pair, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-1 border border-telemetry-amber/30 text-ink font-medium"
                >
                  {pair.feature_a} ↔ {pair.feature_b} (r = {pair.correlation.toFixed(2)})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Matrix Table */}
      <div className="rounded-lg border border-hairline overflow-x-auto bg-surface-2/40 max-h-96">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-surface-2/90 sticky top-0 z-10">
              <th className="px-3 py-2.5 text-left text-ink-subtle text-[11px] font-medium border-r border-hairline sticky left-0 bg-surface-2">
                Features
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-ink-muted text-[11px] font-medium border-r border-hairline last:border-r-0 whitespace-nowrap max-w-[120px] truncate"
                  title={col}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowName, rowIdx) => (
              <tr key={rowName} className="border-b border-hairline/50 last:border-b-0">
                <td
                  className="px-3 py-2 text-left font-semibold text-ink text-[11px] border-r border-hairline whitespace-nowrap max-w-[140px] truncate sticky left-0 bg-surface-1"
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
                      className={`px-3 py-2 border-r border-hairline/40 last:border-r-0 transition-colors cursor-pointer text-[11px] ${getCellBg(
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

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-[10px] font-mono text-ink-subtle pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-telemetry-rose/30 border border-telemetry-rose/50" />
          Negative (-1.0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-surface-3 border border-hairline" />
          Neutral (0.0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-telemetry-cyan/25 border border-telemetry-cyan/50" />
          Positive (+1.0)
        </span>
      </div>
    </div>
  );
}
