"use client";

import { useState, useMemo } from "react";
import {
  BarChart2,
  AlertCircle,
  Search,
} from "lucide-react";
import { NumericColumnProfile, CategoricalColumnProfile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useELI5 } from "@/components/eli5/eli5-context";
import { ELI5Badge } from "@/components/eli5/eli5-badge";

interface FeatureDistributionViewerProps {
  numericColumns: NumericColumnProfile[];
  categoricalColumns: CategoricalColumnProfile[];
}

export function FeatureDistributionViewer({
  numericColumns,
  categoricalColumns,
}: FeatureDistributionViewerProps) {
  const { isELI5 } = useELI5();
  const [activeType, setActiveType] = useState<"numeric" | "categorical">(
    numericColumns.length > 0 ? "numeric" : "categorical"
  );

  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [selectedNumName, setSelectedNumName] = useState<string>(
    numericColumns[0]?.name || ""
  );
  const [selectedCatName, setSelectedCatName] = useState<string>(
    categoricalColumns[0]?.name || ""
  );
  const [hoveredBinIndex, setHoveredBinIndex] = useState<number | null>(null);

  const filteredNumeric = useMemo(() => {
    const q = featureSearchQuery.trim().toLowerCase();
    return q ? numericColumns.filter((c) => c.name.toLowerCase().includes(q)) : numericColumns;
  }, [numericColumns, featureSearchQuery]);

  const filteredCategorical = useMemo(() => {
    const q = featureSearchQuery.trim().toLowerCase();
    return q ? categoricalColumns.filter((c) => c.name.toLowerCase().includes(q)) : categoricalColumns;
  }, [categoricalColumns, featureSearchQuery]);

  const currentNumeric =
    numericColumns.find((c) => c.name === selectedNumName) || numericColumns[0];
  const currentCategorical =
    categoricalColumns.find((c) => c.name === selectedCatName) || categoricalColumns[0];

  const maxBinCount = currentNumeric?.histogram
    ? Math.max(...currentNumeric.histogram.map((b) => b.count), 1)
    : 1;

  const otherCatPercentage = useMemo(() => {
    if (!currentCategorical) return 0;
    const topSum = currentCategorical.top_categories.reduce((acc, c) => acc + c.percentage, 0);
    return Math.max(0, round(100 - topSum, 1));
  }, [currentCategorical]);

  function round(val: number, decimals: number) {
    return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
  }

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      {/* Header and Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-accent" />
            <span>{isELI5 ? "Feature Shape & Distribution" : "Feature Distribution & Statistics"}</span>
          </h3>
          <p className="text-xs text-text-muted">
            {isELI5
              ? "See how each column's values spread out across your samples."
              : "Univariate distributions, statistical percentiles, and IQR outlier boundaries."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          {(numericColumns.length > 5 || categoricalColumns.length > 5) && (
            <div className="relative max-w-xs">
              <Search className="w-3 h-3 text-text-muted absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find feature..."
                value={featureSearchQuery}
                onChange={(e) => setFeatureSearchQuery(e.target.value)}
                className="pl-6 pr-2 py-1 text-xs font-mono rounded-button border border-border bg-surface-subtle text-text-primary focus:outline-none focus:border-accent w-28 sm:w-36"
              />
            </div>
          )}

          {/* Feature Type Switcher */}
          <div className="flex items-center gap-1 rounded-card border border-border bg-surface-subtle p-0.5 text-xs font-mono self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveType("numeric");
                setFeatureSearchQuery("");
              }}
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
              onClick={() => {
                setActiveType("categorical");
                setFeatureSearchQuery("");
              }}
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
      </div>

      {/* Feature Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {activeType === "numeric"
          ? filteredNumeric.map((col) => (
              <button
                key={col.name}
                onClick={() => {
                  setSelectedNumName(col.name);
                  setHoveredBinIndex(null);
                }}
                className={`px-2.5 py-1 rounded-button text-xs font-mono whitespace-nowrap border transition-all cursor-pointer ${
                  currentNumeric?.name === col.name
                    ? "bg-accent/15 border-accent text-accent font-semibold"
                    : "bg-surface-subtle border-border text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {col.name}
              </button>
            ))
          : filteredCategorical.map((col) => (
              <button
                key={col.name}
                onClick={() => setSelectedCatName(col.name)}
                className={`px-2.5 py-1 rounded-button text-xs font-mono whitespace-nowrap border transition-all cursor-pointer ${
                  currentCategorical?.name === col.name
                    ? "bg-accent/15 border-accent text-accent font-semibold"
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
          {/* Statistical Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {[
              { label: "Mean", val: currentNumeric.mean },
              { label: "Std Dev", val: currentNumeric.std },
              { label: "Min", val: currentNumeric.min },
              { label: "25% (Q1)", val: currentNumeric.q25 },
              { label: "Median", val: currentNumeric.median },
              { label: "75% (Q3)", val: currentNumeric.q75 },
              { label: "Max", val: currentNumeric.max },
              {
                label: "IQR Span",
                val:
                  currentNumeric.q75 !== null && currentNumeric.q25 !== null && currentNumeric.q75 !== undefined && currentNumeric.q25 !== undefined
                    ? round(currentNumeric.q75 - currentNumeric.q25, 3)
                    : null,
              },
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

          {/* Outlier & Constant Flag Banner with Skewness Recommendation */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            {currentNumeric.outlier_count > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-warning/10 border border-warning/30 text-warning">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {currentNumeric.outlier_count.toLocaleString()} IQR outliers (
                  {currentNumeric.outlier_percentage.toFixed(1)}%)
                </span>
                <ELI5Badge termKey="iqr_outliers" fallbackText="" />
              </div>
            ) : (
              <span className="text-[11px] text-text-muted">
                Zero IQR outliers detected in numeric span.
              </span>
            )}

            {/* Skewness Transform Intelligence */}
            {currentNumeric.skewness !== null && currentNumeric.skewness !== undefined && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] border font-mono ${
                  Math.abs(currentNumeric.skewness) >= 1.5
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                    : Math.abs(currentNumeric.skewness) >= 0.5
                    ? "bg-info/10 border-info/30 text-info"
                    : "bg-success/10 border-success/30 text-success"
                }`}
              >
                <span>
                  {Math.abs(currentNumeric.skewness) >= 1.5
                    ? `Heavy Skew (${currentNumeric.skewness.toFixed(2)}) → Step 2: Log1p / PowerTransformer Recommended`
                    : Math.abs(currentNumeric.skewness) >= 0.5
                    ? `Moderate Skew (${currentNumeric.skewness.toFixed(2)})`
                    : `Symmetric Distribution (${currentNumeric.skewness.toFixed(2)})`}
                </span>
              </div>
            )}

            {currentNumeric.null_count > 0 && (
              <span className="text-[11px] text-warning tabular-nums">
                • {currentNumeric.null_count.toLocaleString()} missing cells ({currentNumeric.null_percentage.toFixed(1)}%)
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
                            ? "bg-gradient-to-t from-cyan-500 to-sky-400 shadow-[0_0_10px_rgba(6,182,212,0.45)]"
                            : "bg-sky-500/80 group-hover:bg-sky-400"
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

          {/* SVG Box-and-Whisker Plot & Outlier Fences */}
          {currentNumeric.min !== null &&
            currentNumeric.max !== null &&
            currentNumeric.q25 !== null &&
            currentNumeric.q75 !== null &&
            currentNumeric.median !== null &&
            currentNumeric.min !== undefined &&
            currentNumeric.max !== undefined &&
            currentNumeric.q25 !== undefined &&
            currentNumeric.q75 !== undefined &&
            currentNumeric.median !== undefined && (
              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <span>Box &amp; Whisker Dispersion (Tukey 1.5× IQR)</span>
                  </span>
                  <span className="text-[11px] text-text-muted flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-accent/20 border border-accent inline-block" />
                      IQR Box (Q1 - Q3)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
                      Median
                    </span>
                    {currentNumeric.outlier_count > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-danger inline-block" />
                        Outlier Fences
                      </span>
                    )}
                  </span>
                </div>

                {(() => {
                  const minVal = currentNumeric.min!;
                  const maxVal = currentNumeric.max!;
                  const q25 = currentNumeric.q25!;
                  const median = currentNumeric.median!;
                  const q75 = currentNumeric.q75!;
                  const iqr = q75 - q25;
                  const rawLowerFence = round(q25 - 1.5 * iqr, 2);
                  const rawUpperFence = round(q75 + 1.5 * iqr, 2);
                  const lowerWhisker = Math.max(minVal, rawLowerFence);
                  const upperWhisker = Math.min(maxVal, rawUpperFence);

                  const span = maxVal - minVal > 0 ? maxVal - minVal : 1;
                  const toPct = (v: number) => Math.min(100, Math.max(0, ((v - minVal) / span) * 100));

                  const boxLeft = toPct(q25);
                  const boxWidth = Math.max(toPct(q75) - boxLeft, 0.5);
                  const medianLeft = toPct(median);
                  const whiskerLeft = toPct(lowerWhisker);
                  const whiskerRight = toPct(upperWhisker);

                  return (
                    <div className="p-3 rounded-card border border-border bg-surface-subtle/50 space-y-2 font-mono">
                      {/* SVG Box Plot Canvas */}
                      <div className="relative w-full h-10 flex items-center">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                          {/* Whisker Connecting Line */}
                          <line
                            x1={`${whiskerLeft}%`}
                            x2={`${boxLeft}%`}
                            y1="50%"
                            y2="50%"
                            stroke="currentColor"
                            className="text-text-muted"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={`${boxLeft + boxWidth}%`}
                            x2={`${whiskerRight}%`}
                            y1="50%"
                            y2="50%"
                            stroke="currentColor"
                            className="text-text-muted"
                            strokeWidth="1.5"
                          />

                          {/* Whisker End Caps */}
                          <line
                            x1={`${whiskerLeft}%`}
                            x2={`${whiskerLeft}%`}
                            y1="30%"
                            y2="70%"
                            stroke="currentColor"
                            className="text-text-primary"
                            strokeWidth="2"
                          />
                          <line
                            x1={`${whiskerRight}%`}
                            x2={`${whiskerRight}%`}
                            y1="30%"
                            y2="70%"
                            stroke="currentColor"
                            className="text-text-primary"
                            strokeWidth="2"
                          />

                          {/* Central IQR Box (Q1 to Q3) */}
                          <rect
                            x={`${boxLeft}%`}
                            y="20%"
                            width={`${boxWidth}%`}
                            height="60%"
                            rx="3"
                            className="fill-sky-500/20 stroke-sky-500"
                            strokeWidth="1.5"
                          />

                          {/* Median Marker Line */}
                          <line
                            x1={`${medianLeft}%`}
                            x2={`${medianLeft}%`}
                            y1="15%"
                            y2="85%"
                            stroke="#F59E0B"
                            strokeWidth="2.5"
                          />

                          {/* Outlier Dots beyond fences */}
                          {minVal < rawLowerFence && (
                            <circle
                              cx={`${toPct(minVal)}%`}
                              cy="50%"
                              r="3.5"
                              className="fill-danger stroke-surface"
                              strokeWidth="1"
                            >
                              <title>Min Outlier: {minVal}</title>
                            </circle>
                          )}
                          {maxVal > rawUpperFence && (
                            <circle
                              cx={`${toPct(maxVal)}%`}
                              cy="50%"
                              r="3.5"
                              className="fill-danger stroke-surface"
                              strokeWidth="1"
                            >
                              <title>Max Outlier: {maxVal}</title>
                            </circle>
                          )}
                        </svg>
                      </div>

                      {/* Precise Mathematical Fence Labels */}
                      <div className="flex flex-wrap items-center justify-between text-[10.5px] text-text-muted pt-1 border-t border-border/60">
                        <span>
                          Lower Fence: <strong className="text-text-primary tabular-nums">{rawLowerFence}</strong>
                        </span>
                        <span className="text-accent font-semibold">
                          IQR Span: <strong className="tabular-nums">{iqr.toFixed(2)}</strong>
                        </span>
                        <span>
                          Upper Fence: <strong className="text-text-primary tabular-nums">{rawUpperFence}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}
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
            {currentCategorical.is_high_cardinality && (
              <ELI5Badge termKey="high_cardinality" fallbackText="" />
            )}
            {currentCategorical.null_count > 0 && (
              <span className="text-warning tabular-nums">
                • {currentCategorical.null_count.toLocaleString()} missing ({currentCategorical.null_percentage.toFixed(1)}%)
              </span>
            )}
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
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-pill transition-all"
                  />
                </div>
              </div>
            ))}

            {/* Rare / Other Categories Sum if present */}
            {otherCatPercentage > 0 && currentCategorical.unique_count > currentCategorical.top_categories.length && (
              <div className="space-y-1 pt-1 border-t border-border/70">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted italic">
                    Other ({currentCategorical.unique_count - currentCategorical.top_categories.length} rare categories)
                  </span>
                  <span className="text-text-muted tabular-nums">
                    {otherCatPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-surface-subtle border border-border overflow-hidden">
                  <div
                    style={{ width: `${otherCatPercentage}%` }}
                    className="h-full bg-slate-400/50 rounded-pill transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
