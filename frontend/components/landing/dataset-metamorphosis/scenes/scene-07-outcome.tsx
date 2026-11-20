"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package, Download, Terminal, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Scene07Outcome() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-teal)]">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] flex items-center gap-2">
              <span>SERIALIZED MODEL ARTIFACT &amp; AUDIT TRAIL</span>
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              Production-Ready .joblib Pipeline + Immutable Reproducibility Log
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--story-accent-teal)]/10 border border-[var(--story-accent-teal)]/40 font-mono text-[10px] text-[var(--story-accent-teal)] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>REPRODUCIBILITY SEALED</span>
        </div>
      </div>

      {/* 3 Outcome Pillars Grid */}
      <div className="my-auto py-2 grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Pillar A: Prediction Engine */}
        <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 flex flex-col justify-between shadow-sm space-y-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--story-accent-blue)] font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>A. INFERENCE ENGINE</span>
            </div>
            <div className="mt-2 p-2 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[11px] space-y-1">
              <div className="text-[var(--story-text-secondary)]">Single &amp; Batch CSV:</div>
              <div className="font-bold text-[var(--story-text-primary)]">Input: Tenure=36, Total=$2,400</div>
              <div className="text-[var(--story-accent-teal)] font-bold">→ Predicted: No Churn (92.4%)</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[var(--story-text-secondary)]">
            Uses identical in-fold transformation pipeline.
          </div>
        </div>

        {/* Pillar B: Immutable Audit Trail */}
        <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 flex flex-col justify-between shadow-sm space-y-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--story-accent-teal)] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>B. AUDIT &amp; GOVERNANCE</span>
            </div>
            <div className="mt-2 p-2 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[11px] space-y-1 text-[var(--story-text-secondary)]">
              <div>Seed: <span className="text-[var(--story-text-primary)] font-bold">42</span> · Folds: <span className="text-[var(--story-text-primary)] font-bold">5</span></div>
              <div>Framework: <span className="text-[var(--story-text-primary)] font-bold">scikit-learn 1.4</span></div>
              <div>Audit Fingerprint: <span className="text-[var(--story-accent-blue)] font-bold">4f8a...c19d</span></div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[var(--story-text-secondary)]">
            Every heuristic and seed stored for complete model reproducibility.
          </div>
        </div>

        {/* Pillar C: Serialized Artifact Export */}
        <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 flex flex-col justify-between shadow-sm space-y-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--story-accent-amber)] font-bold">
              <FileCode className="w-3.5 h-3.5" />
              <span>C. ARTIFACT DOWNLOAD</span>
            </div>
            <div className="mt-2 p-2 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[11px] space-y-1">
              <div className="font-bold text-[var(--story-text-primary)]">model.joblib (14.2 MB)</div>
              <div className="text-[var(--story-text-secondary)]">evaluation_report.json</div>
              <div className="text-[var(--story-accent-teal)] font-semibold">● Ready for Python import</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[var(--story-text-secondary)]">
            Self-contained pipeline ready for production.
          </div>
        </div>

      </div>

      {/* Bottom Closing Callout & Primary CTA */}
      <div className="border-t border-[var(--story-border)] pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="font-display text-sm sm:text-base font-bold text-[var(--story-text-primary)]">
            Your data. Your experiments. Your model.
          </div>
          <p className="text-[11px] font-sans text-[var(--story-text-secondary)]">
            From raw spreadsheet upload to reproducible predictions in one coherent workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              size="sm"
              className="h-9 px-4 text-xs font-mono font-bold bg-[var(--story-accent-blue)] text-white shadow-neo hover:shadow-neo-lg transition-all rounded-lg"
            >
              <span>Start Your First Project</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
