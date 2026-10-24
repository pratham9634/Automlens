"use client";

import { useState } from "react";
import { X, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Project } from "@/lib/types";

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

  if (!isOpen) return null;

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
          setError(`A project named "${name.trim()}" already exists. Please pick a different name.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-hairline-strong bg-surface-1 shadow-2xl p-6 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-brand-lavender/20 border border-brand-lavender/40 flex items-center justify-center text-brand-hover">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-semibold text-ink tracking-tight">
                Create New Project
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              Initialize a dedicated AutoML workspace with isolated dataset & model storage.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg border border-telemetry-rose/30 bg-telemetry-rose/10 flex items-center gap-2.5 text-xs text-telemetry-rose">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="project-name" className="font-medium text-ink">
                Project Name <span className="text-telemetry-rose">*</span>
              </label>
              <span className="text-[11px] font-mono text-ink-subtle">
                {name.length}/100
              </span>
            </div>
            <input
              id="project-name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Titanic Survival Classifier"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-surface-2 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-brand-lavender focus:border-brand-lavender transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="project-desc" className="font-medium text-ink">
                Description <span className="text-ink-subtle font-normal">(optional)</span>
              </label>
              <span className="text-[11px] font-mono text-ink-subtle">
                {description.length}/500
              </span>
            </div>
            <textarea
              id="project-desc"
              rows={3}
              maxLength={500}
              placeholder="Describe the problem, target metric, or business context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-surface-2 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-brand-lavender focus:border-brand-lavender transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-hairline bg-surface-2 hover:bg-surface-3 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-lavender hover:bg-brand-hover disabled:bg-brand-lavender/40 text-xs font-medium text-white transition-all shadow-[0_0_14px_rgba(99,102,241,0.3)] disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Creating Workspace..." : "Create Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
