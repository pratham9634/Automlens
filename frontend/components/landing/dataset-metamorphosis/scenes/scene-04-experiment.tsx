"use client";

import React from "react";
import { motion } from "framer-motion";
import { GitBranch, Cpu, ShieldCheck, CheckCircle2, Lock, Workflow } from "lucide-react";

export function Scene04Experiment() {
  const folds = [
    { id: "01", name: "Fold 01", split: "80% Train / 20% Val", score: "F1: 0.858", status: "Validated" },
    { id: "02", name: "Fold 02", split: "80% Train / 20% Val", score: "F1: 0.865", status: "Validated" },
    { id: "03", name: "Fold 03", split: "80% Train / 20% Val", score: "F1: 0.860", status: "Validated" },
    { id: "04", name: "Fold 04", split: "80% Train / 20% Val", score: "F1: 0.864", status: "Validated" },
    { id: "05", name: "Fold 05", split: "80% Train / 20% Val", score: "F1: 0.863", status: "Validated" },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-teal)]">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] flex items-center gap-2">
              <span>COMPUTATIONAL CROSS-VALIDATION GRAPH</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] text-[var(--story-accent-blue)]">
                StratifiedKFold (k=5)
              </span>
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              Rule 1: In-Fold Preprocessing Pipeline · Zero Validation Leakage
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--story-accent-teal)] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>LEAKAGE-SAFE PIPELINE FIT</span>
        </div>
      </div>

      {/* Central Computational Graph Visualization */}
      <div className="my-auto py-2 space-y-3">
        
        {/* Architectural Explanatory Pill */}
        <div className="p-2 rounded-md bg-[var(--story-surface-subtle)] border border-[var(--story-border)] text-[10px] font-mono text-[var(--story-text-secondary)] flex items-center justify-between">
          <span>DATASET SPLIT $\rightarrow$ FIT PREPROCESSING ON TRAIN $\rightarrow$ FIT ESTIMATORS $\rightarrow$ EVALUATE VALIDATION</span>
          <span className="font-bold text-[var(--story-text-primary)]">sklearn.pipeline.Pipeline</span>
        </div>

        {/* 5 Distinct Folds Pipeline Grid */}
        <div className="space-y-2">
          {folds.map((fold, idx) => (
            <motion.div
              key={fold.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="rounded-md border border-[var(--story-border)] bg-[var(--story-surface)] p-2.5 flex items-center justify-between text-xs font-mono shadow-xs hover:border-[var(--story-accent-blue)]/50 transition-colors"
            >
              {/* Fold Identifier & Partition Tag */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-[var(--story-text-primary)] text-xs">
                  {fold.name}
                </span>
                <span className="text-[10px] text-[var(--story-text-secondary)] hidden sm:inline">
                  {fold.split}
                </span>
              </div>

              {/* In-Fold Pipeline Operations (Encapsulated) */}
              <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[var(--story-text-secondary)]">
                <span className="px-1.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)]">
                  MedianImputer
                </span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)]">
                  OneHotEncoder
                </span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)]">
                  StandardScaler
                </span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--story-accent-teal)]/10 text-[var(--story-accent-teal)] border border-[var(--story-accent-teal)]/30 font-bold">
                  Estimator
                </span>
              </div>

              {/* Resulting Fold Score */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--story-text-primary)]">
                  {fold.score}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--story-accent-teal)]" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Candidate Estimator Fleet Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px] text-[var(--story-text-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--story-text-primary)]">Candidates:</span>
            <span>HistGradientBoosting · Random Forest · Logistic Regression · </span>
            <span className="text-[var(--story-accent-amber)] font-bold">DummyClassifier (Baseline)</span>
          </div>
          <div className="text-[var(--story-accent-blue)] font-bold">ProcessPoolExecutor (4 Workers)</div>
        </div>

      </div>

      {/* Bottom Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div>5 Folds Evaluated · Mean F1: 0.862 ± 0.003 · Zero Leakage Confirmed</div>
        <div className="text-[var(--story-accent-teal)] font-bold">● Converging to Leaderboard</div>
      </div>
    </div>
  );
}
