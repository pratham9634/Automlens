"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnInfo,
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
  Lightbulb,
} from "lucide-react";

interface LocalAttributionCardProps {
  projectId: string;
  modelId: string;
  columns: ColumnInfo[];
  targetColumn: string;
}

export function LocalAttributionCard({
  projectId,
  modelId,
  columns,
  targetColumn,
}: LocalAttributionCardProps) {
  const featureCols = useMemo(
    () => columns.filter((c) => c.name !== targetColumn),
    [columns, targetColumn]
  );

  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocalExplanationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize input state with sensible defaults
  useEffect(() => {
    const initial: Record<string, string | number> = {};
    featureCols.forEach((col) => {
      initial[col.name] = col.dtype === "numeric" ? 0 : "";
    });
    setInputs(initial);
  }, [featureCols]);

  const handleInputChange = (colName: string, val: string, dtype: string) => {
    setInputs((prev) => ({
      ...prev,
      [colName]: dtype === "numeric" ? (val === "" ? "" : Number(val)) : val,
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

  // Find max absolute attribution for relative bar scaling
  const maxAbsAttr = useMemo(() => {
    if (!result?.attributions?.length) return 1;
    return Math.max(...result.attributions.map((a) => Math.abs(a.attribution_value)), 0.0001);
  }, [result]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Form Column */}
      <div className="lg:col-span-5 p-5 rounded-xl bg-surface-1 border border-hairline space-y-4">
        <div>
          <h3 className="text-sm font-medium text-ink flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            Explain Observation
          </h3>
          <p className="text-xs text-ink-muted mt-1 font-mono">
            Enter test values to compute local SHAP attribution factors for this single case.
          </p>
        </div>

        <form onSubmit={handleExplain} className="space-y-4 pt-2">
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 divide-y divide-hairline">
            {featureCols.map((col) => (
              <div key={col.name} className="pt-2 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`input-${col.name}`} className="font-mono text-ink">
                    {col.name}
                  </label>
                  <span className="text-[10px] font-mono text-ink-subtle px-1.5 py-0.5 rounded bg-surface-2 border border-hairline">
                    {col.dtype}
                  </span>
                </div>
                <input
                  id={`input-${col.name}`}
                  type={col.dtype === "numeric" ? "number" : "text"}
                  step={col.dtype === "numeric" ? "any" : undefined}
                  value={inputs[col.name] ?? ""}
                  onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-hairline hover:border-hairline-strong text-xs font-mono text-ink placeholder:text-ink-subtle focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-sm"
                  placeholder={`Enter ${col.name}...`}
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-medium text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Computing SHAP Waterfall...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Explain This Observation
              </>
            )}
          </button>
        </form>
      </div>

      {/* Attribution Waterfall Column */}
      <div className="lg:col-span-7 p-5 rounded-xl bg-surface-1 border border-hairline flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <h3 className="text-sm font-medium text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              SHAP Attribution Waterfall
            </h3>
            {result && (
              <span className="text-[10px] font-mono text-ink-muted">
                {result.method_label}
              </span>
            )}
          </div>

          {result ? (
            <div className="space-y-5 pt-3">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-2 border border-hairline text-center">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Base Value E[f(x)]</div>
                  <div className="text-sm font-mono text-ink font-semibold mt-0.5">
                    {result.base_value.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Predicted Output</div>
                  <div className="text-sm font-mono text-emerald-400 font-bold mt-0.5">
                    {String(result.prediction)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Final f(x)</div>
                  <div className="text-sm font-mono text-ink font-semibold mt-0.5">
                    {result.predicted_value.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Layman Explanation Callout */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-ink leading-relaxed">
                  {result.layman_explanation}
                </p>
              </div>

              {/* Feature Attribution Waterfall Bars */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-ink-muted flex items-center justify-between">
                  <span>Feature & Value</span>
                  <span>Impact on Prediction</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.attributions.map((attr) => {
                    const absVal = Math.abs(attr.attribution_value);
                    const widthPercent = Math.min(100, (absVal / maxAbsAttr) * 100);
                    const isPositive = attr.direction === "positive";
                    const isNegative = attr.direction === "negative";

                    return (
                      <div
                        key={attr.feature_name}
                        className="p-2.5 rounded-lg bg-surface-2/60 border border-hairline/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-ink font-medium">
                            {attr.feature_name}
                            {attr.feature_value !== null && attr.feature_value !== undefined && (
                              <span className="text-ink-muted font-normal ml-1">
                                = {String(attr.feature_value)}
                              </span>
                            )}
                          </span>
                          <span
                            className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${
                              isPositive
                                ? "text-emerald-400"
                                : isNegative
                                ? "text-rose-400"
                                : "text-ink-muted"
                            }`}
                          >
                            {isPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
                            {isNegative && <ArrowDownRight className="w-3.5 h-3.5" />}
                            {attr.attribution_value > 0 ? "+" : ""}
                            {attr.attribution_value.toFixed(4)}
                          </span>
                        </div>

                        {/* Relative Impact Progress Bar */}
                        <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isPositive
                                ? "bg-emerald-500"
                                : isNegative
                                ? "bg-rose-500"
                                : "bg-ink-muted/30"
                            }`}
                            style={{ width: `${Math.max(4, widthPercent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs font-mono text-ink-muted space-y-2">
              <Sparkles className="w-6 h-6 text-ink-faint mx-auto" />
              <p>Enter observation features on the left and click &quot;Explain This Observation&quot;.</p>
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
