"use client";

import { useState } from "react";
import { BatchPredictionResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
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
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BatchPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
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

  const predictedColName = `predicted_${targetColumn}`;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        className={`p-8 border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-4 ${
          isDragOver
            ? "border-accent bg-accent/5"
            : file
            ? "border-success/50 bg-success/5"
            : "border-border hover:border-border-strong bg-surface"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted">
          {file ? (
            <FileSpreadsheet className="w-6 h-6 text-success" />
          ) : (
            <UploadCloud className="w-6 h-6 text-accent" />
          )}
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold text-text-primary">
            {file ? file.name : "Drag and drop batch CSV or Excel file"}
          </div>
          <p className="text-xs text-text-muted">
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for batch inference`
              : "Upload an unseen dataset matching training columns to generate predictions"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => document.getElementById("batch-file-input")?.click()}
            className="font-mono text-xs"
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
              disabled={uploading}
              className="gap-2 font-mono text-xs"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{uploading ? "Running Batch..." : "Run Batch Predictions"}</span>
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <AlertRow variant="danger" title="Batch Inference Error">
          {error}
        </AlertRow>
      )}

      {/* Batch Results Preview Table */}
      {result && (
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Batch Inference Completed</span>
                <Badge variant="success" size="sm" className="font-mono tabular-nums">
                  {result.total_rows} Rows Annotated
                </Badge>
              </div>
              <p className="text-xs text-text-muted">
                Showing preview of first 10 rows. Download the full annotated dataset below.
              </p>
            </div>

            <a
              href={result.download_url}
              download
              className="self-start sm:self-auto"
            >
              <Button variant="primary" size="sm" className="gap-2 font-mono text-xs">
                <Download className="w-4 h-4" />
                <span>Download Annotated CSV</span>
              </Button>
            </a>
          </div>

          {/* Preview Table */}
          {result.preview_rows.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
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
          )}
        </Card>
      )}
    </div>
  );
}
