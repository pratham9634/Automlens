"use client";

import { useEffect, useState } from "react";
import {
  ConfusionMatrixResponse,
  ModelDetailResponse,
  ModelRun,
  TaskType,
} from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  X,
  Download,
  Loader2,
  Table,
  CheckCircle2,
  Layers,
  Clock,
  ShieldCheck,
  Grid,
} from "lucide-react";

interface ModelInspectorDialogProps {
  projectId: string;
  model: ModelRun;
  taskType: TaskType;
  isOpen: boolean;
  onClose: () => void;
  onSelectForPredict?: (modelId: string) => void;
}

export function ModelInspectorDialog({
  projectId,
  model,
  taskType,
  isOpen,
  onClose,
  onSelectForPredict,
}: ModelInspectorDialogProps) {
  const [details, setDetails] = useState<ModelDetailResponse | null>(null);
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"folds" | "confusion">("folds");

  const isClassification = taskType !== "regression";

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    async function fetchData() {
      try {
        const detailData = await apiClient.getModelDetails(projectId, model.model_id);
        if (mounted) setDetails(detailData);

        if (isClassification) {
          try {
            const cmData = await apiClient.getConfusionMatrix(projectId, model.model_id);
            if (mounted) setConfusionMatrix(cmData);
          } catch (cmErr) {
            console.error("Could not fetch confusion matrix:", cmErr);
          }
        }
      } catch (err) {
        console.error("Error fetching model inspection details:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [projectId, model.model_id, isOpen, isClassification]);

  if (!isOpen) return null;

  const downloadUrl = apiClient.getModelDownloadUrl(projectId, model.model_id);

  // Compute maximum cell value in confusion matrix for background intensity
  const maxMatrixVal = confusionMatrix
    ? Math.max(...confusionMatrix.matrix.flatMap((row) => row), 1)
    : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-xl border border-hairline bg-surface-1 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-hairline bg-surface-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-ink font-mono">{model.model_name}</h2>
              {model.is_baseline && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-lavender/10 text-brand-hover border border-brand-lavender/30">
                  Rule 4 Baseline
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Model ID: <span className="font-mono text-ink">{model.model_id}</span> • Evaluation: 5-Fold Cross-Validation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-hairline text-xs font-mono text-ink transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-hover" />
              <span>Download .joblib</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-hairline bg-surface-1/50 text-xs font-mono">
          <button
            onClick={() => setActiveTab("folds")}
            className={`pb-2.5 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "folds"
                ? "border-brand-lavender text-brand-hover"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            5-Fold Cross-Validation Metrics
          </button>
          {isClassification && (
            <button
              onClick={() => setActiveTab("confusion")}
              className={`pb-2.5 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "confusion"
                  ? "border-brand-lavender text-brand-hover"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Confusion Matrix & Per-Class Metrics
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-hover" />
              <span className="text-xs font-mono text-ink-muted">Loading model inspection report...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: 5-Fold CV Breakdown Table */}
              {activeTab === "folds" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                    <span>Performance evaluated across 5 stratified folds (Rule 3)</span>
                    <span>Train Time: {model.train_time_seconds?.toFixed(2)}s</span>
                  </div>

                  {model.all_metrics ? (
                    <div className="rounded-lg border border-hairline overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-surface-2 text-ink-muted border-b border-hairline">
                          <tr>
                            <th className="py-2.5 px-3.5">Metric</th>
                            <th className="py-2.5 px-3">Fold 1</th>
                            <th className="py-2.5 px-3">Fold 2</th>
                            <th className="py-2.5 px-3">Fold 3</th>
                            <th className="py-2.5 px-3">Fold 4</th>
                            <th className="py-2.5 px-3">Fold 5</th>
                            <th className="py-2.5 px-3.5 font-semibold text-ink">Mean ± Std</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {Object.entries(model.all_metrics).map(([metricName, agg]) => {
                            const isPrimary = metricName === model.primary_metric_name;
                            return (
                              <tr
                                key={metricName}
                                className={isPrimary ? "bg-surface-2/40 font-medium" : "hover:bg-surface-2/20"}
                              >
                                <td className="py-2.5 px-3.5 text-ink flex items-center gap-1.5">
                                  <span>{metricName}</span>
                                  {isPrimary && (
                                    <span className="text-[9px] px-1 rounded bg-brand-lavender/15 text-brand-hover border border-brand-lavender/30">
                                      Primary
                                    </span>
                                  )}
                                </td>
                                {agg.folds.map((val, idx) => (
                                  <td key={idx} className="py-2.5 px-3 text-ink-muted">
                                    {val.toFixed(4)}
                                  </td>
                                ))}
                                <td className="py-2.5 px-3.5 text-ink font-semibold">
                                  {agg.mean.toFixed(4)} ± {agg.std.toFixed(4)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-ink-muted p-4 text-center">
                      Detailed fold metrics unavailable.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Confusion Matrix & Per-Class Metrics */}
              {activeTab === "confusion" && confusionMatrix && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                    <span>Evaluated on full dataset (Overall Accuracy: {(confusionMatrix.overall_accuracy * 100).toFixed(1)}%)</span>
                    <span>{confusionMatrix.classes.length} Classes</span>
                  </div>

                  {/* Confusion Matrix Heatmap Table */}
                  <div className="p-4 rounded-xl border border-hairline bg-surface-2/30 space-y-3">
                    <div className="text-xs font-mono font-semibold text-ink text-center">
                      Predicted Class (Columns) vs Actual Class (Rows)
                    </div>

                    <div className="overflow-x-auto flex justify-center">
                      <table className="border-collapse text-xs font-mono">
                        <thead>
                          <tr>
                            <th className="p-2 text-ink-subtle text-right">Actual \ Pred</th>
                            {confusionMatrix.classes.map((c) => (
                              <th key={c} className="p-2 text-center font-semibold text-ink max-w-[100px] truncate">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {confusionMatrix.matrix.map((row, rIdx) => {
                            const actualClass = confusionMatrix.classes[rIdx];
                            return (
                              <tr key={actualClass}>
                                <td className="p-2 text-right font-semibold text-ink max-w-[100px] truncate">
                                  {actualClass}
                                </td>
                                {row.map((count, cIdx) => {
                                  const isDiagonal = rIdx === cIdx;
                                  const ratio = count / maxMatrixVal;
                                  return (
                                    <td
                                      key={cIdx}
                                      className={`p-3 text-center border border-hairline min-w-[60px] ${
                                        isDiagonal
                                          ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                                          : ratio > 0
                                          ? "bg-rose-500/15 text-rose-300"
                                          : "bg-surface-1 text-ink-faint"
                                      }`}
                                    >
                                      {count}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Per-Class Precision & Recall Table */}
                  <div className="rounded-lg border border-hairline overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-surface-2 text-ink-muted border-b border-hairline">
                        <tr>
                          <th className="py-2.5 px-3.5">Class Label</th>
                          <th className="py-2.5 px-3">Precision</th>
                          <th className="py-2.5 px-3">Recall</th>
                          <th className="py-2.5 px-3">F1-Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {Object.entries(confusionMatrix.per_class_metrics).map(([cls, met]) => (
                          <tr key={cls} className="hover:bg-surface-2/20">
                            <td className="py-2 px-3.5 text-ink font-medium">{cls}</td>
                            <td className="py-2 px-3 text-ink-muted">{met.precision.toFixed(4)}</td>
                            <td className="py-2 px-3 text-ink-muted">{met.recall.toFixed(4)}</td>
                            <td className="py-2 px-3 text-ink font-semibold">{met.f1.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-hairline bg-surface-1/80 flex items-center justify-between">
          <div className="text-[11px] font-mono text-ink-muted flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fitted pipeline verified and ready for inference</span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectForPredict && (
              <button
                onClick={() => {
                  onSelectForPredict(model.model_id);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm"
              >
                Use in Prediction Form
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-hairline hover:bg-surface-2 text-xs font-mono text-ink transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
