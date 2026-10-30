"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Database,
  Sliders,
  BarChart3,
  Sparkles,
  History,
  HardDriveDownload,
  Activity,
  ArrowLeft,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoMLensIcon } from "@/components/ui/logo";

const projectPipelineNav = [
  { id: "dataset", label: "Data & Health", icon: Database },
  { id: "target", label: "AI Strategy", icon: Sliders },
  { id: "training", label: "Training & CV", icon: Cpu },
  { id: "predict", label: "Predictions", icon: BarChart3 },
  { id: "explanations", label: "SHAP Analysis", icon: Sparkles },
  { id: "audit", label: "Audit Ledger", icon: History },
  { id: "exports", label: "Viva Exports", icon: HardDriveDownload },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("automlens-sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("automlens-sidebar-collapsed", String(next));
  };

  const isProjectRoute = pathname.startsWith("/projects/") && pathname !== "/projects";
  const projectId = isProjectRoute ? pathname.split("/")[2] : null;

  return (
    <aside
      className={cn(
        "border-r border-border/80 bg-surface flex flex-col justify-between h-screen sticky top-0 z-30 transition-[width] duration-160 ease-enter select-none shrink-0 shadow-sm",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col min-w-0">
        {/* Brand Header */}
        <div className="h-[60px] flex items-center justify-between px-3.5 border-b border-border/70">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
            title="AutoMLens Workspace"
          >
            <div className="transition-transform group-hover:scale-105 shrink-0">
              <AutoMLensIcon size={34} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display text-sm tracking-wide text-text-primary uppercase flex items-center gap-1.5 truncate">
                  AutoM<span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">Lens</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                    v1.0
                  </span>
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted truncate">
                  Human-Assisted AutoML
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1 rounded-button text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Global Navigation */}
        <nav className="p-2.5 space-y-1">
          <Link
            href="/"
            title="Workspace Overview"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-button transition-all duration-160 font-sans",
              pathname === "/"
                ? "bg-accent/15 text-accent border border-accent/30 font-semibold shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent"
            )}
          >
            <Layers className="w-4 h-4 shrink-0 text-accent" />
            {!collapsed && <span>Workspace</span>}
          </Link>

          {/* Project Context Navigation */}
          {isProjectRoute && (
            <div className="pt-3 mt-2 border-t border-border/60">
              {!collapsed && (
                <div className="px-2.5 pb-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  <span>Pipeline Tracks</span>
                  <Link
                    href="/"
                    className="text-[10px] text-accent hover:underline flex items-center gap-0.5 lowercase font-mono"
                    title="Return to projects list"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    all
                  </Link>
                </div>
              )}

              <div className="space-y-0.5">
                {projectPipelineNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={`/projects/${projectId}?tab=${item.id}`}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-button transition-colors font-sans text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:border-l-2 hover:border-l-secondary"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Engine Status / Telemetry Footer */}
      <div className="p-2.5 border-t border-border/70">
        {collapsed ? (
          <div
            className="flex items-center justify-center p-2 rounded-button bg-surface-subtle border border-border text-text-muted"
            title="Telemetry: Active | 4 Cores CPU"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-card border border-border/80 bg-surface-subtle shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary font-sans">
                <Activity className="w-3.5 h-3.5 text-secondary animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-wider">Telemetry</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-ping" />
                Ready
              </span>
            </div>
            <div className="text-[11px] text-text-muted space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-text-subtle">Engine:</span>
                <span className="text-text-secondary">Hybrid AI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-subtle">Workers:</span>
                <span className="text-cyan-400 tabular-nums">4 Cores CPU</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
