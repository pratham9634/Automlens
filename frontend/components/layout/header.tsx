"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw, GitBranch } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";

export function Header() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = health?.status === "ok" && health?.database.status === "connected";

  return (
    <header className="h-16 border-b border-hairline bg-surface-1/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-subtle">Workspace</span>
        <span className="text-ink-subtle">/</span>
        <span className="text-xs font-medium text-ink">Dashboard Overview</span>
      </div>

      {/* Telemetry Status Bar */}
      <div className="flex items-center gap-3">
        {/* Branch Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-hairline bg-surface-2 text-[11px] font-mono text-ink-muted">
          <GitBranch className="w-3 h-3 text-brand-hover" />
          <span>phase-11-ui-ux</span>
        </div>

        {/* Database Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-hairline bg-surface-2 text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-ink-subtle" />
          <span className="text-ink-muted hidden md:inline">PostgreSQL:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-ink-subtle animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1 text-telemetry-emerald">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-telemetry-rose">
              <AlertCircle className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
