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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <h1 className="font-display tracking-wide text-2xl uppercase text-text-primary">Workspace Overview</h1>
          <p className="text-xs text-text-muted">
            Human-assisted tabular AutoML with fold-safe preprocessing, parallel CV, and SHAP explainability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <h2 className="font-display tracking-wider text-base uppercase text-text-primary">
              Active Projects
            </h2>
            <Badge variant="neutral" size="sm" className="tabular-nums">
              {projects.length}
            </Badge>
          </div>

          {projects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-accent hover:text-accent font-medium gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </Button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-card" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={FolderPlus}
            title="No projects created yet"
            description="Initialize your first AutoML project to upload datasets, review statistical profiles, and train candidate models."
            action={
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Project</span>
              </Button>
            }
          />
        ) : (
          /* Project Cards Grid */
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

      {/* System Infrastructure Grid */}
      <section className="space-y-3 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted">
            System &amp; Infrastructure Status
          </h3>
          <span className="text-[11px] font-mono text-text-subtle">
            Single-Node Parallel Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* API Gateway Card */}
          <Card accentTop="azure" className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">API Gateway</span>
              <Server className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">FastAPI / Pydantic v2</p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
              <span className="text-text-subtle">Port:</span>
              <span className="text-text-primary tabular-nums">8000</span>
            </div>
          </Card>

          {/* Database Card */}
          <Card accentTop="cyan" className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">Metadata Storage</span>
              <Database className="w-3.5 h-3.5 text-success" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">PostgreSQL 16 / SQLAlchemy</p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
              <span className="text-text-subtle">Status:</span>
              {isDbConnected ? (
                <span className="text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  Connected
                </span>
              ) : (
                <span className="text-danger flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
                  Disconnected
                </span>
              )}
            </div>
          </Card>

          {/* Concurrency Card */}
          <Card accentTop="cyan" className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">Parallel Workers</span>
              <Cpu className="w-3.5 h-3.5 text-info" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">ProcessPoolExecutor</p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
              <span className="text-text-subtle">Concurrency:</span>
              <span className="text-text-primary tabular-nums">
                {health?.workers ?? 4} CPU Cores
              </span>
            </div>
          </Card>

          {/* Hybrid Decision Engine Card */}
          <Card accentTop="indigo" className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">AI Decision Engine</span>
              <BrainCircuit className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Deterministic + LLM Rationale</p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
              <span className="text-text-subtle">Mode:</span>
              <span className="text-accent">Hybrid AI</span>
            </div>
          </Card>
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
