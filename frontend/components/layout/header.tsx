"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";

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
    <header className="h-[60px] border-b border-border bg-surface/90 backdrop-blur-md px-5 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors select-none">
      {/* Dynamic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
        <Link
          href="/"
          className="text-text-muted hover:text-text-primary transition-colors font-normal"
        >
          AutoMLens
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-text-subtle" />
        
        {isProjectPage ? (
          <>
            <Link
              href="/"
              className="text-text-muted hover:text-text-primary transition-colors font-normal"
            >
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-text-subtle" />
            <span className="font-mono text-text-primary font-medium truncate max-w-[180px] sm:max-w-[260px]">
              {projectId ? `${projectId.slice(0, 8)}...` : "Workspace"}
            </span>
          </>
        ) : (
          <span className="font-medium text-text-primary">Workspace</span>
        )}
      </nav>

      {/* Telemetry Status Bar & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Backend & DB Status Pill */}
        <div
          title={isConnected ? "PostgreSQL database connected" : "Database connection unavailable"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-border bg-surface-subtle text-[11px] font-mono"
        >
          <Database className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary hidden md:inline">Postgres:</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-text-muted animate-spin" />
          ) : isConnected ? (
            <span className="flex items-center gap-1 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
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
