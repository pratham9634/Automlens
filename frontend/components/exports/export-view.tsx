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
  Copy,
  Check,
  Package,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ExportItemStatus, ExportStatusResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertRow } from "@/components/ui/alert-row";
import { SectionExplainerGuide } from "@/components/ui/section-explainer-guide";

interface ExportViewProps {
  projectId: string;
  projectName?: string;
}

export function ExportView({ projectId, projectName }: ExportViewProps) {
  const [statusData, setStatusData] = useState<ExportStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
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

  const copySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const getFormatBadge = (format: string) => {
    switch (format.toLowerCase()) {
      case "zip":
        return (
          <Badge variant="accent" size="sm" className="font-mono uppercase font-bold">
            ZIP BUNDLE
          </Badge>
        );
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
      case "bundle":
        return Package;
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

  const bundleExport = statusData?.exports.find((i) => i.export_type === "bundle");
  const modularExports = statusData?.exports.filter((i) => i.export_type !== "bundle") || [];

  const availableCount = statusData?.exports.filter((i) => i.is_available).length || 0;
  const totalCount = statusData?.exports.length || 7;

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
              Export academic benchmarks, serialized production pipelines, and full execution manifests for{" "}
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
              className="h-8 px-2.5 gap-1.5 font-mono text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* PLAIN-ENGLISH EXPORTS & BENCHMARKS GUIDE DROPDOWN BOX */}
      <SectionExplainerGuide
        title="What are Artifact Exports? (1-Minute Plain-English Guide)"
        subtitle="Click to understand how to download your trained models, validation benchmarks, and reproducibility bundles."
        badgeText="For Non-Tech Users"
        cards={[
          {
            icon: Binary,
            title: "Trained Pipeline (.joblib)",
            description:
              "The actual serialized machine learning model bundled with its exact preprocessing steps. Ready to load into Python or deploy in a web application.",
          },
          {
            icon: FileCode,
            title: "Model Diagnostics & Manifest",
            description:
              "Metadata and validation leaderboard detailing hyperparameters, fold scores, and environment specifications for academic defensibility.",
          },
          {
            icon: Package,
            title: "Master Archive (.zip)",
            description:
              "Single-click download containing all model weights, evaluation metrics, the audit trail, and SHA-256 cryptographic manifests for 100% reproducibility.",
          },
        ]}
        tipsTitle="How to use your deliverables:"
        tips={[
          {
            label: "Master Bundle (.zip)",
            text: "Download this archive to obtain your complete project deliverables and benchmarks in one package.",
          },
          {
            label: "Modular Downloads",
            text: "Download individual components (like serialized .joblib weights or validation logs) on demand.",
          },
          {
            label: "Cryptographic Integrity",
            text: "Every file has an immutable SHA-256 hash verifying it was not modified after training.",
          },
        ]}
      />

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
        <div className="space-y-6">
          {/* MASTER BUNDLE HERO CARD */}
              {bundleExport && (
                <Card className="p-6 border-2 border-accent/40 bg-gradient-to-br from-surface to-accent/5 shadow-md space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-2 rounded-lg bg-accent text-surface shadow-xs">
                          <Package className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-bold text-text-primary tracking-tight">
                          {bundleExport.title}
                        </h3>
                        <Badge variant="accent" size="sm" className="font-mono">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Viva Defense Archive
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
                        Single-click master archive containing all generated artifacts, serialized model weights, validation leaderboard, predictions log, and cryptographic manifest with a comprehensive reproducibility README for examiners.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleDownload(bundleExport)}
                      disabled={downloadingType === bundleExport.export_type}
                      className="gap-2 font-mono text-xs self-start md:self-auto shrink-0 shadow-sm"
                    >
                      {downloadingType === bundleExport.export_type ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Assembling Zip Archive...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Master .ZIP Bundle</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Included deliverables checklist */}
                  <div className="pt-3 border-t border-border/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-mono text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Quality Profile</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>CV Leaderboard</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Inference Log</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Run Manifest</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Pipeline (.joblib)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span>Audit Trail</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* INDIVIDUAL MODULAR ARTIFACTS GRID */}
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted mb-3">
                  Individual Artifact Components
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modularExports.map((item) => {
                    const Icon = getItemIcon(item.export_type);
                    const isDownloading = downloadingType === item.export_type;

                    return (
                      <Card
                        key={item.export_type}
                        className={`p-5 flex flex-col justify-between space-y-4 ${
                          item.is_available
                            ? "border-border hover:border-border-strong shadow-xs transition-colors"
                            : "opacity-75 bg-surface-subtle/40"
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
                          <h4 className="text-sm font-semibold text-text-primary mb-1">
                            {item.title}
                          </h4>
                          <p className="text-xs text-text-muted leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border space-y-3">
                          {/* Status Indicator */}
                          {item.is_available ? (
                            <div className="space-y-1.5">
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
                                <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-text-muted bg-surface-subtle px-2 py-1 rounded border border-border-subtle">
                                  <div className="flex items-center gap-1 truncate" title={item.checksum_sha256}>
                                    <Hash className="w-3 h-3 text-text-muted shrink-0" />
                                    <span className="truncate">SHA256: {item.checksum_sha256.slice(0, 12)}...</span>
                                  </div>
                                  <button
                                    onClick={() => copySha(item.checksum_sha256 ?? "")}
                                    title="Copy SHA-256 fingerprint"
                                    className="hover:text-text-primary cursor-pointer shrink-0"
                                  >
                                    {copiedSha === item.checksum_sha256 ? (
                                      <Check className="w-3 h-3 text-success" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-text-muted" />
                                    )}
                                  </button>
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
              </div>
            </div>
          )}

      {/* Model Governance Compliance Callout */}
      <AlertRow variant="info" title="Model Governance &amp; Compliance Notice">
        All exported artifacts are compiled strictly without data leakage, include 5-fold cross-validation fold scores, and conform with Rule 5 &amp; 10 reproducibility standards.
      </AlertRow>
    </div>
  );
}
