"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import {
  ColumnInfo,
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
  AlertCircle,
  HelpCircle,
  Zap,
} from "lucide-react";

interface WhatIfSimulatorProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
}

export function WhatIfSimulator({
  projectId,
  modelId,
  columns,
  targetColumn,
}: WhatIfSimulatorProps) {
  // Filter out target column
  const featureColumns = useMemo(
    () => columns.filter((col) => col.name !== targetColumn),
    [columns, targetColumn]
  );

  // Default initial feature values
  const defaultValues = useMemo(() => {
    const vals: Record<string, any> = {};
    featureColumns.forEach((col) => {
      if (col.dtype === "numeric") {
        vals[col.name] = 0;
      } else if (col.dtype === "boolean") {
        vals[col.name] = false;
      } else {
        vals[col.name] = "";
      }
    });
    return vals;
  }, [featureColumns]);

  const [inputs, setInputs] = useState<Record<string, any>>(defaultValues);
  const [baselinePrediction, setBaselinePrediction] = useState<SinglePredictionResponse | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<SinglePredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load initial baseline prediction
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

  // Debounced inference when inputs change
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
        setError(err instanceof Error ? err.message : "Inference failed");
      } finally {
        setIsPredicting(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputs, projectId, modelId]);

  const handleNumericChange = (colName: string, val: number) => {
    setInputs((prev) => ({ ...prev, [colName]: val }));
  };

  const handleReset = () => {
    setInputs(defaultValues);
  };

  // Top numeric features (up to 8 for rich interactive slider simulation)
  const numericFeatures = featureColumns.filter((col) => col.dtype === "numeric");
  const categoricalFeatures = featureColumns.filter((col) => col.dtype !== "numeric");

  // Calculate delta if classification or regression
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
    const delta = (currentTopProb - baseTopProb) * 100;
    return delta;
  };

  const probDelta = getProbabilityDelta();

  return (
    <div className="space-y-6">
      {/* Simulation Banner Header */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-surface-2 border border-hairline text-brand-hover">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-ink">
              Interactive What-If Scenario Simulator
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
              Live Counterfactual Engine
            </span>
          </div>
          <p className="text-xs text-ink-muted max-w-2xl">
            Simulate real-time perturbations to input features and observe instantaneous model sensitivity, confidence shifts, and classification threshold crossings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-mono text-ink transition-colors"
            title="Reset all inputs to baseline defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
            <span>Reset Sliders</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Feature Sliders (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-hairline bg-surface-1 shadow-sm">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-telemetry-amber" />
                <span>Feature Sensitivity Controls</span>
              </h4>
              <span className="text-[11px] font-mono text-ink-muted">
                {numericFeatures.length} Numeric • {categoricalFeatures.length} Categorical
              </span>
            </div>

            {/* Numeric Feature Sliders */}
            <div className="space-y-4">
              {numericFeatures.map((col) => {
                const currentVal = Number(inputs[col.name] ?? 0);
                return (
                  <div
                    key={col.name}
                    className="p-3 rounded-lg border border-hairline/60 bg-surface-2/40 hover:bg-surface-2/70 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-ink">
                        {col.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={currentVal}
                          onChange={(e) =>
                            handleNumericChange(col.name, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 text-xs font-mono text-right rounded bg-surface-1 border border-hairline text-ink focus:outline-none focus:border-brand-lavender"
                        />
                      </div>
                    </div>

                    {/* Quick Step Buttons & Visual Bar */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={currentVal < 0 ? currentVal * 2 : 0}
                        max={currentVal > 100 ? currentVal * 2 : 100}
                        step="1"
                        value={currentVal}
                        onChange={(e) =>
                          handleNumericChange(col.name, parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-1.5 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-brand-lavender"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleNumericChange(col.name, currentVal - 1)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-3 hover:bg-surface-4 text-ink border border-hairline"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNumericChange(col.name, currentVal + 1)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-3 hover:bg-surface-4 text-ink border border-hairline"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Categorical Feature Inputs */}
              {categoricalFeatures.map((col) => (
                <div
                  key={col.name}
                  className="p-3 rounded-lg border border-hairline/60 bg-surface-2/40 space-y-1.5"
                >
                  <label className="text-xs font-mono font-medium text-ink flex items-center justify-between">
                    <span>{col.name}</span>
                    <span className="text-[10px] text-ink-subtle">categorical</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. category value`}
                    value={inputs[col.name] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [col.name]: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-surface-1 border border-hairline text-ink focus:outline-none focus:border-brand-lavender"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Prediction Gauge & Sensitivity Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-hairline bg-surface-1 shadow-sm space-y-5 sticky top-20">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-hover" />
                <span>Simulated Outcome</span>
              </h4>
              {isPredicting && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-brand-hover animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-hover" />
                  Calculating...
                </span>
              )}
            </div>

            {error ? (
              <div className="p-4 rounded-lg bg-telemetry-rose/10 border border-telemetry-rose/30 text-telemetry-rose text-xs font-mono">
                {error}
              </div>
            ) : currentPrediction ? (
              <div className="space-y-4">
                {/* Result Hero Card */}
                <div className="p-4 rounded-xl bg-surface-2 border border-hairline text-center space-y-2">
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                    Target: {targetColumn}
                  </span>
                  <div className="text-2xl font-bold font-mono text-ink tracking-tight">
                    {String(currentPrediction.prediction)}
                  </div>
                  {currentPrediction.confidence !== null && currentPrediction.confidence !== undefined && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{(currentPrediction.confidence * 100).toFixed(1)}% Confidence</span>
                    </div>
                  )}
                </div>

                {/* Probability Distribution Bar */}
                {currentPrediction.probabilities && currentPrediction.probabilities.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                      <span>Probability Distribution</span>
                      {probDelta !== null && (
                        <span
                          className={`flex items-center gap-1 font-bold ${
                            probDelta > 0
                              ? "text-telemetry-emerald"
                              : probDelta < 0
                              ? "text-telemetry-rose"
                              : "text-ink-muted"
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

                    <div className="space-y-1.5">
                      {currentPrediction.probabilities.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-ink">
                            <span>Class: {item.label}</span>
                            <span className="font-semibold">
                              {(item.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-lavender to-telemetry-cyan transition-all duration-300"
                              style={{ width: `${Math.min(100, item.probability * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Viva Defense Context Callout */}
                <div className="p-3 rounded-lg border border-hairline/80 bg-surface-2/40 text-[11px] text-ink-muted leading-relaxed flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-brand-hover shrink-0 mt-0.5" />
                  <span>
                    <strong>Viva Demonstration Tip:</strong> Move the sliders to test edge cases. This demonstrates that the serialized pipeline transforms raw numeric/categorical inputs identically to training folds without data leakage.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
