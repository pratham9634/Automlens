"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  ArrowLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoMLensIcon } from "@/components/ui/logo";

export const projectPipelineNav = [
  { id: "dataset", label: "Data & Health", icon: Database },
  { id: "target", label: "AI Strategy", icon: Sliders },
  { id: "training", label: "Training & CV", icon: Cpu },
  { id: "predict", label: "Predictions", icon: BarChart3 },
  { id: "explanations", label: "SHAP Analysis", icon: Sparkles },
  { id: "audit", label: "Audit Ledger", icon: History },
  { id: "exports", label: "Reports & Exports", icon: HardDriveDownload },
];

function SidebarPipelineLinks({
  projectId,
  collapsed = false,
  onNavigate,
  mobile = false,
}: {
  projectId: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get("tab") || "dataset";
  const normalizedTab = rawTab === "leaderboard" ? "training" : rawTab;

  return (
    <div className="space-y-1">
      {projectPipelineNav.map((item) => {
        const Icon = item.icon;
        const isActive = normalizedTab === item.id;
        return (
          <Link
            key={item.id}
            href={`/projects/${projectId}?tab=${item.id}`}
            onClick={onNavigate}
            title={item.label}
            className={cn(
              "flex items-center rounded-md transition-all duration-150 font-sans border-2",
              mobile ? "gap-3 px-3 py-2 text-xs" : "gap-2.5 px-2.5 py-1.5 text-xs",
              isActive
                ? "bg-accent/12 text-accent border-border font-bold shadow-neo-sm"
                : "border-transparent hover:border-border hover:bg-surface-hover hover:shadow-neo-sm font-medium text-text-primary"
            )}
          >
            <Icon className={cn(mobile ? "w-4 h-4" : "w-3.5 h-3.5", "shrink-0", isActive ? "text-accent" : "text-text-muted")} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

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
        "hidden lg:flex border-r-2 border-border bg-surface flex-col justify-between h-screen sticky top-0 z-30 transition-[width] duration-150 select-none shrink-0",
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
                <span className="text-[11px] font-marker font-bold text-accent truncate">
                  ★ Human-Assisted AutoML
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
                <div className="px-2.5 pb-2 flex items-center justify-between text-xs">
                  <span className="font-marker font-bold text-accent text-sm">★ Pipeline Tracks</span>
                  <Link
                    href="/dashboard"
                    className="text-[10px] text-text-muted hover:text-accent hover:underline flex items-center gap-0.5 lowercase font-mono font-bold"
                    title="Return to projects list"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    all
                  </Link>
                </div>
              )}

              {projectId && (
                <Suspense fallback={null}>
                  <SidebarPipelineLinks projectId={projectId} collapsed={collapsed} />
                </Suspense>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Clean Academic Footer (Telemetry removed) */}
      <div className="p-2.5 border-t-2 border-border">
        {collapsed ? (
          <div
            className="flex items-center justify-center p-2 rounded-md bg-surface-subtle border-2 border-border shadow-neo-sm text-text-muted"
            title="AutoMLens v1.0"
          >
            <AutoMLensIcon size={20} />
          </div>
        ) : (
          <div className="p-2.5 rounded-card border-2 border-border bg-surface-subtle shadow-neo-sm flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <AutoMLensIcon size={22} className="shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-display text-xs font-bold text-text-primary truncate">
                  AutoMLens
                </span>
                <span className="text-[10px] text-text-muted font-mono truncate">
                  Enterprise AutoML
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-yellow-200 dark:bg-yellow-900/60 text-slate-950 dark:text-yellow-300 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)] shrink-0">
              v1.0
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isProjectRoute = pathname.startsWith("/projects/") && pathname !== "/projects";
  const projectId = isProjectRoute ? pathname.split("/")[2] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in-0 duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <div className="relative z-50 w-[280px] max-w-[82vw] bg-surface border-r-2 border-border h-full flex flex-col justify-between shadow-neo-lg animate-in slide-in-from-left duration-200 select-none">
        <div className="flex flex-col min-w-0">
          {/* Drawer Header */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b-2 border-border">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0"
            >
              <AutoMLensIcon size={30} />
              <div className="flex flex-col min-w-0">
                <span className="font-display text-sm tracking-wide text-text-primary uppercase flex items-center gap-1.5 truncate font-bold">
                  AutoM<span className="text-accent">Lens</span>
                </span>
                <span className="text-[10px] font-marker font-bold text-accent truncate">
                  ★ Human-Assisted AutoML
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md border-2 border-border text-text-primary hover:bg-surface-hover shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-2 overflow-y-auto">
            <Link
              href="/dashboard"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-xs rounded-md transition-all font-sans",
                pathname === "/dashboard"
                  ? "bg-accent text-white border-2 border-border font-bold shadow-neo-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-2 border-transparent hover:border-border"
              )}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Workspace Overview</span>
            </Link>

            {isProjectRoute && (
              <div className="pt-3 mt-2 border-t-2 border-border">
                <div className="px-3 pb-2 flex items-center justify-between text-xs">
                  <span className="font-marker font-bold text-accent text-sm">★ Pipeline Tracks</span>
                  <Link
                    href="/dashboard"
                    onClick={onClose}
                    className="text-[10px] text-text-muted hover:text-accent font-mono font-bold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                    all
                  </Link>
                </div>
                {projectId && (
                  <Suspense fallback={null}>
                    <SidebarPipelineLinks
                      projectId={projectId}
                      mobile
                      onNavigate={onClose}
                    />
                  </Suspense>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t-2 border-border bg-surface-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AutoMLensIcon size={20} />
              <span className="text-xs font-bold text-text-primary font-display">
                AutoMLens v1.0
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-yellow-200 dark:bg-yellow-900/60 text-slate-950 dark:text-yellow-300">
              Automated ML
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
