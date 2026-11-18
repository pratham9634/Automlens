"use client";

import React from "react";
import { Route } from "lucide-react";
import { ConceptOrigamiStream } from "./assembly-concepts/concept-origami-stream";

export function WorkflowSection() {
  return (
    <section
      id="pipeline"
      className="py-20 sm:py-28 border-b-2 border-border bg-[#FAF8F3] dark:bg-[#0E1017] relative overflow-hidden transition-colors"
    >
      {/* Blueprint / Graph Paper Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(120, 110, 90, 0.16) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 110, 90, 0.16) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Soft Ambient Underglow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-amber-400/6 dark:bg-cyan-500/4 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Route className="w-3.5 h-3.5" />
            <span>CHAPTER 05 // THE LIVING ORIGAMI STREAM</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-2 ml-1">
              ★ 3D Document Transformation
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Watch Your Spreadsheet{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              Fold, Learn &amp; Seal
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            From raw messy rows to an audited prediction report in four tactile, continuous origami folds—with zero lines of code written.
            <span className="block font-marker text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              ✏️ Zero black boxes: every fold mathematically protects against data leakage.
            </span>
          </p>
        </div>

        {/* The Elevated Origami Stream Component */}
        <ConceptOrigamiStream />
      </div>
    </section>
  );
}
