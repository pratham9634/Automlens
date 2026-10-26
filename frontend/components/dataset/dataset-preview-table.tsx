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
  Table as TableIcon,
  CheckCircle2,
} from "lucide-react";
import { DatasetPreviewResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertRow } from "@/components/ui/alert-row";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteDataset(projectId);
      setShowDeleteDialog(false);
      onDeleteSuccess();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete dataset."
      );
      setDeleting(false);
    }
  };

  const dtypeCounts = dataset.columns.reduce((acc, col) => {
    acc[col.dtype] = (acc[col.dtype] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Telemetry Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* File Name & Format */}
        <Card className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              File Name
            </span>
            <FileSpreadsheet className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary truncate" title={dataset.filename}>
              {dataset.filename}
            </div>
            <div className="text-[11px] font-mono text-text-muted pt-0.5 tabular-nums">
              {formatBytes(dataset.file_size_bytes)}
            </div>
          </div>
        </Card>

        {/* Total Rows */}
        <Card className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Total Rows
            </span>
            <Database className="w-4 h-4 text-success" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-text-primary tabular-nums">
              {dataset.row_count.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-success flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Validated memory store
            </div>
          </div>
        </Card>

        {/* Total Columns */}
        <Card className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Features
            </span>
            <Columns3 className="w-4 h-4 text-info" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-text-primary tabular-nums">
              {dataset.column_count}
            </div>
            <div className="text-[11px] font-mono text-text-muted pt-0.5 tabular-nums">
              {dtypeCounts["numeric"] || 0} num • {dtypeCounts["categorical"] || 0} cat
            </div>
          </div>
        </Card>

        {/* SHA-256 Fingerprint */}
        <Card className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Fingerprint
            </span>
            <Hash className="w-4 h-4 text-warning" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono text-text-muted truncate" title={dataset.sha256_hash}>
                {dataset.sha256_hash.slice(0, 8)}...{dataset.sha256_hash.slice(-6)}
              </span>
              <button
                onClick={copyHash}
                title="Copy full SHA-256 checksum"
                className="p-1 rounded-button hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                {copiedHash ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-[10px] font-mono text-text-subtle pt-0.5">
              Strict audit hash
            </div>
          </div>
        </Card>
      </div>

      {deleteError && (
        <AlertRow variant="danger">{deleteError}</AlertRow>
      )}

      {/* Columns Schema Summary */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="card-title text-text-primary flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-accent" />
              Column Schema &amp; Null Proportions
            </h3>
            <p className="text-xs text-text-muted">
              Auto-detected physical data types and missing value counts prior to CV transformations.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-danger hover:text-danger hover:bg-danger/10 gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Replace / Delete Dataset</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {dataset.columns.map((col) => {
            const hasNulls = col.null_percentage > 0;
            return (
              <div
                key={col.name}
                className="p-2.5 rounded-card border border-border bg-surface-subtle flex items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-text-primary font-medium truncate" title={col.name}>
                    {col.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                    <Badge
                      variant={
                        col.dtype === "numeric"
                          ? "success"
                          : col.dtype === "categorical"
                          ? "info"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {col.dtype}
                    </Badge>
                    <span className="tabular-nums">• {col.non_null_count.toLocaleString()} valid</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {hasNulls ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-warning font-medium tabular-nums">
                      <AlertTriangle className="w-3 h-3" />
                      {col.null_percentage.toFixed(1)}% null
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">
                      0% null
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 10-Row Data Table Preview */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title text-text-primary">
              Dataset Preview (First {preview_rows.length} Rows)
            </h3>
            <p className="text-xs text-text-muted">
              Inspect feature distributions and values before initiating statistical profiling or automated training.
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            Head {preview_rows.length}
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              {dataset.columns.map((col) => (
                <TableHead key={col.name} className="whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-text-primary">{col.name}</span>
                    <span className="text-[9px] font-mono text-text-muted px-1 py-0.2 rounded bg-surface-hover">
                      {col.dtype}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview_rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-center font-mono text-text-muted tabular-nums">
                  {idx + 1}
                </TableCell>
                {dataset.columns.map((col) => {
                  const value = row[col.name];
                  const isNull = value === null || value === undefined;

                  return (
                    <TableCell
                      key={col.name}
                      className={`whitespace-nowrap max-w-xs truncate font-mono text-xs ${
                        col.dtype === "numeric" ? "text-right tabular-nums" : "text-left"
                      }`}
                    >
                      {isNull ? (
                        <span className="text-warning/80 italic text-[11px]">null</span>
                      ) : typeof value === "boolean" ? (
                        <span className="text-info font-semibold">
                          {value ? "TRUE" : "FALSE"}
                        </span>
                      ) : (
                        String(value)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Explicit Delete Dataset Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-danger mb-1">
              <div className="w-7 h-7 rounded-button bg-danger/10 border border-danger/25 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle>Delete Dataset</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-text-primary">&quot;{dataset.filename}&quot;</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-text-secondary bg-surface-subtle border border-border p-3 rounded-card leading-relaxed my-2">
            This will permanently remove the uploaded raw dataset file and invalidate computed statistical profiles and schema metadata.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
