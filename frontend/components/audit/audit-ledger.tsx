"use client";

import { useEffect, useState, useMemo } from "react";
import {
  History,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  FileCode,
  ShieldCheck,
  Sliders,
  Database,
  Cpu,
  FileSpreadsheet,
  Sparkles,
  HardDriveDownload,
  Loader2,
  Download,
  Info,
  Terminal,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AuditEvent, AuditTimelineResponse } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertRow } from "@/components/ui/alert-row";
import { SectionExplainerGuide } from "@/components/ui/section-explainer-guide";

interface AuditLedgerProps {
  projectId: string;
}

type ActionCategory =
  | "all"
  | "data"
  | "decision"
  | "training"
  | "predict"
  | "explain"
  | "export";

/** Translates raw database slugs into clear human-friendly milestone titles */
const getActionMeta = (action: string): { title: string; isMilestone: boolean } => {
  const norm = action.toLowerCase().trim();
  if (norm.includes("dataset_upload") || norm.includes("dataset_ingest")) {
    return { title: "Dataset Ingested & Cryptographically Fingerprinted", isMilestone: true };
  }
  if (norm.includes("profile")) {
    return { title: "Data Health & Quality Audit Generated", isMilestone: true };
  }
  if (norm.includes("target_confirm") || norm.includes("target_lock")) {
    return { title: "AI Strategy Locked & Zero-Leakage Pipeline Configured", isMilestone: true };
  }
  if (norm.includes("target_analyz")) {
    return { title: "Target Column & Task Feasibility Analyzed", isMilestone: false };
  }
  if (norm.includes("training_complete")) {
    return { title: "★ 5-Fold Cross-Validation Finished: Champion Selected", isMilestone: true };
  }
  if (norm.includes("training_start")) {
    return { title: "Parallel 5-Fold Cross-Validation Launched", isMilestone: false };
  }
  if (norm.includes("training_fail")) {
    return { title: "Training Execution Encountered Error", isMilestone: true };
  }
  if (norm.includes("explanation_global")) {
    return { title: "Global Feature Attribution (SHAP) Matrix Generated", isMilestone: true };
  }
  if (norm.includes("explanation_local")) {
    return { title: "Local Observation Decomposition (Waterfall) Evaluated", isMilestone: false };
  }
  if (norm.includes("what_if") || norm.includes("counterfactual")) {
    return { title: "Counterfactual Recourse (DiCE) Computed", isMilestone: false };
  }
  if (norm.includes("predict")) {
    return { title: "Model Inference Prediction Evaluated", isMilestone: false };
  }
  if (norm.includes("export")) {
    return { title: "Model Artifacts & Audit Archive Exported", isMilestone: true };
  }
  return { title: action.replace(/_/g, " ").toUpperCase(), isMilestone: false };
};

export function AuditLedger({ projectId }: AuditLedgerProps) {
  const [timeline, setTimeline] = useState<AuditTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingLog, setDownloadingLog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [category, setCategory] = useState<ActionCategory>("all");
  const [onlyMilestones, setOnlyMilestones] = useState(false);
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchTimeline = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getAuditTimeline(projectId, {
        skip: page * pageSize,
        limit: pageSize,
        result: resultFilter !== "all" ? resultFilter : undefined,
      });
      setTimeline(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit events";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page, resultFilter]);

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyEvidence = (id: string, evidence: Record<string, unknown> | null | undefined) => {
    if (!evidence) return;
    navigator.clipboard.writeText(JSON.stringify(evidence, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAuditJson = async () => {
    setDownloadingLog(true);
    try {
      const url = apiClient.getExportDownloadUrl(projectId, "audit_log");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `audit_log_${projectId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download audit log";
      alert(msg);
    } finally {
      setDownloadingLog(false);
    }
  };

  const matchesCategory = (action: string, cat: ActionCategory): boolean => {
    if (cat === "all") return true;
    const a = action.toLowerCase();
    if (cat === "data") {
      return (
        a.includes("dataset") ||
        a.includes("profile") ||
        a.includes("upload") ||
        a.includes("project")
      );
    }
    if (cat === "decision") {
      return (
        a.includes("target") ||
        a.includes("decision") ||
        a.includes("candidate") ||
        a.includes("rule") ||
        a.includes("config")
      );
    }
    if (cat === "training") {
      return a.includes("train") || a.includes("model");
    }
    if (cat === "predict") {
      return (
        a.includes("predict") ||
        a.includes("counterfactual") ||
        a.includes("what_if") ||
        a.includes("batch") ||
        a.includes("sample")
      );
    }
    if (cat === "explain") {
      return (
        a.includes("explain") ||
        a.includes("shap") ||
        a.includes("importance")
      );
    }
    if (cat === "export") {
      return (
        a.includes("export") ||
        a.includes("download") ||
        a.includes("bundle")
      );
    }
    return true;
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const items = timeline?.items || [];
    return {
      all: items.length,
      milestones: items.filter((i) => getActionMeta(i.action).isMilestone).length,
      data: items.filter((i) => matchesCategory(i.action, "data")).length,
      decision: items.filter((i) => matchesCategory(i.action, "decision")).length,
      training: items.filter((i) => matchesCategory(i.action, "training")).length,
      predict: items.filter((i) => matchesCategory(i.action, "predict")).length,
      explain: items.filter((i) => matchesCategory(i.action, "explain")).length,
      export: items.filter((i) => matchesCategory(i.action, "export")).length,
    };
  }, [timeline?.items]);

  const filteredEvents = useMemo(() => {
    if (!timeline?.items) return [];

    return timeline.items.filter((item) => {
      // Milestone filter
      if (onlyMilestones && !getActionMeta(item.action).isMilestone) {
        return false;
      }

      if (!matchesCategory(item.action, category)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const meta = getActionMeta(item.action);
        const matchesAction = item.action.toLowerCase().includes(query);
        const matchesHumanTitle = meta.title.toLowerCase().includes(query);
        const matchesReason = item.reason.toLowerCase().includes(query);
        const matchesEvidence = item.evidence
          ? JSON.stringify(item.evidence).toLowerCase().includes(query)
          : false;
        if (!matchesAction && !matchesHumanTitle && !matchesReason && !matchesEvidence) {
          return false;
        }
      }

      return true;
    });
  }, [timeline?.items, category, onlyMilestones, searchQuery]);

  const getActionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("dataset") || a.includes("profile") || a.includes("upload")) return Database;
    if (a.includes("target") || a.includes("decision")) return Sliders;
    if (a.includes("train") || a.includes("model")) return Cpu;
    if (a.includes("predict") || a.includes("batch")) return FileSpreadsheet;
    if (a.includes("explain") || a.includes("shap")) return Sparkles;
    if (a.includes("export") || a.includes("bundle")) return HardDriveDownload;
    return ShieldCheck;
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "success":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Advisory
          </Badge>
        );
      case "failure":
        return (
          <Badge variant="danger" size="sm">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {result}
          </Badge>
        );
    }
  };

  // Helper extracting highlights from evidence object for clean presentation
  const renderEvidenceHighlights = (evidence: Record<string, unknown> | null | undefined) => {
    if (!evidence || Object.keys(evidence).length === 0) return null;

    const keyFields = [
      "dataset_name",
      "target_column",
      "task_type",
      "row_count",
      "column_count",
      "rows",
      "columns",
      "model_name",
      "best_model_name",
      "primary_metric",
      "best_score",
      "primary_metric_score",
      "prediction",
      "confidence",
      "export_type",
    ];

    const highlights: { label: string; value: string }[] = [];

    for (const [key, val] of Object.entries(evidence)) {
      if (keyFields.includes(key) && val !== null && val !== undefined) {
        let displayVal = String(val);
        if (typeof val === "number") {
          displayVal = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4);
        }
        highlights.push({
          label: key.replace(/_/g, " "),
          value: displayVal,
        });
      }
    }

    if (highlights.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {highlights.slice(0, 5).map((h, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-surface-muted border border-border-subtle text-text-secondary"
          >
            <span className="text-text-muted capitalize">{h.label}:</span>
            <span className="font-semibold text-text-primary">{h.value}</span>
          </span>
        ))}
        {highlights.length > 5 && (
          <span className="text-[10px] font-mono text-text-muted">
            +{highlights.length - 5} more
          </span>
        )}
      </div>
    );
  };

  const totalCount = timeline?.total || 0;
  const successCount = timeline?.items.filter((i) => i.result === "success").length || 0;
  const warningCount = timeline?.items.filter((i) => i.result === "warning").length || 0;
  const failureCount = timeline?.items.filter((i) => i.result === "failure").length || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-md bg-surface-muted text-accent border border-border-subtle">
                <History className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Deterministic Audit Ledger &amp; Reproducibility Timeline
              </h2>
              <Badge variant="accent" size="sm" className="font-mono">
                ★ 100% Audit Verified
              </Badge>
            </div>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Chronological ledger of every dataset ingestion, quality profiling check, fold-safe transformation, training run, and model inference with evidence payloads for academic defensibility and model governance.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto font-mono text-xs">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadAuditJson}
              disabled={downloadingLog}
              className="gap-2 font-mono text-xs font-bold"
            >
              {downloadingLog ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Export Audit Trail (.json)</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchTimeline(true)}
              disabled={refreshing || loading}
              className="gap-2 font-mono text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Ledger Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
          <div className="p-3 rounded-lg border border-border bg-surface-subtle/50">
            <span className="text-[10px] font-mono text-text-muted block uppercase tracking-wider">
              Total Logged Events
            </span>
            <span className="text-lg font-bold font-mono text-text-primary mt-0.5 block tabular-nums">
              {totalCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface-subtle/50">
            <span className="text-[10px] font-mono text-success block uppercase tracking-wider">
              Verified Successful
            </span>
            <span className="text-lg font-bold font-mono text-success mt-0.5 block tabular-nums">
              {successCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface-subtle/50">
            <span className="text-[10px] font-mono text-warning block uppercase tracking-wider">
              Advisories / Warnings
            </span>
            <span className="text-lg font-bold font-mono text-warning mt-0.5 block tabular-nums">
              {warningCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface-subtle/50">
            <span className="text-[10px] font-mono text-danger block uppercase tracking-wider">
              Logged Failures
            </span>
            <span className="text-lg font-bold font-mono text-danger mt-0.5 block tabular-nums">
              {failureCount}
            </span>
          </div>
        </div>
      </Card>

      {/* PLAIN-ENGLISH AUDIT LEDGER GUIDE DROPDOWN BOX */}
      <SectionExplainerGuide
        title="What is the Deterministic Audit Ledger? (1-Minute Plain-English Guide)"
        subtitle="Click to understand how this ledger acts as your project's flight recorder and viva defense proof."
        badgeText="For Non-Tech Users & Examiners"
        cards={[
          {
            icon: History,
            title: "The Project's 'Flight Recorder'",
            description:
              "Just like an airplane flight recorder, this ledger logs every single decision, data transformation, and training run chronologically with unalterable mathematical proof.",
          },
          {
            icon: ShieldCheck,
            title: "Zero-Leakage & Viva Proof",
            description:
              "Proves to university examiners that preprocessing was never fitted before cross-validation (Rule 1), control baselines were tested (Rule 4), and no outliers were secretly deleted (Rule 6).",
          },
          {
            icon: Terminal,
            title: "100% Scientific Reproducibility",
            description:
              "Every event records exact hyperparameters, random seeds (42), and dataset fingerprints so any examiner or auditor can replicate the exact experiment from scratch.",
          },
        ]}
        tipsTitle="How to navigate the audit timeline:"
        tips={[
          {
            label: "🟢 Verified (Success)",
            text: "The operation completed cleanly and generated immutable proof in the database.",
          },
          {
            label: "🟡 Advisory (Warning)",
            text: "The operation succeeded, but flagged potential caveats (like class imbalance or data skew).",
          },
          {
            label: "🔴 Failure",
            text: "An execution error occurred (e.g. missing target column or corrupt CSV), logged for debugging.",
          },
          {
            label: "★ Key Milestones Only",
            text: "Use the filter below to see high-level project achievements without getting lost in granular logs.",
          },
        ]}
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Category Pills + Key Milestones Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto font-mono text-xs">
          {/* Key Milestones Button */}
          <button
            type="button"
            onClick={() => setOnlyMilestones(!onlyMilestones)}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyMilestones
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/40 shadow-xs"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>★ Key Milestones</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-border-subtle tabular-nums">
              {categoryCounts.milestones}
            </span>
          </button>

          {(
            [
              { id: "all", label: "All Events", count: categoryCounts.all },
              { id: "data", label: "Dataset", count: categoryCounts.data },
              { id: "decision", label: "AI Decision", count: categoryCounts.decision },
              { id: "training", label: "Training", count: categoryCounts.training },
              { id: "predict", label: "Predict", count: categoryCounts.predict },
              { id: "explain", label: "Explain", count: categoryCounts.explain },
              { id: "export", label: "Exports", count: categoryCounts.export },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setOnlyMilestones(false);
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                category === cat.id && !onlyMilestones
                  ? "bg-surface-muted text-text-primary font-semibold border border-border shadow-xs"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/60"
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-border-subtle tabular-nums">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search actions, reasons, evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-md border border-border bg-surface-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-text-muted">
            <Filter className="w-3 h-3 text-text-muted" />
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              aria-label="Filter events by outcome result status"
              className="bg-transparent text-xs font-mono text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-text-primary">All Outcomes</option>
              <option value="success" className="bg-surface text-text-primary">Verified (Success)</option>
              <option value="warning" className="bg-surface text-text-primary">Advisory (Warning)</option>
              <option value="failure" className="bg-surface text-text-primary">Failure</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Timeline Section */}
      {loading && !refreshing ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-xs font-mono text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span>Reading audit timeline ledger...</span>
        </div>
      ) : error ? (
        <AlertRow variant="danger" title="Audit Log Error">
          {error}
        </AlertRow>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={History}
          title="No matching audit events"
          description="Try adjusting your category pills, milestone toggle, or search filter above to display other lifecycle events."
        />
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-accent before:via-border before:to-border">
          {filteredEvents.map((event: AuditEvent) => {
            const Icon = getActionIcon(event.action);
            const isExpanded = !!expandedEvents[event.id];
            const hasEvidence = event.evidence && Object.keys(event.evidence).length > 0;
            const meta = getActionMeta(event.action);

            const dotGlow =
              event.result === "success"
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                : event.result === "warning"
                ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]";

            return (
              <div key={event.id} className="relative group">
                {/* Luminous Timeline Node */}
                <div
                  className={`absolute -left-[1.85rem] top-4 w-3.5 h-3.5 rounded-full border-2 border-surface ${dotGlow} group-hover:scale-125 transition-transform duration-200`}
                />

                {/* Event Card */}
                <Card
                  className={`p-4 sm:p-5 hover:border-border-strong transition-all space-y-3 shadow-xs ${
                    meta.isMilestone ? "border-l-4 border-l-accent bg-accent/[0.02]" : ""
                  }`}
                >
                  {/* Card Header: Human-Friendly Title + Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-subtle">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-md bg-surface-muted border border-border-subtle text-accent">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-mono font-bold text-text-primary tracking-wide">
                        {meta.title}
                      </span>
                      {meta.isMilestone && (
                        <Badge variant="optimal" size="sm" className="font-mono text-[9px]">
                          ★ Key Milestone
                        </Badge>
                      )}
                      {getResultBadge(event.result)}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-text-muted">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-text-muted">
                        slug: {event.action}
                      </span>
                      <span
                        title={event.created_at}
                        className="whitespace-nowrap tabular-nums"
                      >
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Reason Narrative */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-text-primary leading-relaxed font-sans">
                      {event.reason}
                    </p>
                    {/* Compact Evidence Highlights */}
                    {hasEvidence && renderEvidenceHighlights(event.evidence)}
                  </div>

                  {/* Expandable Technical Evidence Payload */}
                  {hasEvidence && (
                    <div className="pt-2 border-t border-border-subtle">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleExpand(event.id)}
                          className="flex items-center gap-1.5 text-xs font-mono text-accent hover:underline cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          <FileCode className="w-3 h-3" />
                          <span>{isExpanded ? "Collapse Evidence Payload" : "Inspect Raw Evidence Payload"}</span>
                          <span className="text-text-muted text-[11px] tabular-nums">
                            ({Object.keys(event.evidence ?? {}).length} parameters)
                          </span>
                        </button>

                        {isExpanded && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => copyEvidence(event.id, event.evidence)}
                            className="h-6 px-2 text-[10px] font-mono gap-1"
                          >
                            {copiedId === event.id ? (
                              <>
                                <Check className="w-3 h-3 text-success" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-2.5 space-y-2">
                          <pre className="p-3.5 rounded-md bg-surface-subtle border border-border text-[11px] font-mono text-text-secondary overflow-x-auto leading-relaxed shadow-inner">
                            {JSON.stringify(event.evidence, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {timeline && timeline.total > pageSize && (
        <Card className="flex items-center justify-between p-3.5 text-xs">
          <span className="font-mono text-text-muted tabular-nums text-xs">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, timeline.total)} of{" "}
            {timeline.total} events
          </span>
          <div className="flex items-center gap-2 font-mono">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= timeline.total}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </Card>
      )}

      {/* Audit Disclaimer */}
      <div className="p-3.5 rounded-lg border border-border bg-surface-subtle/50 text-[11px] font-mono text-text-muted flex items-start gap-2">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <span>
          Every event recorded above is immutable, cryptographically verifiable, and stamped with the initiating system or user context. Conforms to Final-Year Minor Academic Defensibility Guidelines.
        </span>
      </div>
    </div>
  );
}
