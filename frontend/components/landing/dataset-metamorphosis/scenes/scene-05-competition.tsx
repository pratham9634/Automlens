"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Award, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { LEADERBOARD_ROWS } from "../story-data";

export function Scene05Competition() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Leaderboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-teal)]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] flex items-center gap-2">
              <span>EVALUATION LEADERBOARD &amp; BASELINE AUDIT</span>
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              Ranked by Mean Macro F1 across 5 Stratified Folds (Rule 4 Baseline Comparison)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[10px] text-[var(--story-text-secondary)]">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--story-accent-teal)]" />
          <span>+48.2% LIFT OVER DUMMY BASELINE</span>
        </div>
      </div>

      {/* Analytical Leaderboard Table */}
      <div className="my-auto py-2 overflow-x-auto">
        <div className="min-w-[500px] rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] overflow-hidden shadow-sm">
          {/* Header Row */}
          <div className="grid grid-cols-12 bg-[var(--story-surface-subtle)] border-b border-[var(--story-border)] text-[10px] sm:text-xs font-mono font-bold text-[var(--story-text-primary)] p-2.5">
            <div className="col-span-1 text-center">RK</div>
            <div className="col-span-4">CANDIDATE MODEL</div>
            <div className="col-span-3">MACRO F1 SCORE</div>
            <div className="col-span-2">ACCURACY</div>
            <div className="col-span-2 text-right">CV STATUS</div>
          </div>

          {/* Model Rows */}
          {LEADERBOARD_ROWS.map((row, idx) => {
            const isChampion = row.isChampion;
            const isBaseline = row.family === "Baseline";

            return (
              <motion.div
                key={row.model}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`grid grid-cols-12 items-center p-2.5 border-b border-[var(--story-border)] last:border-b-0 text-xs font-mono transition-colors ${
                  isChampion
                    ? "bg-[var(--story-accent-teal)]/5 border-l-4 border-l-[var(--story-accent-teal)] font-semibold"
                    : isBaseline
                    ? "bg-[var(--story-surface-subtle)]/40 text-[var(--story-text-secondary)]"
                    : "bg-[var(--story-surface)]"
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 text-center font-bold">
                  {isChampion ? (
                    <span className="text-[var(--story-accent-teal)]">#01</span>
                  ) : (
                    <span className="text-[var(--story-text-muted)]">#{row.rank}</span>
                  )}
                </div>

                {/* Model Name */}
                <div className="col-span-4 flex items-center gap-2 truncate">
                  <span className="text-[var(--story-text-primary)] font-bold truncate">
                    {row.model}
                  </span>
                  {isChampion && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--story-accent-teal)] text-white">
                      CHAMPION
                    </span>
                  )}
                  {isBaseline && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] text-[var(--story-accent-amber)]">
                      BASELINE
                    </span>
                  )}
                </div>

                {/* Macro F1 Score with Visual Bar */}
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-16 bg-[var(--story-surface-subtle)] h-2 rounded-full overflow-hidden border border-[var(--story-border)]">
                    <div
                      className={`h-full ${
                        isChampion
                          ? "bg-[var(--story-accent-teal)]"
                          : isBaseline
                          ? "bg-[var(--story-accent-amber)]"
                          : "bg-[var(--story-accent-blue)]"
                      }`}
                      style={{ width: `${parseFloat(row.macroF1) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-[var(--story-text-primary)]">{row.macroF1}</span>
                </div>

                {/* Accuracy */}
                <div className="col-span-2 text-[var(--story-text-secondary)]">
                  {row.accuracy}
                </div>

                {/* CV Status */}
                <div className="col-span-2 text-right">
                  {isChampion ? (
                    <span className="inline-flex items-center gap-1 text-[var(--story-accent-teal)] text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{row.status}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--story-text-secondary)]">{row.status}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Annotation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div>Champion Selected: HistGradientBoosting · Surpasses Baseline by +48.2% F1</div>
        <div className="text-[var(--story-accent-teal)] font-bold">● Selected for Deep Explainability</div>
      </div>
    </div>
  );
}
