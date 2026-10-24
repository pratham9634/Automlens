"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Database,
  Cpu,
  BrainCircuit,
  Plus,
  RefreshCw,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Project, SystemHealth } from "@/lib/types";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { ProjectCard } from "@/components/projects/project-card";

export default function DashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthRes, projectsRes] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.listProjects(),
      ]);

      if (healthRes.status === "fulfilled") {
        setHealth(healthRes.value);
      } else {
        setHealth(null);
      }

      if (projectsRes.status === "fulfilled") {
        setProjects(projectsRes.value.items);
      } else {
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleProjectDeleted = (deletedId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const isDbConnected = health?.database.status === "connected";

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-b from-surface-2 to-surface-1 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-lavender/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
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
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-medium text-ink transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-xs font-medium text-white transition-all shadow-[0_0_14px_rgba(99,102,241,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-4 h-4 text-brand-hover" />
            <h2 className="text-base font-semibold text-ink tracking-tight">
              Active Workspaces
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-2 border border-hairline text-ink-muted">
              {projects.length}
            </span>
          </div>

          {projects.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-brand-hover hover:text-ink font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Another Project</span>
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-xl border border-hairline bg-surface-1/40 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-dashed border-hairline-strong bg-surface-1/40 p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-hairline flex items-center justify-center text-ink-subtle">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">No projects yet</h3>
              <p className="text-xs text-ink-muted max-w-sm">
                Get started by creating your first AutoML project to upload and profile datasets.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover text-xs font-medium text-white transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          /* Project Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleted={handleProjectDeleted}
              />
            ))}
          </div>
        )}
      </section>

      {/* Live Architecture Grid */}
      <section className="space-y-3 pt-6 border-t border-hairline">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink-subtle">
          Telemetry & Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Gateway Card */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-ink-subtle">01 // GATEWAY</span>
              <Server className="w-3.5 h-3.5 text-brand-hover" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-ink">FastAPI Backend</h4>
              <p className="text-[11px] text-ink-muted">Python 3.11+ / Pydantic v2</p>
            </div>
            <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-subtle">Port:</span>
              <span className="text-ink">8000</span>
            </div>
          </div>

          {/* PostgreSQL Database Card */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-ink-subtle">02 // STORAGE</span>
              <Database className="w-3.5 h-3.5 text-telemetry-emerald" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-ink">PostgreSQL 16</h4>
              <p className="text-[11px] text-ink-muted">Docker Compose / SQLAlchemy</p>
            </div>
            <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-subtle">Status:</span>
              {isDbConnected ? (
                <span className="text-telemetry-emerald">Active (Port 5433)</span>
              ) : (
                <span className="text-telemetry-rose">Disconnected</span>
              )}
            </div>
          </div>

          {/* Concurrency Card */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-ink-subtle">03 // COMPUTE</span>
              <Cpu className="w-3.5 h-3.5 text-telemetry-cyan" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-ink">Parallel Workers</h4>
              <p className="text-[11px] text-ink-muted">ProcessPoolExecutor</p>
            </div>
            <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-subtle">Cores:</span>
              <span className="text-telemetry-cyan">{health?.workers ?? 4} Workers</span>
            </div>
          </div>

          {/* Hybrid AI Decision Engine */}
          <div className="p-4 rounded-xl border border-hairline bg-surface-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-ink-subtle">04 // REASONER</span>
              <BrainCircuit className="w-3.5 h-3.5 text-brand-lavender" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-ink">Hybrid AI Reasoner</h4>
              <p className="text-[11px] text-ink-muted">Heuristic + OpenRouter</p>
            </div>
            <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-subtle">Mode:</span>
              <span className="text-brand-hover">Offline & Viva Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* Creation Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
