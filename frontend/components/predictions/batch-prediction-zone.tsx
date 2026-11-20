"use client";

import { useState } from "react";
import { BatchPredictionResponse, BatchValidationResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface BatchPredictionZoneProps {
  projectId: string;
  modelId: string;
  targetColumn: string;
}

export function BatchPredictionZone({
  projectId,
  modelId,
  targetColumn,
}: BatchPredictionZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<BatchValidationResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BatchPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFileSelection = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setValidating(true);

    try {
      const valRes = await apiClient.validateBatch(projectId, modelId, selectedFile);
      setValidation(valRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schema validation failed.");
      setValidation(null);
    } finally {
      setValidating(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileSelection(e.target.files[0]);
    }
  };

  const handleRunBatch = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await apiClient.predictBatch(projectId, modelId, file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute batch prediction.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setResult(null);
    setError(null);
  };

  const predictedColName = `predicted_${targetColumn}`;
  const dist = result?.distribution_summary;

  return (
    <div className="space-y-6">
      {/* Upload & Pre-Flight Validation Card */}
      {!result ? (
        <Card
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`p-8 border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-4 bg-surface/90 backdrop-blur-sm ${
            isDragOver
              ? "border-accent bg-accent/5 shadow-md"
              : validation?.valid
              ? "border-success/60 bg-success/5"
              : validation?.valid === false
              ? "border-danger/60 bg-danger/5"
              : file
              ? "border-accent/40 bg-surface"
              : "border-border hover:border-border-strong bg-surface shadow-xs"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted">
            {validating ? (
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            ) : validation?.valid ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : validation?.valid === false ? (
              <AlertTriangle className="w-6 h-6 text-danger" />
            ) : file ? (
              <FileSpreadsheet className="w-6 h-6 text-accent" />
            ) : (
              <UploadCloud className="w-6 h-6 text-accent" />
            )}
          </div>

          <div className="space-y-1.5 max-w-lg">
            <div className="text-sm font-semibold text-text-primary">
              {file ? file.name : "Drag and drop batch CSV or Excel file"}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {validating
                ? "Running pre-flight schema verification against fitted pipeline features..."
                : validation
                ? validation.message
                : file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for pre-flight check`
                : "Upload an unseen dataset matching training columns to generate predictions in parallel."}
            </p>
          </div>

          {/* Validation Feedback Pills */}
          {validation && (
            <div className="w-full max-w-xl p-3.5 rounded-lg border border-border bg-surface text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-text-primary">Schema Pre-Flight:</span>
                <span className="text-text-muted">
                  {validation.matched_features.length} / {validation.required_features.length} Matched Features
                </span>
              </div>

              {validation.missing_features.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-danger">Missing Columns:</span>
                  <div className="flex flex-wrap gap-1">
                    {validation.missing_features.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-danger/10 border border-danger/30 text-danger text-[10px] font-mono"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validation.matched_features.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-success">Verified Features:</span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {validation.matched_features.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-success/10 border border-success/30 text-success text-[10px] font-mono"
                      >
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => document.getElementById("batch-file-input")?.click()}
              className="font-mono text-xs h-8 px-3"
            >
              Browse File
            </Button>
            <input
              id="batch-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunBatch}
                disabled={uploading || validating || (validation !== null && !validation.valid)}
                className="gap-2 font-mono text-xs h-8 px-4"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{uploading ? "Running Batch Inference..." : "Execute Batch Inference"}</span>
              </Button>
            )}

            {file && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs font-mono text-text-muted hover:text-text-primary h-8 px-2"
                title="Cancel file selection"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {error && (
        <AlertRow variant="danger" title="Batch Inference Error">
          {error}
        </AlertRow>
      )}

      {/* Batch Results Dashboard & Preview Table */}
      {result && (
        <div className="space-y-5 animate-in fade-in-50 duration-300">
          {/* Executive Analytics Card */}
          <Card className="p-5 sm:p-6 space-y-5 bg-surface/90 backdrop-blur-sm border-border/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Batch Prediction Complete</span>
                  <Badge variant="success" size="sm" className="font-mono tabular-nums">
                    {result.total_rows.toLocaleString()} Rows Evaluated
                  </Badge>
                </div>
                <p className="text-xs text-text-muted">
                  Full dataset was processed through fitted pipeline and serialized with predicted labels.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 font-mono text-xs h-8 px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                  <span>Upload Another</span>
                </Button>

                <a href={result.download_url} download>
                  <Button variant="primary" size="sm" className="gap-2 font-mono text-xs h-8 px-3.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Annotated CSV</span>
                  </Button>
                </a>
              </div>
            </div>

            {/* Distribution Summary Metrics */}
            {dist && (
              <div className="p-4 rounded-xl border border-border bg-surface-subtle/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-accent" />
                    <span>Inference Distribution Analytics</span>
                  </span>
                  {dist.mean_confidence !== undefined && (
                    <span className="text-text-muted">
                      Avg Confidence: <strong className="text-text-primary">{(dist.mean_confidence * 100).toFixed(1)}%</strong>
                    </span>
                  )}
                </div>

                {dist.type === "classification" && dist.class_percentages && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {Object.entries(dist.class_percentages as Record<string, number | string>).map(([cls, pct]) => {
                        const count = (dist.class_counts as Record<string, number>)?.[cls] ?? 0;
                        return (
                          <div key={cls} className="p-2.5 rounded-lg border border-border bg-surface space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                              <span>Class: <strong className="text-text-primary">{cls}</strong></span>
                              <span className="font-semibold text-accent tabular-nums">{String(pct)}%</span>
                            </div>
                            <div className="text-[11px] font-mono text-text-muted">
                              {count.toLocaleString()} rows
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${Math.min(100, Math.max(4, Number(pct)))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {dist.type === "regression" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Mean</span>
                      <div className="text-sm font-bold font-mono text-text-primary tabular-nums">{dist.mean}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Median</span>
                      <div className="text-sm font-bold font-mono text-text-primary tabular-nums">{dist.median}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Min - Max</span>
                      <div className="text-xs font-bold font-mono text-text-primary tabular-nums">{dist.min} – {dist.max}</div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                      <span className="text-[10px] font-mono text-text-muted uppercase">Std Dev</span>
                      <div className="text-sm font-bold font-mono text-text-primary tabular-nums">±{dist.std}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            {result.preview_rows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-text-muted">
                  First 10 Rows Preview (Inspect Output Column):
                </div>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(result.preview_rows[0]).map((col) => {
                          const isPredicted = col === predictedColName;
                          const isConfidence = col === "prediction_confidence";
                          return (
                            <TableHead
                              key={col}
                              className={`whitespace-nowrap font-mono text-xs ${
                                isPredicted
                                  ? "bg-accent/15 text-accent font-semibold"
                                  : isConfidence
                                  ? "bg-success/15 text-success font-semibold"
                                  : ""
                              }`}
                            >
                              {col}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.preview_rows.map((row, rIdx) => (
                        <TableRow key={rIdx}>
                          {Object.entries(row).map(([col, val], cIdx) => {
                            const isPredicted = col === predictedColName;
                            const isConfidence = col === "prediction_confidence";
                            return (
                              <TableCell
                                key={cIdx}
                                className={`whitespace-nowrap font-mono text-xs tabular-nums ${
                                  isPredicted
                                    ? "bg-accent/5 font-semibold text-accent"
                                    : isConfidence
                                    ? "bg-success/5 font-medium text-success"
                                    : "text-text-primary"
                                }`}
                              >
                                {val !== null && val !== undefined ? String(val) : "—"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
