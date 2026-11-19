"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STORY_SCENES } from "./story-data";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface NarrativePanelProps {
  activeScene: number;
  onSelectScene?: (index: number) => void;
}

export function NarrativePanel({ activeScene, onSelectScene }: NarrativePanelProps) {
  const scene = STORY_SCENES[activeScene];

  return (
    <div className="w-full flex flex-col justify-between py-2 sm:py-4 space-y-6">
      
      {/* Top Chapter Identity & Navigation */}
      <div className="space-y-4">
        {/* Subtle Progress Bar & Scene Counter */}
        <div className="flex items-center justify-between border-b border-[var(--story-border)] pb-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--story-text-secondary)]">
            <span className="font-bold text-[var(--story-text-primary)]">
              {scene.chapterNumber}
            </span>
            <span>/</span>
            <span>07</span>
            <span className="mx-1 text-[var(--story-text-muted)]">·</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-[var(--story-accent-blue)]">
              {scene.chapterLabel}
            </span>
          </div>

          {/* Quick Scene Selector Nodes */}
          <div className="flex items-center gap-1.5">
            {STORY_SCENES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onSelectScene?.(idx)}
                aria-label={`Jump to Scene ${idx + 1}`}
                className={`transition-all duration-200 rounded-full ${
                  activeScene === idx
                    ? "w-6 h-1.5 bg-[var(--story-accent-blue)]"
                    : "w-1.5 h-1.5 bg-[var(--story-border-strong)]/30 hover:bg-[var(--story-border-strong)]/60"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Large Lightweight Chapter Number & Badge */}
        <div className="flex items-baseline gap-4">
          <span className="font-display text-5xl sm:text-6xl lg:text-7xl font-extralight text-[var(--story-text-muted)] select-none leading-none">
            {scene.chapterNumber}
          </span>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] text-[var(--story-text-secondary)]">
            {scene.badge}
          </span>
        </div>
      </div>

      {/* Headline & Narrative Prose with Animated Transitions */}
      <div className="space-y-3.5 my-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-3"
          >
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--story-text-primary)] tracking-tight leading-[1.18]">
              {scene.headline}
            </h2>

            <p className="text-sm sm:text-base text-[var(--story-text-secondary)] font-sans leading-relaxed">
              {scene.narrative}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Technical Annotation & Academic Grounding */}
      <div className="border-t border-[var(--story-border)] pt-4 space-y-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--story-text-muted)] uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3 text-[var(--story-accent-teal)]" />
          <span>TECHNICAL AUDIT ANNOTATION</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id + "-annotation"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-2.5 rounded-md bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[11px] text-[var(--story-text-secondary)] leading-normal"
          >
            {scene.technicalAnnotation}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
