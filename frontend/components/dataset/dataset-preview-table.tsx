"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Hash,
  Database,
  Columns3,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  Table,
  CheckCircle2,
} from "lucide-react";
import { DatasetPreviewResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface DatasetPreviewTableProps {
  projectId: string;
  data: DatasetPreviewResponse;
  onDeleteSuccess: () => void;
}

export function DatasetPreviewTable({
  projectId,
  data,
  onDeleteSuccess,
}: DatasetPreviewTableProps) {
  const { dataset, preview_rows } = data;
  const [copiedHash, setCopiedHash] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(dataset.sha256_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to remove '${dataset.filename}'? This will delete the dataset file and schema metadata.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteDataset(projectId);
      onDeleteSuccess();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete dataset."
      );
      setDeleting(false);
    }
  };

  // Group columns by data type
  const dtypeCounts = dataset.columns.reduce((acc, col) => {
    acc[col.dtype] = (acc[col.dtype] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Telemetry Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* File Name & Format */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              File Name
            </span>
            <FileSpreadsheet className="w-4 h-4 text-brand-hover" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink truncate" title={dataset.filename}>
              {dataset.filename}
            </div>
            <div className="text-[11px] font-mono text-ink-muted pt-0.5">
              {formatBytes(dataset.file_size_bytes)}
            </div>
          </div>
        </div>

        {/* Total Rows */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Total Rows
            </span>
            <Database className="w-4 h-4 text-telemetry-emerald" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-ink">
              {dataset.row_count.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-telemetry-emerald flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Loaded into memory
            </div>
          </div>
        </div>

        {/* Total Columns */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Features
            </span>
            <Columns3 className="w-4 h-4 text-telemetry-cyan" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-ink">
              {dataset.column_count}
            </div>
            <div className="text-[11px] font-mono text-ink-muted pt-0.5">
              {dtypeCounts["numeric"] || 0} num • {dtypeCounts["categorical"] || 0} cat
            </div>
          </div>
        </div>

        {/* SHA-256 Fingerprint */}
        <div className="p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Fingerprint
            </span>
            <Hash className="w-4 h-4 text-telemetry-amber" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono text-ink-muted truncate" title={dataset.sha256_hash}>
                {dataset.sha256_hash.slice(0, 10)}...{dataset.sha256_hash.slice(-8)}
              </span>
              <button
                onClick={copyHash}
                title="Copy full SHA-256 hash"
                className="p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors"
              >
                {copiedHash ? (
                  <Check className="w-3.5 h-3.5 text-telemetry-emerald" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-[10px] font-mono text-ink-subtle pt-0.5">
              Strict audit hash
            </div>
          </div>
        </div>
      </div>

      {/* Delete / Replace Action Banner */}
      {deleteError && (
        <div className="p-3 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 text-xs font-mono text-telemetry-rose">
          {deleteError}
        </div>
      )}

      {/* Columns Schema Summary */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Table className="w-4 h-4 text-brand-hover" />
              Column Schema & Missing Values
            </h3>
            <p className="text-xs text-ink-muted">
              Auto-detected physical types and null proportions prior to CV fold transformation.
            </p>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 hover:bg-telemetry-rose/20 text-xs text-telemetry-rose transition-colors self-start sm:self-auto"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Replace / Delete Dataset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {dataset.columns.map((col) => {
            const hasNulls = col.null_percentage > 0;
            return (
              <div
                key={col.name}
                className="p-2.5 rounded-lg border border-hairline bg-surface-2/60 flex items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-ink font-medium truncate" title={col.name}>
                    {col.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted">
                    <span
                      className={`px-1.5 py-0.2 rounded ${
                        col.dtype === "numeric"
                          ? "bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/20"
                          : col.dtype === "categorical"
                          ? "bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/20"
                          : "bg-surface-3 text-ink-muted border border-hairline"
                      }`}
                    >
                      {col.dtype}
                    </span>
                    <span>• {col.non_null_count.toLocaleString()} valid</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {hasNulls ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-telemetry-amber font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {col.null_percentage.toFixed(1)}% null
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-ink-subtle">
                      0% null
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10-Row Data Table Preview */}
      <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Data Preview (First {preview_rows.length} Rows)
            </h3>
            <p className="text-xs text-ink-muted">
              Inspect raw feature formats before initiating statistical profiling or automated training.
            </p>
          </div>
          <span className="text-[11px] font-mono text-ink-subtle px-2 py-0.5 rounded bg-surface-2 border border-hairline">
            Head 10
          </span>
        </div>

        <div className="rounded-lg border border-hairline overflow-x-auto bg-surface-2/40">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface-2/90">
                <th className="px-3 py-2.5 text-ink-subtle text-[11px] font-medium w-12 border-r border-hairline">
                  #
                </th>
                {dataset.columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-3 py-2.5 text-ink-muted text-[11px] font-medium border-r border-hairline last:border-r-0 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink font-semibold">{col.name}</span>
                      <span className="text-[9px] text-ink-faint px-1 py-0.2 rounded bg-surface-3">
                        {col.dtype}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview_rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-hairline/50 hover:bg-surface-3/30 transition-colors last:border-b-0"
                >
                  <td className="px-3 py-2 text-ink-faint text-[11px] border-r border-hairline">
                    {idx + 1}
                  </td>
                  {dataset.columns.map((col) => {
                    const value = row[col.name];
                    const isNull = value === null || value === undefined;

                    return (
                      <td
                        key={col.name}
                        className="px-3 py-2 border-r border-hairline/50 last:border-r-0 whitespace-nowrap max-w-xs truncate text-ink-muted"
                      >
                        {isNull ? (
                          <span className="text-telemetry-amber/80 italic text-[11px]">
                            null
                          </span>
                        ) : typeof value === "boolean" ? (
                          <span className="text-telemetry-cyan font-semibold">
                            {value ? "TRUE" : "FALSE"}
                          </span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
