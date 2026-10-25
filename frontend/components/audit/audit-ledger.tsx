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
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AuditEvent, AuditTimelineResponse } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

  // Filter events client-side by category & search query
  const filteredEvents = useMemo(() => {
    if (!timeline?.items) return [];

    return timeline.items.filter((item) => {
      // Category filter
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

      // Search query filter
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/30">
            <CheckCircle2 className="w-3 h-3" /> Success
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case "failure":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-telemetry-rose/10 text-telemetry-rose border border-telemetry-rose/30">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-surface-3 text-ink-muted border border-hairline">
            {result}
          </span>
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
      <div className="p-6 rounded-xl border border-hairline bg-surface-1 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-surface-2 border border-hairline text-ink">
                <History className="w-4 h-4 text-telemetry-cyan" />
              </span>
              <h2 className="text-lg font-bold text-ink">
                Audit Timeline &amp; Decision Ledger
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/25">
                Rule 5 &amp; 10 Verified
              </span>
            </div>
            <p className="text-xs text-ink-muted max-w-2xl">
              Immutable chronological record of every data engineering transformation, algorithmic decision, training fold, and inference. Designed for academic reproducibility and viva defense.
            </p>
          </div>

          <button
            onClick={() => fetchTimeline(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-medium text-ink transition-colors self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Ledger
          </button>
        </div>

        {/* Telemetry Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-hairline">
          <div className="p-3 rounded-lg border border-hairline bg-surface-2">
            <span className="text-[11px] font-mono text-ink-muted block uppercase">
              Total Logged Events
            </span>
            <span className="text-xl font-bold font-mono text-ink mt-0.5 block">
              {totalCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-hairline bg-surface-2">
            <span className="text-[11px] font-mono text-telemetry-emerald block uppercase">
              Verified Successful
            </span>
            <span className="text-xl font-bold font-mono text-telemetry-emerald mt-0.5 block">
              {successCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-hairline bg-surface-2">
            <span className="text-[11px] font-mono text-telemetry-amber block uppercase">
              Advisories / Warnings
            </span>
            <span className="text-xl font-bold font-mono text-telemetry-amber mt-0.5 block">
              {warningCount}
            </span>
          </div>
          <div className="p-3 rounded-lg border border-hairline bg-surface-2">
            <span className="text-[11px] font-mono text-telemetry-rose block uppercase">
              Logged Failures
            </span>
            <span className="text-xl font-bold font-mono text-telemetry-rose mt-0.5 block">
              {failureCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-hairline bg-surface-1 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat.id
                  ? "bg-surface-3 text-ink font-semibold border border-hairline shadow-sm"
                  : "text-ink-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search reasons or actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-hairline bg-surface-2 text-ink placeholder:text-ink-muted focus:outline-none focus:border-telemetry-cyan"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-2 border border-hairline rounded-lg px-2 py-1 text-xs text-ink-muted">
            <Filter className="w-3 h-3 text-ink-muted" />
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              aria-label="Filter events by outcome result status"
              className="bg-transparent text-xs text-ink focus:outline-none cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      {loading && !refreshing ? (
        <div className="p-12 text-center rounded-xl border border-hairline bg-surface-1">
          <div className="animate-spin w-6 h-6 border-2 border-telemetry-cyan border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-mono text-ink-muted">Reading immutable audit ledger...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-xl border border-telemetry-rose/30 bg-telemetry-rose/5">
          <AlertCircle className="w-6 h-6 text-telemetry-rose mx-auto mb-2" />
          <p className="text-xs font-semibold text-telemetry-rose">{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-hairline bg-surface-1">
          <History className="w-8 h-8 text-ink-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-sm font-semibold text-ink">No matching audit events</h4>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            Try adjusting your category pills or search filter above to display other lifecycle events.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-3">
          {filteredEvents.map((event: AuditEvent) => {
            const Icon = getActionIcon(event.action);
            const isExpanded = !!expandedEvents[event.id];
            const hasEvidence = event.evidence && Object.keys(event.evidence).length > 0;

            const dotColor =
              event.result === "success"
                ? "bg-telemetry-emerald border-telemetry-emerald"
                : event.result === "warning"
                ? "bg-telemetry-amber border-telemetry-amber"
                : "bg-telemetry-rose border-telemetry-rose";

            return (
              <div key={event.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[1.85rem] top-4 w-3.5 h-3.5 rounded-full border-2 bg-surface-1 ${dotColor} shadow-sm group-hover:scale-125 transition-transform`}
                />

                {/* Event Card */}
                <div className="p-4 rounded-xl border border-hairline bg-surface-1 hover:border-surface-3 transition-colors shadow-sm">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-hairline/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded bg-surface-2 border border-hairline text-ink">
                        <Icon className="w-3.5 h-3.5 text-telemetry-cyan" />
                      </span>
                      <span className="text-xs font-mono font-semibold text-ink uppercase tracking-wide">
                        {event.action.replace(/_/g, " ")}
                      </span>
                      {getResultBadge(event.result)}
                    </div>

                    <span
                      title={event.created_at}
                      className="text-[11px] font-mono text-ink-muted whitespace-nowrap self-start sm:self-auto"
                    >
                      {formatDate(event.created_at)}
                    </span>
                  </div>

                  {/* Card Reason Body */}
                  <div className="pt-3">
                    <p className="text-xs text-ink leading-relaxed">
                      {event.reason}
                    </p>
                  </div>

                  {/* Expandable Evidence Payload */}
                  {hasEvidence && (
                    <div className="mt-3 pt-3 border-t border-hairline/60">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleExpand(event.id)}
                          className="flex items-center gap-1.5 text-[11px] font-mono text-telemetry-cyan hover:underline"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          <FileCode className="w-3 h-3" />
                          {isExpanded ? "Hide Evidence Payload" : "Inspect Evidence Payload"} (
                          {Object.keys(event.evidence ?? {}).length} params)
                        </button>

                        {isExpanded && (
                          <button
                            onClick={() => copyEvidence(event.id, event.evidence)}
                            className="flex items-center gap-1 text-[10px] font-mono text-ink-muted hover:text-ink px-2 py-0.5 rounded bg-surface-2 border border-hairline"
                          >
                            {copiedId === event.id ? (
                              <>
                                <Check className="w-3 h-3 text-telemetry-emerald" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy JSON
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <pre className="mt-2.5 p-3 rounded-lg bg-surface-2 border border-hairline text-[11px] font-mono text-ink-muted overflow-x-auto leading-normal">
                          {JSON.stringify(event.evidence, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {timeline && timeline.total > pageSize && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-hairline bg-surface-1 text-xs">
          <span className="font-mono text-ink-muted text-[11px]">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, timeline.total)} of{" "}
            {timeline.total} events
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-ink font-mono text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= timeline.total}
              className="px-3 py-1 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-ink font-mono text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
