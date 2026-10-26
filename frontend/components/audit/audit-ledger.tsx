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
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AuditEvent, AuditTimelineResponse } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertRow } from "@/components/ui/alert-row";

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

export function AuditLedger({ projectId }: AuditLedgerProps) {
  const [timeline, setTimeline] = useState<AuditTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [category, setCategory] = useState<ActionCategory>("all");
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

  const filteredEvents = useMemo(() => {
    if (!timeline?.items) return [];

    return timeline.items.filter((item) => {
      if (category === "data") {
        if (!["project_created", "dataset_uploaded", "dataset_deleted", "profile_generated"].includes(item.action)) {
          return false;
        }
      } else if (category === "decision") {
        if (!["target_confirmed"].includes(item.action)) return false;
      } else if (category === "training") {
        if (!["training_started", "training_completed", "training_failed"].includes(item.action)) return false;
      } else if (category === "predict") {
        if (!["prediction_single", "prediction_batch"].includes(item.action)) return false;
      } else if (category === "explain") {
        if (!["explanation_global", "explanation_local"].includes(item.action)) return false;
      } else if (category === "export") {
        if (!["export_downloaded"].includes(item.action)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesAction = item.action.toLowerCase().includes(query);
        const matchesReason = item.reason.toLowerCase().includes(query);
        const matchesEvidence = item.evidence
          ? JSON.stringify(item.evidence).toLowerCase().includes(query)
          : false;
        if (!matchesAction && !matchesReason && !matchesEvidence) return false;
      }

      return true;
    });
  }, [timeline?.items, category, searchQuery]);

  const getActionIcon = (action: string) => {
    if (action.includes("dataset") || action.includes("profile")) return Database;
    if (action.includes("target")) return Sliders;
    if (action.includes("train")) return Cpu;
    if (action.includes("predict")) return FileSpreadsheet;
    if (action.includes("explain")) return Sparkles;
    if (action.includes("export")) return HardDriveDownload;
    return ShieldCheck;
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "success":
        return (
          <Badge variant="success" size="sm" className="font-mono">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="warning" size="sm" className="font-mono">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      case "failure":
        return (
          <Badge variant="danger" size="sm" className="font-mono">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="font-mono">
            {result}
          </Badge>
        );
    }
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
                Rule 5 &amp; 10 Verified
              </Badge>
            </div>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Chronological ledger of every dataset ingestion, quality profiling check, fold-safe transformation, training run, and model inference with evidence payloads for academic defense.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchTimeline(true)}
            disabled={refreshing || loading}
            className="gap-2 font-mono text-xs self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </Button>
        </div>

        {/* Telemetry Counter Cards */}
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

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto font-mono text-xs">
          {(
            [
              { id: "all", label: "All Events" },
              { id: "data", label: "Dataset" },
              { id: "decision", label: "AI Decision" },
              { id: "training", label: "Training" },
              { id: "predict", label: "Predict" },
              { id: "explain", label: "Explain" },
              { id: "export", label: "Exports" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                category === cat.id
                  ? "bg-surface-muted text-text-primary font-semibold border border-border shadow-xs"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search reasons or actions..."
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
              <option value="success" className="bg-surface text-text-primary">Success</option>
              <option value="warning" className="bg-surface text-text-primary">Warning</option>
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
          description="Try adjusting your category pills or search filter above to display other lifecycle events."
        />
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {filteredEvents.map((event: AuditEvent) => {
            const Icon = getActionIcon(event.action);
            const isExpanded = !!expandedEvents[event.id];
            const hasEvidence = event.evidence && Object.keys(event.evidence).length > 0;

            const dotBg =
              event.result === "success"
                ? "bg-success"
                : event.result === "warning"
                ? "bg-warning"
                : "bg-danger";

            return (
              <div key={event.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[1.85rem] top-4 w-3.5 h-3.5 rounded-full border-2 border-surface ${dotBg} shadow-xs group-hover:scale-125 transition-transform`}
                />

                {/* Event Card */}
                <Card className="p-4 hover:border-border-strong transition-colors space-y-3">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-subtle">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded bg-surface-muted border border-border-subtle text-accent">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wide">
                        {event.action.replace(/_/g, " ")}
                      </span>
                      {getResultBadge(event.result)}
                    </div>

                    <span
                      title={event.created_at}
                      className="text-xs font-mono text-text-muted whitespace-nowrap self-start sm:self-auto tabular-nums"
                    >
                      {formatDate(event.created_at)}
                    </span>
                  </div>

                  {/* Card Reason Body */}
                  <div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {event.reason}
                    </p>
                  </div>

                  {/* Expandable Evidence Payload */}
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
                          <span>{isExpanded ? "Hide Evidence Payload" : "Inspect Evidence Payload"}</span>
                          <span className="text-text-muted text-[11px] tabular-nums">
                            ({Object.keys(event.evidence ?? {}).length} params)
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
                        <pre className="mt-2.5 p-3 rounded-md bg-surface-subtle border border-border text-[11px] font-mono text-text-secondary overflow-x-auto leading-normal">
                          {JSON.stringify(event.evidence, null, 2)}
                        </pre>
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
    </div>
  );
}
