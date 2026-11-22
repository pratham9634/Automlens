"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ColumnInfo,
  DatasetProfileResponse,
  LocalExplanationResponse,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  Play,
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Search,
  Zap,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

interface LocalAttributionCardProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
  previewRows?: Record<string, any>[];
  profile?: DatasetProfileResponse | null;
}

export function LocalAttributionCard({
  projectId,
  modelId,
  columns,
  targetColumn,
  previewRows = [],
  profile = null,
}: LocalAttributionCardProps) {
  const featureCols = useMemo(
    () => columns.filter((c) => c.name !== targetColumn),
    [columns, targetColumn]
  );

  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocalExplanationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSampleIndex, setActiveSampleIndex] = useState<number | null>(null);

  // Helper to determine if a column is numeric
  const isColNumeric = useCallback((col: ColumnInfo): boolean => {
    const dt = col.dtype.toLowerCase();
    return dt === "numeric" || dt.includes("int") || dt.includes("float");
  }, []);

  // Map known categories for categorical columns
  const knownCategoriesMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    featureCols.forEach((col) => {
      if (!isColNumeric(col)) {
        const catSet = new Set<string>();

        // 1. From profile
        const profCol = profile?.categorical_columns?.find((c) => c.name === col.name);
        if (profCol && profCol.top_categories) {
          profCol.top_categories.forEach((tc) => {
            if (tc.value !== null && tc.value !== undefined && tc.value !== "") {
              catSet.add(String(tc.value));
            }
          });
        }

        // 2. From preview rows
        if (previewRows.length > 0) {
          previewRows.forEach((row) => {
            const val = row[col.name];
            if (val !== null && val !== undefined && val !== "") {
              catSet.add(String(val));
            }
          });
        }

        if (catSet.size > 0 && catSet.size <= 50) {
          map[col.name] = Array.from(catSet);
        }
      }
    });

    return map;
  }, [featureCols, isColNumeric, profile, previewRows]);

  // Reset to initial blank/default inputs
  const resetToDefaults = useCallback(() => {
    const initial: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      if (isColNumeric(col)) {
        initial[col.name] = 0;
      } else {
        const cats = knownCategoriesMap[col.name];
        initial[col.name] = cats && cats.length > 0 ? cats[0] : "";
      }
    });
    setInputs(initial);
    setActiveSampleIndex(null);
  }, [featureCols, isColNumeric, knownCategoriesMap]);

  useEffect(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  // Quick fill: Load a specific sample row from previewRows
  const loadSampleRow = (rowIdx: number) => {
    const row = previewRows[rowIdx];
    if (!row) return;

    const newInputs: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      const val = row[col.name];
      if (val !== null && val !== undefined) {
        newInputs[col.name] = isColNumeric(col) ? Number(val) : String(val);
      } else {
        newInputs[col.name] = isColNumeric(col) ? 0 : "";
      }
    });

    setInputs(newInputs);
    setActiveSampleIndex(rowIdx);
  };

  // Quick fill: Load dataset median / mode
  const loadTypicalProfile = () => {
    const newInputs: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      if (isColNumeric(col)) {
        const numProf = profile?.numeric_columns?.find((n) => n.name === col.name);
        newInputs[col.name] = numProf?.median ?? numProf?.mean ?? 0;
      } else {
        const catProf = profile?.categorical_columns?.find((c) => c.name === col.name);
        const topCat = catProf?.top_categories?.[0]?.value;
        newInputs[col.name] = topCat ? String(topCat) : (knownCategoriesMap[col.name]?.[0] ?? "");
      }
    });
    setInputs(newInputs);
    setActiveSampleIndex(null);
  };

  // Quick fill: Load a random sample from previewRows
  const loadRandomSample = () => {
    if (!previewRows.length) return;
    const randomIdx = Math.floor(Math.random() * previewRows.length);
    loadSampleRow(randomIdx);
  };

  const handleInputChange = (colName: string, val: string, dtype: string) => {
    const isNum = dtype === "numeric" || dtype.includes("int") || dtype.includes("float");
    setInputs((prev) => ({
      ...prev,
      [colName]: isNum ? (val === "" ? "" : Number(val)) : val,
    }));
  };

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getLocalExplanation(projectId, modelId, inputs);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute local attribution.");
    } finally {
      setLoading(false);
    }
  };

  const maxAbsAttr = useMemo(() => {
    if (!result?.attributions?.length) return 1;
    return Math.max(...result.attributions.map((a) => Math.abs(a.attribution_value)), 0.0001);
  }, [result]);

  // Aggregate sums of positive and negative forces
  const forceBreakdown = useMemo(() => {
    if (!result) return { positiveSum: 0, negativeSum: 0 };
    let pos = 0;
    let neg = 0;
    result.attributions.forEach((a) => {
      if (a.attribution_value > 0) pos += a.attribution_value;
      else if (a.attribution_value < 0) neg += Math.abs(a.attribution_value);
    });
    return { positiveSum: pos, negativeSum: neg };
  }, [result]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Form Column (5 cols) */}
      <div className="lg:col-span-5">
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="border-b border-border pb-3 space-y-1">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" />
              <span>Observation Test Inputs</span>
            </h3>
            <p className="text-xs text-text-muted">
              Select or customize feature values for an individual observation to compute its personalized SHAP breakdown.
            </p>
          </div>

          {/* Quick-Fill Presets Toolbar */}
          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span className="flex items-center gap-1 font-semibold text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Quick-Load Presets:</span>
              </span>
              {activeSampleIndex !== null && (
                <Badge variant="optimal" size="sm" className="text-[10px]">
                  Loaded Row #{activeSampleIndex + 1}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Load Dataset Row Dropdown */}
              {previewRows.length > 0 && (
                <div className="relative">
                  <select
                    value={activeSampleIndex !== null ? String(activeSampleIndex) : ""}
                    onChange={(e) => {
                      if (e.target.value !== "") {
                        loadSampleRow(Number(e.target.value));
                      }
                    }}
                    className="appearance-none pl-2.5 pr-6 py-1 rounded bg-surface border border-border hover:border-border-strong text-xs font-mono text-text-primary cursor-pointer transition-colors"
                  >
                    <option value="">Load Dataset Record ▾</option>
                    {previewRows.slice(0, 15).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Dataset Record #{idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Typical Case Button */}
              <button
                type="button"
                onClick={loadTypicalProfile}
                className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
                title="Fill with dataset medians for numeric fields and modes for categorical fields"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Typical Case</span>
              </button>

              {/* Random Button */}
              {previewRows.length > 0 && (
                <button
                  type="button"
                  onClick={loadRandomSample}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  title="Pick a random real sample from the dataset"
                >
                  🎲 Random
                </button>
              )}

              {/* Reset Button */}
              <button
                type="button"
                onClick={resetToDefaults}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer ml-auto"
                title="Reset all inputs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Input Fields Form */}
          <form onSubmit={handleExplain} className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 divide-y divide-border-subtle">
              {featureCols.map((col) => {
                const isNum = isColNumeric(col);
                const categories = knownCategoriesMap[col.name];

                return (
                  <div key={col.name} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`input-${col.name}`} className="font-mono text-text-primary font-medium">
                        {col.name}
                      </label>
                      <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-muted border border-border-subtle">
                        {col.dtype}
                      </span>
                    </div>

                    {/* Smart select dropdown if categories exist, otherwise standard input */}
                    {categories && categories.length > 0 ? (
                      <select
                        id={`input-${col.name}`}
                        value={inputs[col.name] !== undefined ? String(inputs[col.name]) : ""}
                        onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                        className="w-full px-3 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
                      >
                        <option value="">-- Select {col.name} --</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`input-${col.name}`}
                        type={isNum ? "number" : "text"}
                        step={isNum ? "any" : undefined}
                        value={inputs[col.name] ?? ""}
                        onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                        className="w-full px-3 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                        placeholder={`Enter ${col.name}...`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <AlertRow variant="danger" title="Attribution Error">
                {error}
              </AlertRow>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full gap-2 font-mono text-xs font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing SHAP Attribution...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Compute Local Waterfall</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>

      {/* Attribution Decomposition Column (7 cols) */}
      <div className="lg:col-span-7">
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Feature Attribution Decomposition</span>
              </h3>
              <p className="text-xs text-text-muted">
                Push-pull contribution breakdown relative to dataset baseline expectation.
              </p>
            </div>
            {result && (
              <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                {result.method_label}
              </Badge>
            )}
          </div>

          {result ? (
            <div className="space-y-5">
              {/* Intuitive Step Waterfall Visual Summary */}
              <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-3">
                <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-accent" />
                  <span>Prediction Journey (The Tug-of-War Tally)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center font-mono">
                  {/* Step 1: Baseline */}
                  <div className="p-2.5 rounded bg-surface border border-border space-y-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">
                      1. Dataset Average
                    </span>
                    <div className="text-sm font-bold text-text-secondary tabular-nums">
                      {result.base_value.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-text-muted block">Base Expectation</span>
                  </div>

                  {/* Step 2: Positive Boosts */}
                  <div className="p-2.5 rounded bg-surface border border-border space-y-0.5">
                    <span className="text-[10px] text-success uppercase tracking-wider">
                      2. Green Boosts
                    </span>
                    <div className="text-sm font-bold text-success tabular-nums">
                      +{forceBreakdown.positiveSum.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-text-muted block">Pushing UP</span>
                  </div>

                  {/* Step 3: Negative Drags */}
                  <div className="p-2.5 rounded bg-surface border border-border space-y-0.5">
                    <span className="text-[10px] text-danger uppercase tracking-wider">
                      3. Red Drags
                    </span>
                    <div className="text-sm font-bold text-danger tabular-nums">
                      -{forceBreakdown.negativeSum.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-text-muted block">Pulling DOWN</span>
                  </div>

                  {/* Step 4: Final Output */}
                  <div className="p-2.5 rounded bg-surface border-2 border-accent space-y-0.5 shadow-sm">
                    <span className="text-[10px] text-accent uppercase tracking-wider font-bold">
                      4. Final Output
                    </span>
                    <div className="text-sm font-black text-text-primary tabular-nums">
                      {result.predicted_value.toFixed(4)}
                    </div>
                    <span className="text-[10px] text-accent font-semibold block">
                      Class: {String(result.prediction)}
                    </span>
                  </div>
                </div>

                {/* Mathematical Additive Assurance (Rule 9) */}
                <div className="text-[10px] font-mono text-center text-text-muted pt-1 border-t border-border/40">
                  Base ({result.base_value.toFixed(3)}) + Boosts (+{forceBreakdown.positiveSum.toFixed(3)}) - Drags (-{forceBreakdown.negativeSum.toFixed(3)}) = Final Output ({result.predicted_value.toFixed(3)})
                </div>
              </div>

              {/* Attribution Items List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-text-primary flex items-center justify-between pb-1">
                  <span>Individual Feature Contributions</span>
                  <span className="text-[11px] font-mono text-text-muted">Sorted by magnitude</span>
                </div>

                {result.attributions.map((attr) => {
                  const isPositive = attr.attribution_value >= 0;
                  const absVal = Math.abs(attr.attribution_value);
                  const barWidth = Math.min(100, Math.max(5, (absVal / maxAbsAttr) * 100));

                  return (
                    <div
                      key={attr.feature_name}
                      className="p-3 rounded-lg border border-border bg-surface-subtle/50 hover:bg-surface-subtle transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-success shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-danger shrink-0" />
                          )}
                          <span className="font-semibold text-text-primary">
                            {attr.feature_name}
                          </span>
                          <span className="text-text-muted text-[11px]">
                            = {String(attr.feature_value)}
                          </span>
                        </div>
                        <span
                          className={`font-bold tabular-nums text-xs ${
                            isPositive ? "text-success" : "text-danger"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {attr.attribution_value.toFixed(4)}
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPositive ? "bg-success" : "bg-danger"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Plain English Explanation */}
              {result.layman_explanation && (
                <div className="p-3.5 rounded-lg border border-border bg-surface-subtle/70 text-xs text-text-secondary leading-relaxed space-y-1">
                  <div className="text-text-primary font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>Plain-English Story:</span>
                  </div>
                  <p>{result.layman_explanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-xs font-mono text-text-muted space-y-2">
              <Search className="w-6 h-6 text-text-muted/40 mx-auto" />
              <p>
                Choose a preset like &quot;Dataset Record #1&quot; or &quot;Typical Case&quot; on the left,
                then click &quot;Compute Local Waterfall&quot; to inspect feature contributions.
              </p>
            </div>
          )}

          {/* Academic Footer */}
          <div className="text-[11px] text-text-muted border-t border-border pt-3 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Attributions reflect local game-theoretic Shapley contributions for this sample, not causation (Rule 10).
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
