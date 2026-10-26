"use client";

import { useState } from "react";
import {
  BarChart2,
  AlertCircle,
} from "lucide-react";
import { NumericColumnProfile, CategoricalColumnProfile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const maxBinCount = currentNumeric?.histogram
    ? Math.max(...currentNumeric.histogram.map((b) => b.count), 1)
    : 1;

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      {/* Header and Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-accent" />
            Feature Distribution &amp; Statistics
          </h3>
          <p className="text-xs text-text-muted">
            Univariate distributions, statistical percentiles, and IQR outlier boundaries.
          </p>
        </div>

        {/* Feature Type Switcher */}
        <div className="flex items-center gap-1 rounded-card border border-border bg-surface-subtle p-0.5 text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setActiveType("numeric")}
            disabled={numericColumns.length === 0}
            className={`px-3 py-1 rounded-[6px] text-[11px] transition-colors cursor-pointer ${
              activeType === "numeric"
                ? "bg-surface text-text-primary font-semibold shadow-xs border border-border/80"
                : "text-text-muted hover:text-text-primary disabled:opacity-40"
            }`}
          >
            Numeric ({numericColumns.length})
          </button>
          <button
            onClick={() => setActiveType("categorical")}
            disabled={categoricalColumns.length === 0}
            className={`px-3 py-1 rounded-[6px] text-[11px] transition-colors cursor-pointer ${
              activeType === "categorical"
                ? "bg-surface text-text-primary font-semibold shadow-xs border border-border/80"
                : "text-text-muted hover:text-text-primary disabled:opacity-40"
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
                className={`px-2.5 py-1 rounded-button text-xs font-mono whitespace-nowrap border transition-all cursor-pointer ${
                  selectedNumIndex === idx
                    ? "bg-accent/10 border-accent/30 text-accent font-semibold"
                    : "bg-surface-subtle border-border text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {col.name}
              </button>
            ))
          : categoricalColumns.map((col, idx) => (
              <button
                key={col.name}
                onClick={() => setSelectedCatIndex(idx)}
                className={`px-2.5 py-1 rounded-button text-xs font-mono whitespace-nowrap border transition-all cursor-pointer ${
                  selectedCatIndex === idx
                    ? "bg-accent/10 border-accent/30 text-accent font-semibold"
                    : "bg-surface-subtle border-border text-text-muted hover:text-text-primary hover:bg-surface-hover"
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
                className="p-2.5 rounded-card border border-border bg-surface-subtle text-center"
              >
                <div className="text-[10px] font-mono uppercase text-text-muted truncate">
                  {stat.label}
                </div>
                <div className="text-xs font-mono font-semibold text-text-primary pt-1 truncate tabular-nums">
                  {stat.val !== null && stat.val !== undefined
                    ? typeof stat.val === "number"
                      ? stat.val.toLocaleString(undefined, { maximumFractionDigits: 3 })
                      : stat.val
                    : "—"}
                </div>
              </div>
            ))}
          </div>

          {/* Outlier & Constant Flag Banner */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {currentNumeric.outlier_count > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-warning/10 border border-warning/30 text-warning">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {currentNumeric.outlier_count.toLocaleString()} IQR outliers (
                  {currentNumeric.outlier_percentage.toFixed(1)}%)
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-text-muted">
                Zero IQR outliers detected in numeric span.
              </span>
            )}
          </div>

          {/* SVG Histogram */}
          {currentNumeric.histogram && currentNumeric.histogram.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">
                  Binned Frequency Histogram (10 Bins)
                </span>
                {hoveredBinIndex !== null && (
                  <span className="text-accent font-semibold tabular-nums">
                    [{currentNumeric.histogram[hoveredBinIndex].bin_start.toFixed(2)} -{" "}
                    {currentNumeric.histogram[hoveredBinIndex].bin_end.toFixed(2)}]:{" "}
                    {currentNumeric.histogram[hoveredBinIndex].count.toLocaleString()} rows
                  </span>
                )}
              </div>

              <div className="h-44 w-full rounded-card border border-border bg-surface-subtle/50 p-4 flex items-end gap-1.5">
                {currentNumeric.histogram.map((bin, i) => {
                  const heightPct = (bin.count / maxBinCount) * 100;
                  const isHovered = hoveredBinIndex === i;

                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredBinIndex(i)}
                      onMouseLeave={() => setHoveredBinIndex(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      <div
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                        className={`w-full rounded-t-[3px] transition-all duration-150 ${
                          isHovered
                            ? "bg-accent shadow-xs"
                            : "bg-accent/70 group-hover:bg-accent/90"
                        }`}
                      />
                      <span className="text-[9px] font-mono text-text-muted pt-1 truncate w-full text-center tabular-nums">
                        {bin.bin_start.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content for Categorical Feature */}
      {activeType === "categorical" && currentCategorical && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
            <span>Cardinality:</span>
            <Badge variant="neutral" size="sm" className="tabular-nums">
              {currentCategorical.unique_count} distinct categories
            </Badge>
          </div>

          {/* Top Values Progress Bars */}
          <div className="space-y-2.5">
            {currentCategorical.top_categories.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-primary font-medium truncate max-w-xs">
                    {cat.value ?? "null"}
                  </span>
                  <span className="text-text-muted tabular-nums">
                    {cat.count.toLocaleString()} ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-surface-subtle border border-border overflow-hidden">
                  <div
                    style={{ width: `${cat.percentage}%` }}
                    className="h-full bg-accent/80 rounded-pill transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
