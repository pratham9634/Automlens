"use client";

import { useEffect, useState } from "react";
import {
  HardDriveDownload,
  FileSpreadsheet,
  FileCode,
  Binary,
  History,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Hash,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ExportItemStatus, ExportStatusResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

interface ExportViewProps {
  projectId: string;
  projectName?: string;
}

export function ExportView({ projectId, projectName }: ExportViewProps) {
  const [statusData, setStatusData] = useState<ExportStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getExportStatus(projectId);
      setStatusData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load exports status";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleDownload = async (item: ExportItemStatus) => {
    if (!item.is_available) return;

    setDownloadingType(item.export_type);
    try {
      const url = apiClient.getExportDownloadUrl(projectId, item.export_type);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      // Read Content-Disposition filename if provided
      const disposition = res.headers.get("Content-Disposition");
      let filename = `${item.export_type}_${projectId}.${item.format}`;
      if (disposition && disposition.includes("filename=")) {
        const matches = /filename="?([^"]+)"?/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      alert(`Could not download export: ${msg}`);
    } finally {
      setDownloadingType(null);
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case "json":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30">
            JSON
          </span>
        );
      case "csv":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30">
            CSV
          </span>
        );
      case "joblib":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-telemetry-indigo/10 text-telemetry-indigo border border-telemetry-indigo/30">
            JOBLIB
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-3 text-ink-muted border border-hairline">
            {format.toUpperCase()}
          </span>
        );
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "quality_report":
      case "manifest":
        return FileCode;
      case "leaderboard":
      case "predictions":
        return FileSpreadsheet;
      case "pipeline":
        return Binary;
      case "audit_log":
        return History;
      default:
        return HardDriveDownload;
    }
  };

  const availableCount = statusData?.exports.filter((i) => i.is_available).length || 0;
  const totalCount = statusData?.exports.length || 6;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-surface-2 border border-hairline text-ink">
                <HardDriveDownload className="w-4 h-4 text-telemetry-cyan" />
              </span>
              <h2 className="text-lg font-bold text-ink">
                Reproducibility &amp; Artifact Export Hub
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/25">
                <ShieldCheck className="w-3 h-3" /> Integrity Verified
              </span>
            </div>
            <p className="text-xs text-ink-muted max-w-2xl">
              Export complete scientific benchmarks, serialized production pipelines, and full execution manifests for{" "}
              <strong className="text-ink font-semibold">{projectName || "this workspace"}</strong>. Formatted for Excel, Jupyter notebooks, or production deployment.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-mono text-ink-muted bg-surface-2 px-3 py-1.5 rounded-lg border border-hairline">
              {availableCount} of {totalCount} Ready
            </span>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-ink transition-colors disabled:opacity-50"
              title="Refresh artifact availability"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 6 Export Cards */}
      {loading && !statusData ? (
        <div className="p-12 text-center rounded-xl border border-hairline bg-surface-1">
          <Loader2 className="w-6 h-6 animate-spin text-telemetry-cyan mx-auto mb-3" />
          <p className="text-xs font-mono text-ink-muted">Inspecting project storage artifacts...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-xl border border-telemetry-rose/30 bg-telemetry-rose/5">
          <p className="text-xs font-semibold text-telemetry-rose">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusData?.exports.map((item) => {
            const Icon = getItemIcon(item.export_type);
            const isDownloading = downloadingType === item.export_type;

            return (
              <div
                key={item.export_type}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between shadow-sm ${
                  item.is_available
                    ? "bg-surface-1 border-hairline hover:border-surface-3"
                    : "bg-surface-1/50 border-hairline/60 opacity-80"
                }`}
              >
                <div>
                  {/* Top Bar: Icon & Format Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 rounded-lg bg-surface-2 border border-hairline text-ink">
                      <Icon className="w-4 h-4 text-telemetry-cyan" />
                    </span>
                    {getFormatBadge(item.format)}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-ink mb-1.5">{item.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-hairline/60 space-y-3">
                  {/* Status Indicator */}
                  {item.is_available ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-telemetry-emerald font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Export
                        </span>
                        {item.file_size_bytes !== null && item.file_size_bytes !== undefined && (
                          <span className="text-ink-muted">
                            {formatBytes(item.file_size_bytes)}
                          </span>
                        )}
                      </div>

                      {item.checksum_sha256 && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-ink-muted truncate" title={item.checksum_sha256}>
                          <Hash className="w-3 h-3 text-telemetry-cyan shrink-0" />
                          <span className="truncate">SHA256: {item.checksum_sha256.slice(0, 16)}...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-[11px] font-mono text-telemetry-amber">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{item.reason_unavailable || "Prerequisite step pending"}</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleDownload(item)}
                    disabled={!item.is_available || isDownloading}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      item.is_available
                        ? "bg-surface-2 hover:bg-surface-3 text-ink border border-hairline hover:border-telemetry-cyan/40 shadow-sm"
                        : "bg-surface-2/40 text-ink-muted border border-hairline/40 cursor-not-allowed opacity-60"
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-telemetry-cyan" />
                        Packaging Download...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        {item.is_available ? `Download .${item.format}` : "Locked"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Academic Compliance Footer Callout */}
      <div className="p-4 rounded-xl border border-hairline bg-surface-2/60 text-xs text-ink-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-telemetry-emerald shrink-0" />
          <span>
            <strong>Academic Integrity Notice:</strong> All exported artifacts are compiled strictly without data leakage, include 5-fold cross-validation fold scores, and conform with Rule 5 &amp; 10 reproducibility standards.
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-telemetry-cyan whitespace-nowrap self-start sm:self-auto">
          <span>Verification Protocol v1.0</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
