"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Database,
  Cpu,
  BarChart3,
  Sparkles,
  History,
  HardDriveDownload,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Overview", href: "/", icon: Layers },
  { name: "Datasets", href: "/datasets", icon: Database, disabled: true },
  { name: "Parallel Training", href: "/training", icon: Cpu, disabled: true },
  { name: "Leaderboard", href: "/leaderboard", icon: BarChart3, disabled: true },
  { name: "Explainability (SHAP)", href: "/explanations", icon: Sparkles, disabled: true },
  { name: "Audit Ledger", href: "/audit", icon: History, disabled: true },
  { name: "Exports", href: "/exports", icon: HardDriveDownload, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-hairline bg-surface-1 flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-hairline gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-lavender/20 border border-brand-lavender/40 flex items-center justify-center text-brand-lavender font-semibold text-sm shadow-[0_0_12px_rgba(99,102,241,0.25)]">
            AL
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-ink flex items-center gap-2">
              AutoMLens
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-3 text-ink-muted border border-hairline">
                v0.1
              </span>
            </span>
            <span className="text-[11px] text-ink-subtle">Human-Assisted AutoML</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return item.disabled ? (
              <div
                key={item.name}
                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-ink-faint rounded-md cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4 text-ink-faint" />
                <span>{item.name}</span>
                <span className="ml-auto text-[10px] font-mono text-ink-faint">Phase 1+</span>
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-brand-lavender/10 text-brand-hover border border-brand-lavender/25"
                    : "text-ink-muted hover:text-ink hover:bg-surface-2"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-brand-hover" : "text-ink-subtle")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Engine Status Card */}
      <div className="p-4 m-3 rounded-lg border border-hairline bg-surface-2/60">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-telemetry-cyan" />
          <span className="text-xs font-medium text-ink">Engine Status</span>
        </div>
        <div className="text-[11px] text-ink-muted space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-ink-subtle">Mode:</span>
            <span className="text-telemetry-emerald">Hybrid AI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-subtle">Concurrency:</span>
            <span className="text-ink">ProcessPool (4 cores)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
