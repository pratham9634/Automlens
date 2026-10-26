"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnInfo,
  SinglePredictionResponse,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import { Play, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

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

  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SinglePredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <Card className="lg:col-span-2 p-5 sm:p-6 space-y-5">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Feature Values Input
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Specify feature values for an unseen sample. Preprocessing transformations (imputation, encoding, scaling) are executed inside the serialized pipeline.
          </p>
        </div>

        <form onSubmit={handlePredict} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-2">
            {featureCols.map((col) => (
              <div key={col.name} className="space-y-1.5">
                <label className="block text-xs font-mono text-text-secondary">
                  <span>{col.name}</span>
                  <span className="text-[10px] text-text-muted ml-1.5">
                    ({col.dtype})
                  </span>
                </label>
                <input
                  type={col.dtype === "numeric" ? "number" : "text"}
                  step={col.dtype === "numeric" ? "any" : undefined}
                  value={inputs[col.name] ?? ""}
                  onChange={(e) => handleInputChange(col.name, e.target.value, col.dtype)}
                  placeholder={`Enter ${col.name}...`}
                  className="w-full px-3 py-2 rounded-md bg-surface-subtle border border-border hover:border-border-strong text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">
              Target: <strong className="text-text-primary font-semibold">{targetColumn}</strong>
            </span>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="gap-2 font-mono text-xs"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{loading ? "Running Inference..." : "Run Single Prediction"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Prediction Output Card (Right 1 col) */}
      <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Inference Result</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Instant prediction generated by fitted pipeline.
            </p>
          </div>

          {error && (
            <AlertRow variant="danger" title="Inference Error">
              {error}
            </AlertRow>
          )}

          {result ? (
            <div className="space-y-5">
              {/* Predicted Value Card */}
              <div className="p-4 rounded-lg bg-surface-subtle border border-border space-y-1.5 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Predicted {result.target_column}
                </span>
                <div className="text-2xl font-bold font-mono text-accent tabular-nums">
                  {typeof result.prediction === "boolean"
                    ? result.prediction
                      ? "True"
                      : "False"
                    : String(result.prediction)}
                </div>
                {result.confidence !== null && result.confidence !== undefined && (
                  <div className="text-xs font-mono text-text-muted tabular-nums">
                    Confidence:{" "}
                    <strong className="text-text-primary">
                      {(result.confidence * 100).toFixed(1)}%
                    </strong>
                  </div>
                )}
              </div>

              {/* Class Probability Distribution (if classification) */}
              {result.probabilities && result.probabilities.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="text-xs font-mono text-text-muted">
                    Class Probability Distribution:
                  </div>
                  <div className="space-y-2.5">
                    {result.probabilities.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono text-text-primary">
                          <span className="truncate">Class: {item.label}</span>
                          <span className="font-semibold text-text-secondary tabular-nums">
                            {(item.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-300"
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
            <div className="py-16 text-center text-xs font-mono text-text-muted space-y-2">
              <Sparkles className="w-6 h-6 text-text-muted/40 mx-auto" />
              <p>Enter values on the left and click &quot;Run Single Prediction&quot; to view output.</p>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-text-muted border-t border-border pt-3">
          Estimator: <span className="text-text-primary font-mono">{modelId}</span>
        </div>
      </Card>
    </div>
  );
}
