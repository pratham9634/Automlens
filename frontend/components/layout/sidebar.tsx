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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [mounted, setMounted] = useState(false);

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
        "border-r border-border bg-surface flex flex-col justify-between h-screen sticky top-0 z-30 transition-[width] duration-160 ease-enter select-none shrink-0",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col min-w-0">
        {/* Brand Header */}
        <div className="h-[60px] flex items-center justify-between px-3.5 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
            title="AutoMLens Workspace"
          >
            <div className="w-8 h-8 rounded-button bg-accent text-white flex items-center justify-center font-semibold text-xs shrink-0 tracking-tight shadow-none transition-transform group-hover:scale-105">
              AL
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs tracking-tight text-text-primary flex items-center gap-1.5 truncate">
                  AutoMLens
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface-subtle text-text-muted border border-border">
                    v1.0
                  </span>
                </span>
                <span className="text-[10px] text-text-muted truncate">
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
              "flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-button transition-colors",
              pathname === "/"
                ? "bg-accent/10 text-accent border border-accent/20 font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent"
            )}
          >
            <Layers className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Workspace</span>}
          </Link>

          {/* Project Context Navigation */}
          {isProjectRoute && (
            <div className="pt-3 mt-2 border-t border-border">
              {!collapsed && (
                <div className="px-2.5 pb-1.5 flex items-center justify-between text-[11px] font-medium text-text-muted">
                  <span>Project Workflow</span>
                  <Link
                    href="/"
                    className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                    title="Return to projects list"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    All
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
                        "flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-button transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-hover"
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
      <div className="p-2.5 border-t border-border">
        {collapsed ? (
          <div
            className="flex items-center justify-center p-2 rounded-button bg-surface-subtle border border-border text-text-muted"
            title="Engine: Hybrid AI | ProcessPool (4 Cores)"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-card border border-border bg-surface-subtle">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span>Engine Telemetry</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Ready
              </span>
            </div>
            <div className="text-[11px] text-text-muted space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-text-subtle">Mode:</span>
                <span className="text-text-secondary">Hybrid AI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-subtle">Workers:</span>
                <span className="text-text-secondary tabular-nums">4 Cores CPU</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
