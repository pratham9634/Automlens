"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnInfo,
  DatasetProfileResponse,
  SinglePredictionResponse,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  Play,
  Loader2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Compass,
  Shuffle,
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

interface SinglePredictionFormProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
  profile?: DatasetProfileResponse | null;
}

export function SinglePredictionForm({
  projectId,
  modelId,
  columns,
  targetColumn,
  profile,
}: SinglePredictionFormProps) {
  const featureCols = useMemo(
    () => columns.filter((c) => c.name !== targetColumn),
    [columns, targetColumn]
  );

  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [result, setResult] = useState<SinglePredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile lookup maps
  const numericStatsMap = useMemo(() => {
    const map = new Map<string, { min?: number | null; max?: number | null; median?: number | null }>();
    if (profile?.numeric_columns) {
      for (const col of profile.numeric_columns) {
        map.set(col.name, {
          min: col.min,
          max: col.max,
          median: col.median,
        });
      }
    }
    return map;
  }, [profile]);

  const categoricalStatsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (profile?.categorical_columns) {
      for (const col of profile.categorical_columns) {
        map.set(
          col.name,
          col.top_categories.map((c) => String(c.value))
        );
      }
    }
    return map;
  }, [profile]);

  // Initialize inputs on mount or column changes
  useEffect(() => {
    const initial: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      if (col.dtype === "numeric") {
        const stats = numericStatsMap.get(col.name);
        initial[col.name] = stats?.median ?? 0;
      } else {
        const cats = categoricalStatsMap.get(col.name);
        initial[col.name] = cats && cats.length > 0 ? cats[0] : "";
      }
    });
    setInputs(initial);
  }, [featureCols, numericStatsMap, categoricalStatsMap]);

  const handleInputChange = (colName: string, val: string, dtype: string) => {
    setInputs((prev) => ({
      ...prev,
      [colName]: dtype === "numeric" ? (val === "" ? "" : Number(val)) : val,
    }));
  };

  const handleLoadPreset = async (presetType: "median" | "random") => {
    setLoadingPreset(presetType);
    setError(null);
    try {
      const data = await apiClient.getSampleRow(projectId, modelId, presetType);
      if (data && data.values) {
        const updated: Record<string, string | number> = {};
        featureCols.forEach((col) => {
          if (col.name in data.values) {
            const val = data.values[col.name];
            updated[col.name] = val !== null && val !== undefined ? val : "";
          } else {
            updated[col.name] = col.dtype === "numeric" ? 0 : "";
          }
        });
        setInputs(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load representative sample preset.");
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleClear = () => {
    const empty: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      empty[col.name] = col.dtype === "numeric" ? "" : "";
    });
    setInputs(empty);
    setResult(null);
    setError(null);
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.predictSingle(projectId, modelId, inputs);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute single prediction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form Input Fields (Left 7 cols) */}
      <Card className="lg:col-span-7 p-5 sm:p-6 space-y-5 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent" />
              <span>Feature Inputs</span>
            </h3>
            <p className="text-xs text-text-muted">
              Enter values for an unseen observation. Transformations execute inside the fitted pipeline.
            </p>
          </div>

          {/* Smart Presets Toolbar */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loadingPreset !== null}
              onClick={() => handleLoadPreset("median")}
              className="gap-1.5 text-xs font-mono h-7 px-2.5"
              title="Populate inputs with median (numeric) and mode (categorical) typical values"
            >
              {loadingPreset === "median" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-accent" />
              )}
              <span>Median Profile</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loadingPreset !== null}
              onClick={() => handleLoadPreset("random")}
              className="gap-1.5 text-xs font-mono h-7 px-2.5"
              title="Load a real representative record from the training dataset"
            >
              {loadingPreset === "random" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Shuffle className="w-3 h-3 text-warning" />
              )}
              <span>Random Sample</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs font-mono h-7 px-2 text-text-muted hover:text-text-primary"
              title="Clear all fields"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <form onSubmit={handlePredict} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
            {featureCols.map((col) => {
              const numStats = numericStatsMap.get(col.name);
              const knownCategories = categoricalStatsMap.get(col.name);
              const isNumeric = col.dtype === "numeric";

              return (
                <div
                  key={col.name}
                  className="p-3 rounded-lg border border-border/80 bg-surface-subtle/50 hover:bg-surface-subtle transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-medium text-text-primary truncate" title={col.name}>
                      {col.name}
                    </label>
                    <span className="text-[10px] font-mono text-text-muted bg-surface-muted px-1.5 py-0.5 rounded border border-border/50">
                      {col.dtype}
                    </span>
                  </div>

                  {isNumeric ? (
                    <div className="space-y-1">
                      <input
                        type="number"
                        step="any"
                        value={inputs[col.name] ?? ""}
                        onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                        placeholder={numStats?.median !== undefined ? `e.g. ${numStats.median}` : `Enter ${col.name}...`}
                        className="w-full px-3 py-1.5 rounded-md bg-surface border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors tabular-nums"
                      />
                      {numStats && (numStats.min !== null || numStats.max !== null) && (
                        <div className="text-[10px] font-mono text-text-muted flex justify-between px-0.5">
                          <span>min: {numStats.min ?? "—"}</span>
                          <span>med: {numStats.median ?? "—"}</span>
                          <span>max: {numStats.max ?? "—"}</span>
                        </div>
                      )}
                    </div>
                  ) : knownCategories && knownCategories.length > 0 && knownCategories.length <= 30 ? (
                    <div className="space-y-1">
                      <select
                        aria-label={col.name}
                        value={String(inputs[col.name] ?? "")}
                        onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                        className="w-full px-3 py-1.5 rounded-md bg-surface border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
                      >
                        <option value="">-- Select {col.name} --</option>
                        {knownCategories.map((cat) => (
                          <option key={cat} value={cat} className="bg-surface text-text-primary">
                            {cat}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] font-mono text-text-muted px-0.5">
                        {knownCategories.length} known categories from dataset
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={String(inputs[col.name] ?? "")}
                      onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                      placeholder={`Enter ${col.name}...`}
                      className="w-full px-3 py-1.5 rounded-md bg-surface border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3.5 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">
              Target: <strong className="text-text-primary font-semibold font-mono">{targetColumn}</strong>
            </span>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="gap-2 font-mono text-xs px-4"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{loading ? "Running Pipeline..." : "Generate Prediction"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Prediction Output & Confidence Card (Right 5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm sticky top-20">
          <div className="space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>Inference Decision</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Instant calibrated output from fitted estimator.
                </p>
              </div>
              <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                Rule 8
              </Badge>
            </div>

            {error && (
              <AlertRow variant="danger" title="Inference Error">
                {error}
              </AlertRow>
            )}

            {result ? (
              <div className="space-y-5 animate-in fade-in-50 duration-300">
                {/* Result Hero Badge */}
                <div className="p-5 rounded-xl bg-gradient-to-b from-surface-subtle to-surface border border-border/90 text-center space-y-2 shadow-sm">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Predicted Outcome for {result.target_column}
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-accent tabular-nums tracking-tight">
                    {typeof result.prediction === "boolean"
                      ? result.prediction
                        ? "TRUE"
                        : "FALSE"
                      : String(result.prediction)}
                  </div>
                  {result.confidence !== null && result.confidence !== undefined && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-border-subtle text-xs font-mono text-text-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span>Confidence:</span>
                      <strong className="text-text-primary tabular-nums">
                        {(result.confidence * 100).toFixed(1)}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Class Probability Distribution (for Classification) */}
                {result.probabilities && result.probabilities.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                      <span>Calibrated Class Probabilities</span>
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="space-y-2.5">
                      {result.probabilities.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-text-primary">
                            <span className="truncate">Class: <strong className="text-text-primary">{item.label}</strong></span>
                            <span className="font-semibold text-text-secondary tabular-nums">
                              {(item.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${Math.min(100, Math.max(3, item.probability * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Academic Rule Verification Note */}
                <div className="p-3 rounded-lg border border-border/60 bg-surface-subtle/40 text-[11px] text-text-muted leading-relaxed flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-secondary font-semibold">Rule 10 Scientific Notice:</strong>{" "}
                    Predictions reflect pattern correlations captured across 5 cross-validation folds. Does not infer real-world causal determinism.
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs font-mono text-text-muted space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center mx-auto text-accent">
                  <Cpu className="w-5 h-5" />
                </div>
                <p>Select &quot;Median Profile&quot; or enter sample values, then click &quot;Generate Prediction&quot;.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-text-muted border-t border-border pt-3 flex items-center justify-between">
            <span>Estimator: <strong className="text-text-primary">{modelId}</strong></span>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              Active Model
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
