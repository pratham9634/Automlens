"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnInfo,
  SinglePredictionResponse,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { Play, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface SinglePredictionFormProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
}

export function SinglePredictionForm({
  projectId,
  modelId,
  columns,
  targetColumn,
}: SinglePredictionFormProps) {
  const featureCols = useMemo(
    () => columns.filter((c) => c.name !== targetColumn),
    [columns, targetColumn]
  );

  // Initialize input state with empty defaults
  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SinglePredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Populate sensible defaults
  useEffect(() => {
    const initial: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      if (col.dtype === "numeric") {
        initial[col.name] = 0;
      } else {
        initial[col.name] = "";
      }
    });
    setInputs(initial);
  }, [featureCols]);

  const handleInputChange = (colName: string, val: string, dtype: string) => {
    setInputs((prev) => ({
      ...prev,
      [colName]: dtype === "numeric" ? (val === "" ? "" : Number(val)) : val,
    }));
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Input Fields (Left 2 cols) */}
      <div className="lg:col-span-2 p-6 rounded-xl border border-hairline bg-surface-1 space-y-5">
        <div className="border-b border-hairline pb-3">
          <h3 className="text-sm font-semibold text-ink">Feature Values Input</h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Specify feature values for an unseen sample. Preprocessing transformations are applied automatically.
          </p>
        </div>

        <form onSubmit={handlePredict} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-2">
            {featureCols.map((col) => (
              <div key={col.name} className="space-y-1.5">
                <label className="block text-xs font-mono text-ink">
                  {col.name}
                  <span className="text-[10px] text-ink-subtle ml-1 font-mono">({col.dtype})</span>
                </label>
                <input
                  type={col.dtype === "numeric" ? "number" : "text"}
                  step={col.dtype === "numeric" ? "any" : undefined}
                  value={inputs[col.name] ?? ""}
                  onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                  placeholder={`Enter ${col.name}...`}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-hairline hover:border-hairline-strong text-xs font-mono text-ink focus:outline-none focus:border-brand-lavender transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-between">
            <span className="text-[11px] font-mono text-ink-muted">
              Target: <span className="text-ink font-semibold">{targetColumn}</span>
            </span>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-semibold transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{loading ? "Running Inference..." : "Run Single Prediction"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Prediction Output Card (Right 1 col) */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="border-b border-hairline pb-3">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-hover" />
              <span>Inference Result</span>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Instant prediction generated by fitted pipeline.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-5">
              {/* Predicted Value Card */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-hairline space-y-1 text-center">
                <span className="text-[10px] font-mono uppercase text-ink-subtle">
                  Predicted {result.target_column}
                </span>
                <div className="text-2xl font-bold font-mono text-brand-hover">
                  {typeof result.prediction === "boolean"
                    ? result.prediction
                      ? "True"
                      : "False"
                    : String(result.prediction)}
                </div>
                {result.confidence !== null && result.confidence !== undefined && (
                  <div className="text-xs font-mono text-ink-muted">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Class Probability Distribution (if classification) */}
              {result.probabilities && result.probabilities.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-hairline">
                  <div className="text-[11px] font-mono text-ink-muted">
                    Class Probability Distribution:
                  </div>
                  <div className="space-y-2">
                    {result.probabilities.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-ink">
                          <span className="truncate">{item.label}</span>
                          <span className="font-semibold text-ink-muted">
                            {(item.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full bg-brand-lavender rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(2, item.probability * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-mono text-ink-muted space-y-2">
              <Sparkles className="w-6 h-6 text-ink-faint mx-auto" />
              <p>Enter values on the left and click &quot;Run Single Prediction&quot; to view output.</p>
            </div>
          )}
        </div>

        <div className="text-[10px] font-mono text-ink-faint border-t border-hairline pt-3">
          Model: <span className="text-ink font-mono">{modelId}</span>
        </div>
      </div>
    </div>
  );
}
