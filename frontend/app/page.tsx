"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Database,
  Cpu,
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/lib/types";

export default function DashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getHealth();
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isDbConnected = health?.database.status === "connected";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-b from-surface-2 to-surface-1 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-lavender/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-lavender/10 border border-brand-lavender/30 text-xs font-mono text-brand-hover">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 0: Architecture & Environment Initialized</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
              AutoMLens Control Center
            </h1>
            <p className="text-sm text-ink-muted max-w-xl">
              Human-assisted tabular AutoML with parallel cross-validation, leak-free preprocessing,
              and game-theoretic SHAP explainability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-medium text-ink transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Recheck Telemetry</span>
            </button>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender/40 text-xs font-medium text-ink-muted cursor-not-allowed border border-brand-lavender/20"
            >
              <span>Create Project</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Gateway Card */}
        <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ink-subtle">01 // GATEWAY</span>
            <Server className="w-4 h-4 text-brand-hover" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink">FastAPI Backend</h3>
            <p className="text-xs text-ink-muted">Python 3.11+ / Pydantic v2</p>
          </div>
          <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-xs font-mono">
            <span className="text-ink-subtle">Port:</span>
            <span className="text-ink">8000</span>
          </div>
        </div>

        {/* PostgreSQL Database Card */}
        <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ink-subtle">02 // STORAGE</span>
            <Database className="w-4 h-4 text-telemetry-emerald" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink">PostgreSQL 16</h3>
            <p className="text-xs text-ink-muted">Docker Compose / SQLAlchemy</p>
          </div>
          <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-xs font-mono">
            <span className="text-ink-subtle">Status:</span>
            {isDbConnected ? (
              <span className="text-telemetry-emerald flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active (Port 5433)
              </span>
            ) : (
              <span className="text-telemetry-rose">Disconnected</span>
            )}
          </div>
        </div>

        {/* Concurrency Card */}
        <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ink-subtle">03 // COMPUTE</span>
            <Cpu className="w-4 h-4 text-telemetry-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink">Parallel Workers</h3>
            <p className="text-xs text-ink-muted">ProcessPoolExecutor</p>
          </div>
          <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-xs font-mono">
            <span className="text-ink-subtle">Allocated Cores:</span>
            <span className="text-telemetry-cyan">{health?.workers ?? 4} Workers</span>
          </div>
        </div>

        {/* Hybrid AI Decision Engine */}
        <div className="p-5 rounded-xl border border-hairline bg-surface-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ink-subtle">04 // INTELLIGENCE</span>
            <BrainCircuit className="w-4 h-4 text-brand-lavender" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink">Hybrid AI Reasoner</h3>
            <p className="text-xs text-ink-muted">Rule Engine + OpenRouter</p>
          </div>
          <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-xs font-mono">
            <span className="text-ink-subtle">Mode:</span>
            <span className="text-brand-hover">Offline & Viva Safe</span>
          </div>
        </div>
      </div>

      {/* Next Phase Roadmap Banner */}
      <div className="p-6 rounded-xl border border-hairline bg-surface-1/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted font-mono">
            Ready for Phase 1
          </h4>
          <p className="text-sm text-ink font-medium">
            Project Skeleton, Database Schema & Project CRUD Management
          </p>
          <p className="text-xs text-ink-subtle">
            Will implement project creation, PostgreSQL schema migration, and dashboard project cards.
          </p>
        </div>
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg border border-hairline bg-surface-2 text-ink-muted">
          Upcoming: POST /api/v1/projects
        </div>
      </div>
    </div>
  );
}
