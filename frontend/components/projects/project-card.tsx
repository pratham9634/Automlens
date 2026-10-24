"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Calendar,
  ArrowRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface ProjectCardProps {
  project: Project;
  onDeleted: (projectId: string) => void;
}

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await apiClient.deleteProject(project.id);
      onDeleted(project.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-3 text-ink-muted border border-hairline">
            Ready for Data
          </span>
        );
      case "dataset_uploaded":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30">
            Dataset Uploaded
          </span>
        );
      case "profiled":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30">
            Profiled
          </span>
        );
      case "trained":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-telemetry-emerald/10 text-telemetry-emerald border border-telemetry-emerald/30">
            Trained & Evaluated
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-3 text-ink-muted border border-hairline">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="group relative rounded-xl border border-hairline bg-surface-1 hover:bg-surface-2/80 hover:border-hairline-strong transition-all duration-200 p-5 flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-hairline flex items-center justify-center text-brand-hover group-hover:border-brand-lavender/40 transition-colors">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink tracking-tight line-clamp-1 group-hover:text-brand-hover transition-colors">
              {project.name}
            </h3>
          </div>
          {getStatusBadge(project.status)}
        </div>

        <p className="text-xs text-ink-muted line-clamp-2 min-h-[2rem]">
          {project.description || "No description provided."}
        </p>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-hairline/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-ink-subtle text-[11px] font-mono">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(project.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete Action */}
          <button
            onClick={handleDelete}
            onMouseLeave={() => setConfirmDelete(false)}
            disabled={deleting}
            className={`p-1.5 rounded-md transition-colors ${
              confirmDelete
                ? "bg-telemetry-rose text-white hover:bg-telemetry-rose/90"
                : "text-ink-subtle hover:text-telemetry-rose hover:bg-surface-3"
            }`}
            title={confirmDelete ? "Click again to confirm delete" : "Delete Project"}
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Open Workspace Action */}
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 hover:bg-brand-lavender text-[11px] font-medium text-ink-muted hover:text-white border border-hairline transition-all"
          >
            <span>Open</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
