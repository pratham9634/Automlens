"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Project } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertRow } from "@/components/ui/alert-row";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const project = await apiClient.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onCreated(project);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          setError(
            `A project named "${name.trim()}" already exists. Please pick a different name.`
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to create project. Check backend connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-button bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <DialogTitle>Create New Project</DialogTitle>
          </div>
          <DialogDescription>
            Initialize a dedicated AutoML workspace with isolated dataset and model artifacts.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4">
            <AlertRow variant="danger">{error}</AlertRow>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="project-name" className="font-medium text-text-primary">
                Project Name <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] font-mono text-text-muted tabular-nums">
                {name.length}/100
              </span>
            </div>
            <Input
              id="project-name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. California Housing Predictor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="project-desc" className="font-medium text-text-primary">
                Description <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <span className="text-[11px] font-mono text-text-muted tabular-nums">
                {description.length}/500
              </span>
            </div>
            <Textarea
              id="project-desc"
              rows={3}
              maxLength={500}
              placeholder="Describe the task, evaluation metric, or data domain..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name.trim()}
              isLoading={loading}
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
