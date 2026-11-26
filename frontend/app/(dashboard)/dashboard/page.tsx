"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  FolderOpen,
  FolderPlus,
  Search,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Project, SystemHealth } from "@/lib/types";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { ProjectCard } from "@/components/projects/project-card";
import { HeroProductStage } from "@/components/landing/hero-product-stage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertRow } from "@/components/ui/alert-row";

export default function DashboardPage() {
  const [, setHealth] = useState<SystemHealth | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
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
        const reason = projectsRes.reason;
        setErrorMessage(
          reason instanceof Error
            ? reason.message
            : "Failed to connect to backend service. Please check that FastAPI and PostgreSQL are running."
        );
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

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.status.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const activeDatasetsCount = useMemo(
    () => projects.filter((p) => p.status !== "created").length,
    [projects]
  );
  const trainedCount = useMemo(
    () => projects.filter((p) => ["trained", "completed"].includes(p.status)).length,
    [projects]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b-2 border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-semibold tracking-tight text-xl sm:text-2xl text-text-primary">
              Workspace Overview
            </h1>
          </div>
          <p className="text-xs text-text-muted font-medium">
            Human-assisted tabular AutoML with fold-safe preprocessing, parallel CV, and SHAP explainability.
            <span className="font-marker font-bold text-xs sm:text-sm text-accent block sm:inline sm:ml-1">
              ✏️ 100% reproducible, auditable &amp; fold-safe.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchData}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Connection & Error Notice */}
      {errorMessage && (
        <AlertRow
          variant="danger"
          title="Backend Connection Notice"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex-1">
            <p className="text-xs font-medium text-text-primary">{errorMessage}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="font-bold flex-shrink-0 gap-1.5 w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Retry Connection</span>
          </Button>
        </AlertRow>
      )}

      {/* Real Workspace Telemetry Summary */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 am-panel-enter">
          <div className="p-3.5 rounded-card border-2 border-border bg-surface shadow-neo-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                Total Workspaces
              </span>
              <span className="font-display font-bold text-xl text-text-primary tabular-nums">
                {projects.length}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md border-2 border-border bg-sky-100 dark:bg-sky-950/70 text-accent flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-card border-2 border-border bg-surface shadow-neo-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                Datasets Ingested
              </span>
              <span className="font-display font-bold text-xl text-text-primary tabular-nums">
                {activeDatasetsCount}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md border-2 border-border bg-cyan-100 dark:bg-cyan-950/70 text-secondary flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-card border-2 border-border bg-surface shadow-neo-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                Trained Models Ready
              </span>
              <span className="font-display font-bold text-xl text-success tabular-nums">
                {trainedCount}
              </span>
            </div>
            <div className="w-9 h-9 rounded-md border-2 border-border bg-emerald-100 dark:bg-emerald-950/70 text-success flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Projects Section */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold tracking-tight text-sm sm:text-base text-text-primary">
              Active Projects
            </h2>
            <Badge variant="neutral" size="sm" className="tabular-nums">
              {filteredProjects.length}
            </Badge>
            <span className="font-marker font-bold text-xs text-text-muted hidden md:inline -rotate-1 ml-1">
              ★ Click any project to open ML tracks
            </span>
          </div>

          {projects.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects..."
                  className="h-8 pl-8 text-xs"
                  aria-label="Filter projects"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="font-bold gap-1 text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Create Project</span>
                <span className="xs:hidden">New</span>
              </Button>
            </div>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-card" />
            ))}
          </div>
        ) : projects.length === 0 && !errorMessage ? (
          /* Empty State + Optional Benchmark Preview */
          <div className="space-y-4">
            <EmptyState
              icon={FolderPlus}
              title="No projects created yet"
              description="Initialize your first AutoML project to upload datasets, review statistical profiles, and train candidate models."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Button
                    variant="primary"
                    onClick={() => setIsModalOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Project</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSamplePreview((v) => !v)}
                    className="gap-1.5 font-mono text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Sample Pipeline Tour</span>
                    {showSamplePreview ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              }
            />

            {showSamplePreview && (
              <div className="p-4 sm:p-5 rounded-card border-2 border-dashed border-border bg-surface-subtle/50 space-y-2 am-panel-enter">
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span className="font-bold text-accent">
                    SAMPLE WORKFLOW PREVIEW (ILLUSTRATIVE BENCHMARK — NOT LIVE DATA)
                  </span>
                </div>
                <HeroProductStage />
              </div>
            )}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching workspaces"
            description={`No projects matched "${searchQuery}". Try clearing your search filter.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear Filter
              </Button>
            }
          />
        ) : (
          /* Project Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 am-panel-enter">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleted={handleProjectDeleted}
              />
            ))}
          </div>
        )}
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
