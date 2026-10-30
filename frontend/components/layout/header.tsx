"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, RefreshCw, ChevronRight, Activity, Terminal } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { AutoMLensIcon } from "@/components/ui/logo";

export function Header() {
  const pathname = usePathname();
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
  const isProjectPage = pathname.startsWith("/projects/") && pathname !== "/projects";
  const projectId = isProjectPage ? pathname.split("/")[2] : null;

  return (
    <header className="h-[60px] border-b border-border/80 bg-surface/90 backdrop-blur-md px-5 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors select-none">
      {/* Dynamic Telemetry Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-sans">
        <Link
          href="/"
          className="text-text-muted hover:text-text-primary transition-colors font-medium flex items-center gap-1"
        >
          <AutoMLensIcon size={18} />
          <span>AutoMLens</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-text-subtle" />

        {isProjectPage ? (
          <>
            <Link
              href="/"
              className="text-text-muted hover:text-text-primary transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRight className="w-3 h-3 text-text-subtle" />
            <span className="font-mono text-cyan-400 font-semibold truncate max-w-[180px] sm:max-w-[260px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {projectId ? `${projectId.slice(0, 8)}...` : "Workspace"}
            </span>
          </>
        ) : (
          <span className="font-mono text-xs uppercase tracking-wider text-text-primary">
            Workspace Canvas
          </span>
        )}
      </nav>

      {/* Telemetry Status Bar & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Backend & DB Status Pill */}
        <div
          title={isConnected ? "PostgreSQL database connected" : "Database connection unavailable"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-border/80 bg-surface-subtle text-[11px] font-mono shadow-sm"
        >
          <Database className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary hidden md:inline">Telemetry DB:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-secondary animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              Offline
            </span>
          )}
        </div>

        {/* 3-State Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
