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
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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

  const downloadUrl = apiClient.getModelDownloadUrl(projectId, model.model_id);

  const maxMatrixVal = confusionMatrix
    ? Math.max(...confusionMatrix.matrix.flatMap((row) => row), 1)
    : 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-border bg-surface m-0 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5 flex-wrap">
              <DialogTitle className="font-mono text-base font-semibold text-text-primary">
                {model.model_name}
              </DialogTitle>
              {model.is_baseline && (
                <Badge variant="warning" size="sm" className="font-mono">
                  Rule 4 Baseline
                </Badge>
              )}
            </div>

            <a href={downloadUrl} download>
              <Button variant="secondary" size="sm" className="gap-1.5 font-mono">
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>Download .joblib</span>
              </Button>
            </a>
          </div>

          <DialogDescription className="text-xs text-text-muted">
            Model ID: <span className="font-mono text-text-primary">{model.model_id}</span> • Evaluation: 5-Fold Cross-Validation
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-2 border-b border-border bg-surface-subtle text-xs font-mono">
          <button
            onClick={() => setActiveTab("folds")}
            className={`pb-2 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "folds"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            5-Fold Cross-Validation Metrics
          </button>
          {isClassification && (
            <button
              onClick={() => setActiveTab("confusion")}
              className={`pb-2 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
                activeTab === "confusion"
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              Confusion Matrix &amp; Per-Class Metrics
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-xs font-mono text-text-muted">Loading model inspection report...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: 5-Fold CV Breakdown Table */}
              {activeTab === "folds" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span>Performance evaluated across 5 stratified folds (Rule 3)</span>
                    <span className="tabular-nums">Train Time: {model.train_time_seconds?.toFixed(2)}s</span>
                  </div>

                  {model.all_metrics ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Fold 1</TableHead>
                          <TableHead className="text-right">Fold 2</TableHead>
                          <TableHead className="text-right">Fold 3</TableHead>
                          <TableHead className="text-right">Fold 4</TableHead>
                          <TableHead className="text-right">Fold 5</TableHead>
                          <TableHead className="text-right font-semibold text-text-primary">
                            Mean ± Std
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(model.all_metrics).map(([metricName, agg]) => {
                          const isPrimary = metricName === model.primary_metric_name;
                          return (
                            <TableRow
                              key={metricName}
                              className={isPrimary ? "bg-accent/5 font-medium" : undefined}
                            >
                              <TableCell className="text-text-primary font-mono flex items-center gap-1.5">
                                <span>{metricName}</span>
                                {isPrimary && (
                                  <Badge variant="accent" size="sm">
                                    Primary
                                  </Badge>
                                )}
                              </TableCell>
                              {agg.folds.map((val, idx) => (
                                <TableCell key={idx} className="text-right font-mono text-text-muted tabular-nums">
                                  {val.toFixed(4)}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-mono text-text-primary font-semibold tabular-nums">
                                {agg.mean.toFixed(4)} ± {agg.std.toFixed(4)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-xs font-mono text-text-muted p-4 text-center">
                      Detailed fold metrics unavailable.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Confusion Matrix & Per-Class Metrics */}
              {activeTab === "confusion" && confusionMatrix && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span>Evaluated on full dataset (Overall Accuracy: {(confusionMatrix.overall_accuracy * 100).toFixed(1)}%)</span>
                    <span className="tabular-nums">{confusionMatrix.classes.length} Classes</span>
                  </div>

                  {/* Confusion Matrix Heatmap Table */}
                  <div className="p-4 rounded-card border border-border bg-surface-subtle space-y-3">
                    <div className="text-xs font-mono font-semibold text-text-primary text-center">
                      Predicted Class (Columns) vs Actual Class (Rows)
                    </div>

                    <div className="overflow-x-auto flex justify-center">
                      <table className="border-collapse text-xs font-mono">
                        <thead>
                          <tr>
                            <th className="p-2 text-text-muted text-right">Actual \ Pred</th>
                            {confusionMatrix.classes.map((c) => (
                              <th key={c} className="p-2 text-center font-semibold text-text-primary max-w-[100px] truncate">
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
                                <td className="p-2 text-right font-semibold text-text-primary max-w-[100px] truncate">
                                  {actualClass}
                                </td>
                                {row.map((count, cIdx) => {
                                  const isDiagonal = rIdx === cIdx;
                                  const ratio = count / maxMatrixVal;
                                  return (
                                    <td
                                      key={cIdx}
                                      className={`p-3 text-center border border-border min-w-[60px] tabular-nums ${
                                        isDiagonal
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                                          : ratio > 0
                                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-medium"
                                          : "bg-surface text-text-muted"
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Label</TableHead>
                        <TableHead className="text-right">Precision</TableHead>
                        <TableHead className="text-right">Recall</TableHead>
                        <TableHead className="text-right">F1-Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(confusionMatrix.per_class_metrics).map(([cls, met]) => (
                        <TableRow key={cls}>
                          <TableCell className="font-mono text-text-primary font-medium">{cls}</TableCell>
                          <TableCell className="text-right font-mono text-text-muted tabular-nums">
                            {met.precision.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-text-muted tabular-nums">
                            {met.recall.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-text-primary font-semibold tabular-nums">
                            {met.f1.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 m-0">
          <div className="text-[11px] font-mono text-text-muted flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>Fitted pipeline verified and ready for inference</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onSelectForPredict && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onSelectForPredict(model.model_id);
                  onClose();
                }}
                className="font-mono text-xs"
              >
                Use in Prediction Form
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="font-mono text-xs"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
