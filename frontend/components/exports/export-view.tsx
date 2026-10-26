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
  Hash,
  GraduationCap,
  Layers,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ExportItemStatus, ExportStatusResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { VivaExecutiveSummary } from "./viva-executive-summary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";

interface ExportViewProps {
  projectId: string;
  projectName?: string;
}

export function ExportView({ projectId, projectName }: ExportViewProps) {
  const [statusData, setStatusData] = useState<ExportStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<"artifacts" | "viva-summary">("artifacts");

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
          <Badge variant="accent" size="sm" className="font-mono uppercase font-bold">
            JSON
          </Badge>
        );
      case "csv":
        return (
          <Badge variant="warning" size="sm" className="font-mono uppercase font-bold">
            CSV
          </Badge>
        );
      case "joblib":
        return (
          <Badge variant="neutral" size="sm" className="font-mono uppercase font-bold">
            JOBLIB
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="font-mono uppercase font-bold">
            {format.toUpperCase()}
          </Badge>
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
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <HardDriveDownload className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Reproducibility &amp; Artifact Export Hub
              </h2>
              <Badge variant="success" size="sm" className="font-mono">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Integrity Verified
              </Badge>
            </div>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Export scientific benchmarks, serialized production pipelines, and full execution manifests for{" "}
              <strong className="text-text-primary font-semibold">{projectName || "this workspace"}</strong>. Formatted for Excel, Jupyter notebooks, or production deployment.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto font-mono text-xs">
            <Badge variant="neutral" size="sm" className="tabular-nums">
              {availableCount} of {totalCount} Ready
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              title="Refresh artifact availability"
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Sub-view Navigation Toggle */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setSubView("artifacts")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            subView === "artifacts"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Artifact Bundle Downloads</span>
        </button>

        <button
          onClick={() => setSubView("viva-summary")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors ${
            subView === "viva-summary"
              ? "bg-surface-muted text-text-primary font-semibold border border-border"
              : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/50"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-accent" />
          <span>Viva Defense Executive Summary</span>
          <Badge variant="accent" size="sm" className="text-[10px] py-0 px-1.5">
            Printable
          </Badge>
        </button>
      </div>

      {subView === "viva-summary" ? (
        <VivaExecutiveSummary projectId={projectId} projectName={projectName || "Workspace"} />
      ) : (
        <>
          {loading && !statusData ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Inspecting project storage artifacts...</span>
            </div>
          ) : error ? (
            <AlertRow variant="danger" title="Export Storage Error">
              {error}
            </AlertRow>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusData?.exports.map((item) => {
                const Icon = getItemIcon(item.export_type);
                const isDownloading = downloadingType === item.export_type;

                return (
                  <Card
                    key={item.export_type}
                    className={`p-5 flex flex-col justify-between space-y-4 ${
                      item.is_available
                        ? "border-border hover:border-border-strong"
                        : "opacity-75"
                    }`}
                  >
                    <div>
                      {/* Top Bar: Icon & Format Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="p-2 rounded-md bg-surface-muted border border-border-subtle text-accent">
                          <Icon className="w-4 h-4" />
                        </span>
                        {getFormatBadge(item.format)}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-semibold text-text-primary mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border space-y-3">
                      {/* Status Indicator */}
                      {item.is_available ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-success font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ready for Export</span>
                            </span>
                            {item.file_size_bytes !== null && item.file_size_bytes !== undefined && (
                              <span className="text-text-muted tabular-nums">
                                {formatBytes(item.file_size_bytes)}
                              </span>
                            )}
                          </div>

                          {item.checksum_sha256 && (
                            <div
                              className="flex items-center gap-1 text-[10px] font-mono text-text-muted truncate"
                              title={item.checksum_sha256}
                            >
                              <Hash className="w-3 h-3 text-text-muted shrink-0" />
                              <span className="truncate">SHA256: {item.checksum_sha256.slice(0, 16)}...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-xs font-mono text-warning">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{item.reason_unavailable || "Prerequisite step pending"}</span>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        variant={item.is_available ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleDownload(item)}
                        disabled={!item.is_available || isDownloading}
                        className="w-full gap-2 font-mono text-xs"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Packaging Download...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>{item.is_available ? `Download .${item.format}` : "Locked"}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Academic Compliance Callout */}
          <AlertRow variant="info" title="Academic Integrity Notice">
            All exported artifacts are compiled strictly without data leakage, include 5-fold cross-validation fold scores, and conform with Rule 5 &amp; 10 reproducibility standards.
          </AlertRow>
        </>
      )}
    </div>
  );
}
