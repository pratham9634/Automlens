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
  { id: "exports", label: "Reports & Exports", icon: HardDriveDownload },
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
        "border-r-2 border-border bg-surface flex flex-col justify-between h-screen sticky top-0 z-30 transition-[width] duration-150 select-none shrink-0",
        collapsed ? "w-[64px]" : "w-[236px]"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col min-w-0">
        {/* Brand Header */}
        <div className="h-[60px] flex items-center justify-between px-3.5 border-b-2 border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0 group"
            title="AutoMLens Workspace"
          >
            <div className="transition-transform group-hover:scale-105 shrink-0">
              <AutoMLensIcon size={34} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display text-sm tracking-wide text-text-primary uppercase flex items-center gap-1.5 truncate font-bold">
                  AutoM<span className="text-accent">Lens</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-yellow-200 dark:bg-yellow-900/60 text-slate-950 dark:text-yellow-300 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                    v1.0
                  </span>
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted truncate font-bold">
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
            className="p-1 rounded-md border-2 border-border text-text-primary hover:bg-surface-hover shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Global Navigation */}
        <nav className="p-2.5 space-y-1.5">
          <Link
            href="/dashboard"
            title="Workspace Overview"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all duration-100 font-sans cursor-pointer",
              pathname === "/dashboard"
                ? "bg-accent text-white border-2 border-border font-bold shadow-neo-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-2 border-transparent hover:border-border hover:shadow-neo-sm"
            )}
          >
            <Layers className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Workspace</span>}
          </Link>

          {/* Project Context Navigation */}
          {isProjectRoute && (
            <div className="pt-3 mt-2 border-t-2 border-border">
              {!collapsed && (
                <div className="px-2.5 pb-2 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  <span>Pipeline Tracks</span>
                  <Link
                    href="/"
                    className="text-[10px] text-accent hover:underline flex items-center gap-0.5 lowercase font-mono font-bold"
                    title="Return to projects list"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    all
                  </Link>
                </div>
              )}

              <div className="space-y-1">
                {projectPipelineNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={`/projects/${projectId}?tab=${item.id}`}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-100 font-sans border-2 border-transparent hover:border-border hover:bg-surface-hover hover:shadow-neo-sm font-medium text-text-primary"
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
      <div className="p-2.5 border-t-2 border-border">
        {collapsed ? (
          <div
            className="flex items-center justify-center p-2 rounded-md bg-surface-subtle border-2 border-border shadow-neo-sm text-text-muted"
            title="System: Online | 4 Cores CPU"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-card border-2 border-border bg-surface-subtle shadow-neo-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary font-sans">
                <Activity className="w-3.5 h-3.5 text-secondary animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-wider">System Status</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-border shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                Ready
              </span>
            </div>
            <div className="text-[11px] text-text-muted space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-text-subtle">Engine:</span>
                <span className="text-text-secondary font-bold">Hybrid AI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-subtle">Workers:</span>
                <span className="text-accent font-bold tabular-nums">4 Cores CPU</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
