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
  AlertCircle,
  Table,
} from "lucide-react";

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
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        className={`p-8 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-4 ${
          isDragOver
            ? "border-brand-lavender bg-brand-lavender/10"
            : file
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-hairline hover:border-hairline-strong bg-surface-1"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-hairline flex items-center justify-center text-ink-muted">
          {file ? (
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          ) : (
            <UploadCloud className="w-6 h-6 text-brand-hover" />
          )}
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-ink">
            {file ? file.name : "Drag and drop batch CSV or Excel file"}
          </div>
          <p className="text-[11px] text-ink-muted">
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for batch inference`
              : "Upload an unseen dataset matching training columns to generate predictions"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-hairline hover:bg-surface-2 text-xs font-mono text-ink transition-colors">
            <span>Browse File</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {file && (
            <button
              onClick={handleRunBatch}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-lavender hover:bg-brand-hover text-ink text-xs font-mono font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{uploading ? "Running Batch..." : "Run Batch Predictions"}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Batch Results Preview Table */}
      {result && (
        <div className="rounded-xl border border-hairline bg-surface-1 space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-ink flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Batch Inference Completed</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {result.total_rows} Rows Annotated
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Showing preview of first 10 rows. Download full CSV below.
              </p>
            </div>

            <a
              href={result.download_url}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-semibold transition-colors shadow-sm self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download Annotated CSV</span>
            </a>
          </div>

          {/* Preview Table */}
          {result.preview_rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-hairline">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-2 text-ink-muted border-b border-hairline">
                  <tr>
                    {Object.keys(result.preview_rows[0]).map((col) => {
                      const isPredicted = col === predictedColName;
                      const isConfidence = col === "prediction_confidence";
                      return (
                        <th
                          key={col}
                          className={`py-2.5 px-3 whitespace-nowrap ${
                            isPredicted
                              ? "bg-brand-lavender/20 text-brand-hover font-bold"
                              : isConfidence
                              ? "bg-emerald-500/15 text-emerald-300 font-bold"
                              : ""
                          }`}
                        >
                          {col}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {result.preview_rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-surface-2/20">
                      {Object.entries(row).map(([col, val], cIdx) => {
                        const isPredicted = col === predictedColName;
                        const isConfidence = col === "prediction_confidence";
                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 whitespace-nowrap ${
                              isPredicted
                                ? "bg-brand-lavender/10 font-bold text-brand-hover"
                                : isConfidence
                                ? "bg-emerald-500/10 font-medium text-emerald-300"
                                : "text-ink"
                            }`}
                          >
                            {val !== null && val !== undefined ? String(val) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
