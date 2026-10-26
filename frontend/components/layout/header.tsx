"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";

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
    <header className="h-[60px] border-b border-border bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-muted">AutoMLens</span>
        <span className="text-border-strong">/</span>
        <span className="font-medium text-text-primary">Workspace</span>
      </div>

      {/* Telemetry Status Bar & Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Database Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-surface-subtle text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-secondary hidden md:inline">PostgreSQL:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-danger">
              <AlertCircle className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
