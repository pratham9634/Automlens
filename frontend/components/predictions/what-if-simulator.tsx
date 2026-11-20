"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import {
  ColumnInfo,
  CounterfactualResponse,
  DatasetProfileResponse,
  SinglePredictionResponse,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  HelpCircle,
  Zap,
  Target,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

interface WhatIfSimulatorProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
  profile?: DatasetProfileResponse | null;
  modelName?: string;
}

export function WhatIfSimulator({
  projectId,
  modelId,
  columns,
  targetColumn,
  profile,
  modelName,
}: WhatIfSimulatorProps) {
  const featureColumns = useMemo(
    () => columns.filter((col) => col.name !== targetColumn),
    [columns, targetColumn]
  );

  // Profile lookup maps
  const numericStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { min: number; max: number; median: number; std: number; step: number }
    >();
    if (profile?.numeric_columns) {
      for (const col of profile.numeric_columns) {
        const minVal = col.min ?? 0;
        const maxVal = col.max ?? (minVal + 100);
        const medVal = col.median ?? (minVal + maxVal) / 2;
        const stdVal = col.std ?? (((maxVal - minVal) / 4) || 1);
        const span = maxVal - minVal;
        const step =
          span > 500 ? 10 : span > 50 ? 1 : span > 5 ? 0.5 : 0.01;
        map.set(col.name, {
          min: minVal,
          max: maxVal > minVal ? maxVal : minVal + 100,
          median: medVal,
          std: stdVal,
          step,
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

  // Compute baseline default values from profile
  const defaultValues = useMemo(() => {
    const vals: Record<string, string | number | boolean> = {};
    featureColumns.forEach((col) => {
      if (col.dtype === "numeric") {
        const stats = numericStatsMap.get(col.name);
        vals[col.name] = stats?.median ?? 0;
      } else if (col.dtype === "boolean") {
        vals[col.name] = false;
      } else {
        const cats = categoricalStatsMap.get(col.name);
        vals[col.name] = cats && cats.length > 0 ? cats[0] : "";
      }
    });
    return vals;
  }, [featureColumns, numericStatsMap, categoricalStatsMap]);

  const [inputs, setInputs] = useState<Record<string, string | number | boolean>>(defaultValues);
  const [baselinePrediction, setBaselinePrediction] = useState<SinglePredictionResponse | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<SinglePredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Mode: "explore" (manual sliders) vs "recourse" (counterfactual goal)
  const [activeMode, setActiveMode] = useState<"explore" | "recourse">("explore");

  // Counterfactual state
  const [desiredOutcome, setDesiredOutcome] = useState<string>("");
  const [recourseResult, setRecourseResult] = useState<CounterfactualResponse | null>(null);
  const [recourseLoading, setRecourseLoading] = useState(false);
  const [recourseError, setRecourseError] = useState<string | null>(null);

  // Load baseline prediction once
  useEffect(() => {
    let active = true;
    async function loadBaseline() {
      try {
        setIsPredicting(true);
        const res = await apiClient.predictSingle(projectId, modelId, defaultValues);
        if (active) {
          setBaselinePrediction(res);
          setCurrentPrediction(res);
          setError(null);

          // Default desired outcome to opposite of baseline if binary
          if (res.probabilities && res.probabilities.length === 2) {
            const currentWinner = String(res.prediction);
            const otherClass = res.probabilities.find((p) => p.label !== currentWinner)?.label;
            if (otherClass) setDesiredOutcome(otherClass);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Inference failed");
        }
      } finally {
        if (active) setIsPredicting(false);
      }
    }

    if (modelId && featureColumns.length > 0) {
      loadBaseline();
    }

    return () => {
      active = false;
    };
  }, [projectId, modelId, defaultValues, featureColumns.length]);

  // Real-time debounced prediction re-run
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setIsPredicting(true);
        const res = await apiClient.predictSingle(projectId, modelId, inputs);
        startTransition(() => {
          setCurrentPrediction(res);
          setError(null);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Inference recalculation failed");
      } finally {
        setIsPredicting(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputs, projectId, modelId]);

  const handleNumericChange = (colName: string, val: number) => {
    setInputs((prev) => ({ ...prev, [colName]: val }));
  };

  const handleCategoricalChange = (colName: string, val: string) => {
    setInputs((prev) => ({ ...prev, [colName]: val }));
  };

  const handleReset = () => {
    setInputs(defaultValues);
    setRecourseResult(null);
    setRecourseError(null);
  };

  // Run Counterfactual Algorithmic Recourse Solver
  const handleSolveRecourse = async () => {
    try {
      setRecourseLoading(true);
      setRecourseError(null);
      const res = await apiClient.getCounterfactual(projectId, modelId, {
        inputs,
        desired_outcome: desiredOutcome || undefined,
      });
      setRecourseResult(res);
    } catch (err) {
      setRecourseError(err instanceof Error ? err.message : "Failed to solve minimal recourse.");
    } finally {
      setRecourseLoading(false);
    }
  };

  // Apply counterfactual shifts directly to the live sliders
  const handleApplyRecourse = () => {
    if (!recourseResult || !recourseResult.required_changes) return;
    const updated = { ...inputs };
    for (const change of recourseResult.required_changes) {
      if (change.feature in updated) {
        updated[change.feature] = change.proposed_value;
      }
    }
    setInputs(updated);
    setActiveMode("explore");
  };

  const numericFeatures = featureColumns.filter((col) => col.dtype === "numeric");
  const categoricalFeatures = featureColumns.filter((col) => col.dtype !== "numeric");

  // Track which features are altered from baseline
  const alteredFeatures = useMemo(() => {
    const diffs: Array<{
      name: string;
      base: string | number | boolean;
      current: string | number | boolean;
      delta?: number;
    }> = [];

    for (const col of featureColumns) {
      const bVal = defaultValues[col.name];
      const cVal = inputs[col.name];
      if (bVal !== cVal) {
        const delta =
          typeof bVal === "number" && typeof cVal === "number"
            ? roundTo(cVal - bVal, 3)
            : undefined;
        diffs.push({
          name: col.name,
          base: bVal,
          current: cVal,
          delta,
        });
      }
    }
    return diffs;
  }, [featureColumns, defaultValues, inputs]);

  const getProbabilityDelta = () => {
    if (
      !baselinePrediction?.probabilities ||
      !currentPrediction?.probabilities ||
      baselinePrediction.probabilities.length === 0 ||
      currentPrediction.probabilities.length === 0
    ) {
      return null;
    }

    const currentTopProb = currentPrediction.probabilities[0]?.probability || 0;
    const baseTopProb = baselinePrediction.probabilities[0]?.probability || 0;
    return (currentTopProb - baseTopProb) * 100;
  };

  const probDelta = getProbabilityDelta();

  return (
    <div className="space-y-6">
      {/* Simulation Banner Header */}
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-surface-muted border border-border-subtle text-accent">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              Feature Sensitivity &amp; What-If Simulator
            </h3>
            <Badge variant="accent" size="sm" className="font-mono text-[10px]">
              Profile-Bounded Perturbations
            </Badge>
          </div>
          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Interactively simulate live feature perturbations within statistical dataset bounds to test model decision boundaries.
          </p>
        </div>

        {/* Dual Mode Switcher & Reset */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="flex rounded-lg border border-border p-0.5 bg-surface-subtle text-xs font-mono">
            <button
              onClick={() => setActiveMode("explore")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeMode === "explore"
                  ? "bg-surface text-text-primary shadow-sm font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Sensitivity Sliders
            </button>
            <button
              onClick={() => setActiveMode("recourse")}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeMode === "recourse"
                  ? "bg-surface text-text-primary shadow-sm font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-accent" />
              <span>Goal / Recourse Solver</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 font-mono text-xs h-8 px-2.5"
            title="Reset all inputs to baseline typical values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
            <span>Reset</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders or Recourse Solver (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeMode === "explore" ? (
            <Card className="p-5 sm:p-6 space-y-4 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                  <span>Interactive Perturbation Controls</span>
                </h4>
                <div className="text-xs font-mono text-text-muted flex items-center gap-2">
                  <span>{alteredFeatures.length} perturbed</span>
                  {alteredFeatures.length > 0 && (
                    <Badge variant="accent" size="sm" className="font-mono text-[10px] py-0 px-1.5">
                      ACTIVE DIFF
                    </Badge>
                  )}
                </div>
              </div>

              {/* Numeric Feature Sliders with real bounds */}
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {numericFeatures.map((col) => {
                  const currentVal = Number(inputs[col.name] ?? 0);
                  const stats = numericStatsMap.get(col.name) || {
                    min: 0,
                    max: 100,
                    median: 50,
                    step: 1,
                  };
                  const isAltered = currentVal !== defaultValues[col.name];

                  return (
                    <div
                      key={col.name}
                      className={`p-3 rounded-lg border transition-all space-y-2 ${
                        isAltered
                          ? "border-accent/40 bg-accent/5 shadow-xs"
                          : "border-border/80 bg-surface-subtle/50 hover:bg-surface-subtle"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-mono font-medium text-text-primary truncate">
                            {col.name}
                          </span>
                          {isAltered && (
                            <span className="text-[10px] font-mono font-semibold text-accent">
                              (Δ {roundTo(currentVal - Number(defaultValues[col.name]), 2)})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={stats.step}
                            value={currentVal}
                            onChange={(e) =>
                              handleNumericChange(col.name, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-0.5 text-xs font-mono text-right rounded bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
                          />
                        </div>
                      </div>

                      {/* Slider Control with Min/Median/Max Labels */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={stats.min}
                          max={stats.max}
                          step={stats.step}
                          value={currentVal}
                          onChange={(e) =>
                            handleNumericChange(col.name, parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-1.5 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-text-muted px-0.5">
                          <span>min: {stats.min}</span>
                          <span className="text-text-secondary">typical: {stats.median}</span>
                          <span>max: {stats.max}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Categorical Feature Selectors */}
                {categoricalFeatures.map((col) => {
                  const knownCats = categoricalStatsMap.get(col.name);
                  const currentVal = String(inputs[col.name] ?? "");
                  const isAltered = currentVal !== defaultValues[col.name];

                  return (
                    <div
                      key={col.name}
                      className={`p-3 rounded-lg border transition-all space-y-1.5 ${
                        isAltered
                          ? "border-accent/40 bg-accent/5 shadow-xs"
                          : "border-border/80 bg-surface-subtle/50"
                      }`}
                    >
                      <label className="text-xs font-mono font-medium text-text-primary flex items-center justify-between">
                        <span>{col.name}</span>
                        <span className="text-[10px] text-text-muted font-mono">category</span>
                      </label>

                      {knownCats && knownCats.length > 0 ? (
                        <select
                          aria-label={col.name}
                          value={currentVal}
                          onChange={(e) => handleCategoricalChange(col.name, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono rounded bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                        >
                          {knownCats.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleCategoricalChange(col.name, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono rounded bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            /* Mode 2: Goal / Counterfactual Recourse Solver */
            <Card className="p-5 sm:p-6 space-y-5 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm">
              <div className="space-y-1 border-b border-border pb-3.5">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span>Algorithmic Recourse &amp; Boundary Inversion</span>
                </h4>
                <p className="text-xs text-text-muted">
                  Specify a target outcome to solve for the minimal realistic feature perturbations needed to flip the decision.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-semibold text-text-primary">
                      Desired Target Flip:
                    </span>
                    <p className="text-[11px] text-text-muted">
                      Current outcome: <strong className="text-text-primary">{String(currentPrediction?.prediction)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={desiredOutcome}
                      onChange={(e) => setDesiredOutcome(e.target.value)}
                      placeholder="e.g. 1 or Approved"
                      className="px-3 py-1.5 text-xs font-mono rounded-md bg-surface border border-border text-text-primary w-36 focus:ring-1 focus:ring-accent"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={recourseLoading}
                      onClick={handleSolveRecourse}
                      className="gap-1.5 font-mono text-xs h-8 px-3"
                    >
                      {recourseLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Solve Minimal Flip</span>
                    </Button>
                  </div>
                </div>
              </div>

              {recourseError && (
                <AlertRow variant="danger" title="Counterfactual Solver Error">
                  {recourseError}
                </AlertRow>
              )}

              {recourseResult && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-surface to-surface-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${recourseResult.outcome_flipped ? "bg-success" : "bg-warning"}`} />
                        <span className="text-xs font-mono font-semibold text-text-primary">
                          {recourseResult.outcome_flipped
                            ? `Recourse Feasible: Inverts to '${recourseResult.counterfactual_prediction}'`
                            : "Robust Decision: No Flip Found Within Bounds"}
                        </span>
                      </div>
                      {recourseResult.outcome_flipped && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleApplyRecourse}
                          className="gap-1 text-xs font-mono h-7 px-2.5 text-accent"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Apply to Sliders</span>
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-text-muted leading-relaxed">
                      {recourseResult.recourse_summary}
                    </p>

                    {recourseResult.required_changes && recourseResult.required_changes.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                          Minimum Required Feature Shifts:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {recourseResult.required_changes.map((c) => (
                            <div
                              key={c.feature}
                              className="p-2.5 rounded-lg border border-accent/30 bg-accent/5 space-y-1"
                            >
                              <div className="text-xs font-mono font-semibold text-text-primary">
                                {c.feature}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-text-muted">{String(c.original_value)}</span>
                                <ArrowRight className="w-3 h-3 text-accent" />
                                <strong className="text-accent">{String(c.proposed_value)}</strong>
                                {c.delta !== null && c.delta !== undefined && (
                                  <span className="text-[10px] text-text-secondary ml-1 font-semibold">
                                    ({c.delta > 0 ? "+" : ""}{c.delta})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Real-Time Prediction Gauge & Sensitivity Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-5 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm sticky top-20">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Simulated Output</span>
              </h4>
              {isPredicting && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-accent animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Calculating...
                </span>
              )}
            </div>

            {error ? (
              <AlertRow variant="danger" title="Inference Error">
                {error}
              </AlertRow>
            ) : currentPrediction ? (
              <div className="space-y-4.5">
                {/* Result Hero Card */}
                <div className="p-4 rounded-xl bg-gradient-to-b from-surface-subtle to-surface border border-border text-center space-y-1.5">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    Target: {targetColumn}
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-text-primary tracking-tight tabular-nums">
                    {String(currentPrediction.prediction)}
                  </div>
                  {currentPrediction.confidence !== null && currentPrediction.confidence !== undefined && (
                    <Badge variant="success" size="sm" className="font-mono tabular-nums">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
                    </Badge>
                  )}
                </div>

                {/* Probability Shift vs. Baseline */}
                {currentPrediction.probabilities && currentPrediction.probabilities.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                      <span>Probability Distribution</span>
                      {probDelta !== null && (
                        <span
                          className={`flex items-center gap-1 font-bold tabular-nums ${
                            probDelta > 0
                              ? "text-success"
                              : probDelta < 0
                              ? "text-danger"
                              : "text-text-muted"
                          }`}
                        >
                          {probDelta > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : probDelta < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {probDelta > 0 ? "+" : ""}
                          {probDelta.toFixed(1)}% vs. Baseline
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {currentPrediction.probabilities.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono text-text-primary">
                            <span>Class: <strong className="text-text-primary">{item.label}</strong></span>
                            <span className="font-semibold tabular-nums text-text-secondary">
                              {(item.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, item.probability * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Altered Features Diff View */}
                {alteredFeatures.length > 0 && (
                  <div className="p-3 rounded-lg border border-border/80 bg-surface-subtle/50 space-y-2">
                    <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider font-semibold">
                      Perturbed Feature Diffs ({alteredFeatures.length}):
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {alteredFeatures.map((f) => (
                        <div key={f.name} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-text-secondary truncate max-w-[120px]">{f.name}</span>
                          <span className="text-accent font-semibold tabular-nums">
                            {String(f.base)} → {String(f.current)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rule 10 Academic Disclaimer Callout */}
                <div className="p-3 rounded-lg border border-border bg-surface-subtle/40 text-[11px] text-text-muted leading-relaxed flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-secondary font-semibold">Rule 10 Attribution Notice:</strong>{" "}
                    Perturbation testing explores fitted model sensitivity across decision surfaces. It does not certify causal interventions in real-world systems.
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
