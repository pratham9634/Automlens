"use client";

import { useState } from "react";
import {
  BarChart2,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { NumericColumnProfile, CategoricalColumnProfile } from "@/lib/types";

interface FeatureDistributionViewerProps {
  numericColumns: NumericColumnProfile[];
  categoricalColumns: CategoricalColumnProfile[];
}

export function FeatureDistributionViewer({
  numericColumns,
  categoricalColumns,
}: FeatureDistributionViewerProps) {
  const [activeType, setActiveType] = useState<"numeric" | "categorical">(
    numericColumns.length > 0 ? "numeric" : "categorical"
  );

  const [selectedNumIndex, setSelectedNumIndex] = useState(0);
  const [selectedCatIndex, setSelectedCatIndex] = useState(0);
  const [hoveredBinIndex, setHoveredBinIndex] = useState<number | null>(null);

  const currentNumeric = numericColumns[selectedNumIndex];
  const currentCategorical = categoricalColumns[selectedCatIndex];

  // Compute maximum bin count for SVG scaling
  const maxBinCount = currentNumeric?.histogram
    ? Math.max(...currentNumeric.histogram.map((b) => b.count), 1)
    : 1;

  return (
    <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-5">
      {/* Header and Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-hover" />
            Feature Distribution & Statistics
          </h3>
          <p className="text-xs text-ink-muted">
            Univariate distributions, percentiles, and IQR outlier boundaries.
          </p>
        </div>

        {/* Feature Type Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2 p-1 text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setActiveType("numeric")}
            disabled={numericColumns.length === 0}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              activeType === "numeric"
                ? "bg-surface-3 text-ink font-semibold"
                : "text-ink-muted hover:text-ink disabled:opacity-40"
            }`}
          >
            Numeric ({numericColumns.length})
          </button>
          <button
            onClick={() => setActiveType("categorical")}
            disabled={categoricalColumns.length === 0}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              activeType === "categorical"
                ? "bg-surface-3 text-ink font-semibold"
                : "text-ink-muted hover:text-ink disabled:opacity-40"
            }`}
          >
            Categorical ({categoricalColumns.length})
          </button>
        </div>
      </div>

      {/* Feature Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {activeType === "numeric"
          ? numericColumns.map((col, idx) => (
              <button
                key={col.name}
                onClick={() => {
                  setSelectedNumIndex(idx);
                  setHoveredBinIndex(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border transition-all ${
                  selectedNumIndex === idx
                    ? "bg-brand-lavender/10 border-brand-lavender text-brand-hover font-semibold"
                    : "bg-surface-2 border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {col.name}
              </button>
            ))
          : categoricalColumns.map((col, idx) => (
              <button
                key={col.name}
                onClick={() => setSelectedCatIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border transition-all ${
                  selectedCatIndex === idx
                    ? "bg-brand-lavender/10 border-brand-lavender text-brand-hover font-semibold"
                    : "bg-surface-2 border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {col.name}
              </button>
            ))}
      </div>

      {/* Content for Numeric Feature */}
      {activeType === "numeric" && currentNumeric && (
        <div className="space-y-4">
          {/* 9-Stat Telemetry Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
            {[
              { label: "Mean", val: currentNumeric.mean },
              { label: "Std Dev", val: currentNumeric.std },
              { label: "Min", val: currentNumeric.min },
              { label: "25% (Q1)", val: currentNumeric.q25 },
              { label: "Median", val: currentNumeric.median },
              { label: "75% (Q3)", val: currentNumeric.q75 },
              { label: "Max", val: currentNumeric.max },
              { label: "Skewness", val: currentNumeric.skewness },
              { label: "Kurtosis", val: currentNumeric.kurtosis },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-hairline bg-surface-2/60 text-center"
              >
                <div className="text-[10px] font-mono uppercase text-ink-subtle">
                  {stat.label}
                </div>
                <div className="text-xs font-mono font-semibold text-ink pt-1 truncate">
                  {stat.val !== null && stat.val !== undefined ? stat.val.toLocaleString() : "—"}
                </div>
              </div>
            ))}
          </div>

          {/* Outlier & Constant Flag Banner */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {currentNumeric.outlier_count > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-telemetry-amber/10 border border-telemetry-amber/30 text-telemetry-amber">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {currentNumeric.outlier_count.toLocaleString()} IQR outliers (
                  {currentNumeric.outlier_percentage.toFixed(1)}%)
                </span>
                <span className="text-[10px] text-ink-subtle">
                  [Rule 6: Flagged only, not removed]
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-telemetry-emerald/10 border border-telemetry-emerald/30 text-telemetry-emerald text-[11px]">
                <span>No IQR Outliers Detected</span>
              </div>
            )}

            <div className="text-ink-subtle text-[11px]">
              {currentNumeric.count.toLocaleString()} valid samples • {currentNumeric.unique_count.toLocaleString()} unique values
            </div>
          </div>

          {/* SVG 10-Bin Histogram */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-2/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-ink-muted flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-hover" />
                10-Bin Frequency Histogram
              </span>
              {hoveredBinIndex !== null && currentNumeric.histogram[hoveredBinIndex] && (
                <span className="font-mono text-xs text-brand-hover bg-brand-lavender/10 px-2 py-0.5 rounded border border-brand-lavender/30">
                  Range: [{currentNumeric.histogram[hoveredBinIndex].bin_start} →{" "}
                  {currentNumeric.histogram[hoveredBinIndex].bin_end}] :{" "}
                  <strong className="text-ink">
                    {currentNumeric.histogram[hoveredBinIndex].count.toLocaleString()}
                  </strong>{" "}
                  samples
                </span>
              )}
            </div>

            {currentNumeric.histogram.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-ink-muted">
                Insufficient data to compute histogram.
              </div>
            ) : (
              <div className="h-44 w-full flex items-end gap-1.5 pt-4 pb-2 px-2">
                {currentNumeric.histogram.map((bin, idx) => {
                  const heightPercent = Math.max(
                    (bin.count / maxBinCount) * 100,
                    4
                  );
                  const isHovered = hoveredBinIndex === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBinIndex(idx)}
                      onMouseLeave={() => setHoveredBinIndex(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                    >
                      {/* Bar Fill */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isHovered
                            ? "bg-brand-hover shadow-lg shadow-brand-glow"
                            : "bg-brand-lavender/70 hover:bg-brand-lavender"
                        }`}
                      />
                      {/* Tick Label */}
                      <span className="text-[9px] font-mono text-ink-faint truncate max-w-full pt-1.5">
                        {bin.bin_start}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content for Categorical Feature */}
      {activeType === "categorical" && currentCategorical && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-ink-muted">
              Cardinality: <strong className="text-ink">{currentCategorical.unique_count}</strong> distinct categories
            </span>
            <span>•</span>
            <span className="text-ink-muted">
              Valid entries: <strong className="text-ink">{currentCategorical.count.toLocaleString()}</strong>
            </span>

            {currentCategorical.is_high_cardinality && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30">
                <AlertCircle className="w-3 h-3" /> High Cardinality
              </span>
            )}
          </div>

          {/* Top Category Distribution Bars */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {currentCategorical.top_categories.map((cat, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-hairline bg-surface-2/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-ink truncate max-w-xs" title={cat.value}>
                    {cat.value === "" ? "(empty string)" : cat.value}
                  </span>
                  <span className="text-ink-muted">
                    {cat.count.toLocaleString()} ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                    className="h-full bg-telemetry-cyan rounded-full transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
