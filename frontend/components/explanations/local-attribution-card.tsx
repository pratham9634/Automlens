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
  Search,
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

  const maxAbsAttr = useMemo(() => {
    if (!result?.attributions?.length) return 1;
    return Math.max(...result.attributions.map((a) => Math.abs(a.attribution_value)), 0.0001);
  }, [result]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Form Column (5 cols) */}
      <div className="lg:col-span-5">
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" />
              <span>Observation Inputs</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Specify feature values to compute local SHAP attribution decomposition for a single sample.
            </p>
          </div>

          <form onSubmit={handleExplain} className="space-y-4">
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-2 divide-y divide-border-subtle">
              {featureCols.map((col) => (
                <div key={col.name} className="pt-2.5 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor={`input-${col.name}`} className="font-mono text-text-primary">
                      {col.name}
                    </label>
                    <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-muted border border-border-subtle">
                      {col.dtype}
                    </span>
                  </div>
                  <input
                    id={`input-${col.name}`}
                    type={col.dtype === "numeric" ? "number" : "text"}
                    step={col.dtype === "numeric" ? "any" : undefined}
                    value={inputs[col.name] ?? ""}
                    onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    placeholder={`Enter ${col.name}...`}
                  />
                </div>
              ))}
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
              className="w-full gap-2 font-mono text-xs"
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
              <Badge variant="accent" size="sm" className="font-mono">
                {result.method_label}
              </Badge>
            )}
          </div>

          {result ? (
            <div className="space-y-5">
              {/* Baseline & Predicted Value Header */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-surface-subtle border border-border text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    Base Value (E[f(x)])
                  </span>
                  <div className="text-lg font-bold font-mono text-text-secondary tabular-nums">
                    {result.base_value.toFixed(4)}
                  </div>
                </div>
                <div className="space-y-0.5 border-l border-border pl-3">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    Model Output (f(x))
                  </span>
                  <div className="text-lg font-bold font-mono text-accent tabular-nums">
                    {result.predicted_value.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Attribution Items List */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {result.attributions.map((attr) => {
                  const isPositive = attr.attribution_value >= 0;
                  const absVal = Math.abs(attr.attribution_value);
                  const barWidth = Math.min(100, Math.max(4, (absVal / maxAbsAttr) * 100));

                  return (
                    <div
                      key={attr.feature_name}
                      className="p-3 rounded-lg border border-border bg-surface-subtle/40 hover:bg-surface-subtle transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-danger" />
                          )}
                          <span className="font-semibold text-text-primary">
                            {attr.feature_name}
                          </span>
                          <span className="text-text-muted text-[11px]">
                            = {String(attr.feature_value)}
                          </span>
                        </div>
                        <span
                          className={`font-bold tabular-nums ${
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
                <div className="p-3.5 rounded-lg border border-border bg-surface-subtle/60 text-xs text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Local Interpretation:</strong>{" "}
                  {result.layman_explanation}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-xs font-mono text-text-muted space-y-2">
              <Search className="w-6 h-6 text-text-muted/40 mx-auto" />
              <p>Enter test values on the left and click &quot;Compute Local Waterfall&quot; to decompose output.</p>
            </div>
          )}

          {/* Academic Footer */}
          <div className="text-[11px] text-text-muted border-t border-border pt-3 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Attributions reflect local game-theoretic Shapley contributions for this sample, not causation.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
