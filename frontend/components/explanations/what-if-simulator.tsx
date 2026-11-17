"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { CounterfactualResponse, FeatureChange } from "@/lib/types";
import { ELI5Badge } from "@/components/eli5/eli5-badge";
import { Button } from "@/components/ui/button";

interface WhatIfSimulatorProps {
  projectId: string;
  modelId: string;
  modelName: string;
  availableColumns: Array<{
    name: string;
    isNumeric: boolean;
    min?: number;
    max?: number;
    median?: number;
    uniqueValues?: string[];
  }>;
}

export function WhatIfSimulator({
  projectId,
  modelId,
  modelName,
  availableColumns,
}: WhatIfSimulatorProps) {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CounterfactualResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize inputs with median or mode values
  useEffect(() => {
    if (availableColumns.length > 0) {
      const initial: Record<string, any> = {};
      availableColumns.forEach((col) => {
        if (col.isNumeric) {
          initial[col.name] = col.median ?? col.min ?? 0;
        } else {
          initial[col.name] = col.uniqueValues?.[0] ?? "";
        }
      });
      setInputs(initial);
    }
  }, [availableColumns]);

  const handleInputChange = (colName: string, value: any) => {
    setInputs((prev) => ({
      ...prev,
      [colName]: value,
    }));
  };

  const handleReset = () => {
    const initial: Record<string, any> = {};
    availableColumns.forEach((col) => {
      if (col.isNumeric) {
        initial[col.name] = col.median ?? col.min ?? 0;
      } else {
        initial[col.name] = col.uniqueValues?.[0] ?? "";
      }
    });
    setInputs(initial);
    setResult(null);
    setError(null);
  };

  const runCounterfactual = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCounterfactual(projectId, modelId, {
        inputs,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to solve counterfactual recourse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-surface p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-text-primary text-base">
              Counterfactual &quot;What-If&quot; Simulator
            </h3>
            <ELI5Badge termKey="counterfactual" />
          </div>
          <p className="text-xs text-text-muted mt-1">
            Tweak feature sliders or run the minimum recourse solver to discover how to change the model&apos;s decision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs gap-1.5 text-text-muted hover:text-text-primary border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={runCounterfactual}
            disabled={loading || availableColumns.length === 0}
            className="h-8 text-xs gap-1.5 bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Searching Recourse..." : "Solve Recourse (DiCE)"}
          </Button>
        </div>
      </div>

      {/* Feature Slider & Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableColumns.slice(0, 9).map((col) => {
          const val = inputs[col.name];
          return (
            <div
              key={col.name}
              className="p-3.5 rounded-lg border border-border/80 bg-surface-subtle/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-text-primary truncate max-w-[160px]">
                  {col.name}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {val ?? "—"}
                </span>
              </div>

              {col.isNumeric ? (
                <div className="space-y-1">
                  <input
                    type="range"
                    min={col.min ?? 0}
                    max={col.max ?? 100}
                    step={(col.max ?? 100) > 10 ? 1 : 0.1}
                    value={typeof val === "number" ? val : col.median ?? 0}
                    onChange={(e) => handleInputChange(col.name, parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-surface rounded-lg appearance-none border border-border"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>min: {col.min ?? 0}</span>
                    <span>max: {col.max ?? 100}</span>
                  </div>
                </div>
              ) : (
                <select
                  value={val ?? ""}
                  onChange={(e) => handleInputChange(col.name, e.target.value)}
                  className="w-full text-xs font-mono bg-surface border border-border rounded px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-cyan-500/50"
                >
                  {col.uniqueValues?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )) || <option value="">No categories</option>}
                </select>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Counterfactual Results Display */}
      {result && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-text-primary">
                  Minimum Recourse Result for {result.model_name}
                </h4>
                <p className="text-[11px] text-text-muted">
                  Mathematical perturbation via constrained distance minimization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-pill text-xs font-semibold flex items-center gap-1.5 border ${
                  result.outcome_flipped
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {result.outcome_flipped ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Decision Flipped Successfully!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Decision Strongly Anchored
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Before vs After Prediction Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-border/80 bg-surface">
              <span className="text-[11px] font-mono uppercase text-text-muted block mb-1">
                Baseline Prediction
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold font-mono text-text-primary">
                  {String(result.original_prediction)}
                </span>
                {result.original_probability !== null && result.original_probability !== undefined && (
                  <span className="text-xs text-text-muted font-mono">
                    ({(result.original_probability * 100).toFixed(1)}% confidence)
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-cyan-500/40 bg-surface">
              <span className="text-[11px] font-mono uppercase text-cyan-400 block mb-1">
                Counterfactual Outcome
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold font-mono text-cyan-400">
                  {String(result.counterfactual_prediction)}
                </span>
                {result.counterfactual_probability !== null && result.counterfactual_probability !== undefined && (
                  <span className="text-xs text-cyan-400/80 font-mono">
                    ({(result.counterfactual_probability * 100).toFixed(1)}% confidence)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Feature Changes List */}
          {result.required_changes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Required Feature Adjustments to Flip Decision:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {result.required_changes.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/80 bg-surface flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-medium text-text-primary block">
                        {ch.feature}
                      </span>
                      <span className="text-[11px] text-text-muted">{ch.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-text-muted line-through">{String(ch.original_value)}</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400 font-bold">{String(ch.proposed_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recourse Summary Box */}
          <div className="p-3.5 rounded-lg bg-surface border border-border/80 text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary block mb-1">Plain-English Recourse:</span>
            {result.recourse_summary}
          </div>

          {/* Academic Disclaimer */}
          <div className="flex items-start gap-2 text-[10px] text-text-muted italic">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>{result.academic_disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
