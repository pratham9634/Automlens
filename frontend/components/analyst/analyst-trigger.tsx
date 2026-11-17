"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { AnalystDrawer } from "./analyst-drawer";

interface AnalystTriggerProps {
  projectId: string;
}

export function AnalystTrigger({ projectId }: AnalystTriggerProps) {
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
        title="Open Tabular AI Analyst (Ctrl+J)"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-surface border border-cyan-500/40 text-text-primary shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.4)] hover:border-cyan-500 hover:scale-105 active:scale-95 transition-all select-none group"
      >
        <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide">AI Analyst</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-subtle text-text-muted border border-border/80">
          ⌘J
        </kbd>
      </button>

      <AnalystDrawer
        projectId={projectId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
