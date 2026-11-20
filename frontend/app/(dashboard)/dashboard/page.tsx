"use client";

import { useEffect, useState } from "react";
import {
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertRow } from "@/components/ui/alert-row";

export default function DashboardPage() {
  const [, setHealth] = useState<SystemHealth | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      {/* Projects Section */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold tracking-tight text-sm sm:text-base text-text-primary">
              Active Projects
            </h2>
            <Badge variant="neutral" size="sm" className="tabular-nums">
              {projects.length}
            </Badge>
            <span className="font-marker font-bold text-xs text-text-muted hidden md:inline -rotate-1 ml-1">
              ★ Click any project to open ML tracks
            </span>
          </div>

          {projects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="font-bold gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Create Project</span>
              <span className="xs:hidden">New</span>
            </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
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

      {/* Creation Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
