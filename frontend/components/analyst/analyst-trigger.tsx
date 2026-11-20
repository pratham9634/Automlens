"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { AnalystDrawer } from "./analyst-drawer";

interface AnalystTriggerProps {
  projectId: string;
  projectName?: string;
}

export function AnalystTrigger({ projectId, projectName }: AnalystTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+J or Cmd+J
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Open Lens AI Copilot (Ctrl+J / ⌘J)"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-surface border border-cyan-500/50 text-text-primary shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.45)] hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all select-none group cursor-pointer"
      >
        <div className="relative w-5 h-5 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-xs font-semibold tracking-wide">Ask Lens</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-subtle text-text-muted border border-border/80">
          ⌘J
        </kbd>
      </button>

      <AnalystDrawer
        projectId={projectId}
        projectName={projectName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
