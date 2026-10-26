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
  HelpCircle,
  Zap,
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
}

export function WhatIfSimulator({
  projectId,
  modelId,
  columns,
  targetColumn,
}: WhatIfSimulatorProps) {
  const featureColumns = useMemo(
    () => columns.filter((col) => col.name !== targetColumn),
    [columns, targetColumn]
  );

  const defaultValues = useMemo(() => {
    const vals: Record<string, string | number | boolean> = {};
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

  const [inputs, setInputs] = useState<Record<string, string | number | boolean>>(defaultValues);
  const [baselinePrediction, setBaselinePrediction] = useState<SinglePredictionResponse | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<SinglePredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  const numericFeatures = featureColumns.filter((col) => col.dtype === "numeric");
  const categoricalFeatures = featureColumns.filter((col) => col.dtype !== "numeric");

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
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-md bg-surface-muted border border-border-subtle text-accent">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              Feature Sensitivity &amp; What-If Simulator
            </h3>
            <Badge variant="accent" size="sm" className="font-mono">
              Perturbation Testing
            </Badge>
          </div>
          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Simulate real-time perturbations to input features and observe model sensitivity, probability shifts, and prediction changes through the fitted pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 font-mono text-xs"
            title="Reset all inputs to baseline defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
            <span>Reset Sliders</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Feature Sliders (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-warning" />
                <span>Feature Sensitivity Controls</span>
              </h4>
              <span className="text-xs font-mono text-text-muted">
                {numericFeatures.length} Numeric • {categoricalFeatures.length} Categorical
              </span>
            </div>

            {/* Numeric Feature Sliders */}
            <div className="space-y-3.5">
              {numericFeatures.map((col) => {
                const currentVal = Number(inputs[col.name] ?? 0);
                return (
                  <div
                    key={col.name}
                    className="p-3.5 rounded-lg border border-border bg-surface-subtle/50 hover:bg-surface-subtle transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-text-primary">
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
                          className="w-24 px-2 py-1 text-xs font-mono text-right rounded bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
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
                        className="w-full h-1.5 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleNumericChange(col.name, currentVal - 1)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface hover:bg-surface-muted text-text-primary border border-border transition-colors"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNumericChange(col.name, currentVal + 1)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface hover:bg-surface-muted text-text-primary border border-border transition-colors"
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
                  className="p-3.5 rounded-lg border border-border bg-surface-subtle/50 space-y-1.5"
                >
                  <label className="text-xs font-mono font-medium text-text-primary flex items-center justify-between">
                    <span>{col.name}</span>
                    <span className="text-[10px] text-text-muted">categorical</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. category value`}
                    value={String(inputs[col.name] ?? "")}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [col.name]: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-surface border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Real-Time Prediction Gauge & Sensitivity Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 sm:p-6 space-y-5 sticky top-20">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Simulated Outcome</span>
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
              <div className="space-y-4">
                {/* Result Hero Card */}
                <div className="p-4 rounded-lg bg-surface-subtle border border-border text-center space-y-1.5">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    Target: {targetColumn}
                  </span>
                  <div className="text-2xl font-bold font-mono text-text-primary tracking-tight tabular-nums">
                    {String(currentPrediction.prediction)}
                  </div>
                  {currentPrediction.confidence !== null && currentPrediction.confidence !== undefined && (
                    <Badge variant="success" size="sm" className="font-mono tabular-nums">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
                    </Badge>
                  )}
                </div>

                {/* Probability Distribution Bar */}
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
                            <span>Class: {item.label}</span>
                            <span className="font-semibold tabular-nums text-text-secondary">
                              {(item.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, item.probability * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rule 10 Academic Disclaimer Callout */}
                <div className="p-3 rounded-md border border-border bg-surface-subtle/50 text-[11px] text-text-muted leading-relaxed flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-secondary">Rule 10 Attribution Notice:</strong> Feature sensitivity reflects model response to input perturbations under the fitted pipeline, not real-world causation.
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
