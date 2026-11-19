"use client";

import React from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, CheckCircle2, UserCheck, Sparkles, ShieldCheck } from "lucide-react";

export function Scene03Decision() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-blue)]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)]">
              TASK SPECIFICATION &amp; TARGET LOCK
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              Rule Engine Suggestion + Explicit Human Operator Confirmation (Rule 2)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--story-accent-teal)]/10 border border-[var(--story-accent-teal)]/40 font-mono text-[10px] text-[var(--story-accent-teal)] font-bold">
          <UserCheck className="w-3 h-3" />
          <span>HUMAN CONFIRMED</span>
        </div>
      </div>

      {/* Center Decision Interface */}
      <div className="my-auto py-2 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Left: The Extracted Target Column Preview (5 cols) */}
        <div className="md:col-span-5 rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 space-y-2 shadow-sm">
          <div className="text-[10px] font-mono text-[var(--story-text-secondary)] uppercase tracking-wider">
            SELECTED TARGET COLUMN
          </div>
          
          <div className="p-3 rounded-md border border-[var(--story-accent-blue)]/60 bg-[var(--story-accent-blue)]/5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-bold text-[var(--story-text-primary)]">Churn</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--story-surface)] border border-[var(--story-border)] text-[var(--story-accent-blue)]">
                Discrete Binary
              </span>
            </div>
            
            <div className="mt-2.5 space-y-1 font-mono text-[11px] text-[var(--story-text-secondary)]">
              <div className="flex justify-between">
                <span>Class 0 (&quot;No&quot;):</span>
                <span className="font-bold text-[var(--story-text-primary)]">7,348 (73.5%)</span>
              </div>
              <div className="flex justify-between">
                <span>Class 1 (&quot;Yes&quot;):</span>
                <span className="font-bold text-[var(--story-accent-blue)]">2,652 (26.5%)</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[var(--story-text-secondary)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--story-accent-amber)]" />
            <span>Class imbalance detected: Macro-averaging recommended</span>
          </div>
        </div>

        {/* Right: Heuristic Suggestion vs User Confirmation (7 cols) */}
        <div className="md:col-span-7 space-y-3">
          
          {/* Problem Type Selector (Human in the Loop) */}
          <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-[var(--story-text-primary)]">
                MODELING OBJECTIVE
              </span>
              <span className="text-[10px] text-[var(--story-accent-teal)] font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Heuristic Recommendation</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Confirmed Selection: Classification */}
              <div className="p-2.5 rounded-md border-2 border-[var(--story-accent-teal)] bg-[var(--story-accent-teal)]/5 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-[var(--story-text-primary)]">
                  <span>Classification</span>
                  <CheckCircle2 className="w-4 h-4 text-[var(--story-accent-teal)]" />
                </div>
                <div className="text-[10px] font-mono text-[var(--story-text-secondary)] mt-1">
                  Predict discrete categories
                </div>
                <div className="mt-2 text-[9px] font-mono text-[var(--story-accent-teal)] font-bold uppercase">
                  ● OPERATOR CONFIRMED
                </div>
              </div>

              {/* Alternative: Regression (Disabled / Overridable) */}
              <div className="p-2.5 rounded-md border border-[var(--story-border)] bg-[var(--story-surface-subtle)]/50 opacity-60 flex flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-[var(--story-text-secondary)]">
                  <span>Regression</span>
                </div>
                <div className="text-[10px] font-mono text-[var(--story-text-secondary)] mt-1">
                  Predict continuous values
                </div>
                <div className="mt-2 text-[9px] font-mono text-[var(--story-text-muted)] uppercase">
                  OVERRIDABLE
                </div>
              </div>
            </div>
          </div>

          {/* Primary Optimization Metric Selection */}
          <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[var(--story-text-secondary)] uppercase">
                OPTIMIZATION METRIC
              </div>
              <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] mt-0.5">
                Macro F1 Score (Harmonic Mean of Precision &amp; Recall)
              </div>
            </div>
            <div className="font-mono text-[10px] font-bold text-[var(--story-accent-blue)] bg-[var(--story-surface-subtle)] px-2 py-1 rounded border border-[var(--story-border)]">
              STRATIFIED 5-FOLD
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div>Target Confirmed: Churn · Metric: Macro F1 · CV: 5-Fold Stratified</div>
        <div className="text-[var(--story-accent-teal)] font-bold">● Configuration Sealed for Training</div>
      </div>
    </div>
  );
}
