"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Calendar,
  ArrowRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProjectCardProps {
  project: Project;
  onDeleted: (projectId: string) => void;
}

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.deleteProject(project.id);
      setShowDeleteDialog(false);
      onDeleted(project.id);
    } catch {
      setDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return <Badge variant="neutral" className="font-marker text-xs font-bold">Ready for Data</Badge>;
      case "dataset_uploaded":
        return <Badge variant="streaming" withBeacon className="font-marker text-xs font-bold">Dataset Active</Badge>;
      case "profiled":
        return <Badge variant="optimal" className="font-marker text-xs font-bold">Profiled</Badge>;
      case "trained":
        return <Badge variant="success" className="font-marker text-xs font-bold">★ Trained</Badge>;
      default:
        return <Badge variant="neutral" className="font-marker text-xs font-bold">{status}</Badge>;
    }
  };

  return (
    <>
      <Card interactive className="p-4 sm:p-5 flex flex-col justify-between space-y-4">
        {/* Top Header */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-md bg-sky-100 dark:bg-sky-950/80 border-2 border-border shadow-neo-sm flex items-center justify-center text-accent shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-text-primary line-clamp-1">
                {project.name}
              </h3>
            </div>
            {renderStatusBadge(project.status)}
          </div>

          <p className="text-xs text-text-secondary line-clamp-2 min-h-[2rem] leading-relaxed">
            {project.description || "No project description provided."}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t-2 border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-mono tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-text-subtle" />
            <span>{formatDate(project.created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Trigger Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              title={`Delete ${project.name}`}
              className="text-text-muted hover:text-danger hover:border-border hover:bg-rose-100 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            {/* Open Project Workspace */}
            <Link href={`/projects/${project.id}`}>
              <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
                <span className="font-marker text-sm">Open Track</span>
                <ArrowRight className="w-3 h-3 text-text-muted" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Explicit Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-danger mb-1">
              <div className="w-7 h-7 rounded-button bg-danger/10 border border-danger/25 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle>Delete Project</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-text-primary">&quot;{project.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-text-secondary bg-surface-subtle border border-border p-3 rounded-card leading-relaxed my-2">
            This action will permanently delete all associated dataset files, statistical profiles, model pipelines, training runs, and audit ledger logs. This action cannot be reversed.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
