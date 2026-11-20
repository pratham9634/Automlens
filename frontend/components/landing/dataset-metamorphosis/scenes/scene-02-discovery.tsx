"use client";

import React from "react";
import { motion } from "framer-motion";
import { BarChart3, AlertTriangle, Layers, CheckCircle2 } from "lucide-react";

export function Scene02Discovery() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Profiling Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-teal)]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)]">
              FEATURE PROFILING MATRIX
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              18 Features Evaluated · Statistical Distributions &amp; Anomaly Detection
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[10px] text-[var(--story-accent-teal)] font-semibold">
          <CheckCircle2 className="w-3 h-3" />
          <span>ZERO PREPROCESSING LEAKAGE</span>
        </div>
      </div>

      {/* Analytical Visualizations Grid */}
      <div className="my-auto py-2 grid grid-cols-1 md:grid-cols-12 gap-3.5">
        
        {/* Primary Visualization: Numerical Distribution Curve for MonthlyCharges (7 cols) */}
        <div className="md:col-span-7 rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="font-bold text-[var(--story-text-primary)]">
              DISTRIBUTION: monthly_charges
            </span>
            <span className="text-[10px] text-[var(--story-text-secondary)]">
              Skewness: +0.48 (Moderate Right)
            </span>
          </div>

          {/* SVG Density Histogram */}
          <div className="relative h-28 w-full flex items-end justify-between gap-1 pt-2">
            {/* SVG Histogram Bars */}
            {[24, 38, 72, 85, 62, 45, 90, 78, 65, 34, 18, 12].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className={`flex-1 rounded-t transition-colors ${
                  i >= 10
                    ? "bg-[var(--story-accent-amber)] opacity-90"
                    : "bg-[var(--story-accent-blue)]/70 hover:bg-[var(--story-accent-blue)]"
                }`}
                title={`Bin ${i + 1}: ${height}% density`}
              />
            ))}

            {/* Outlier Threshold Line */}
            <div className="absolute right-4 top-2 bottom-0 border-r-2 border-dashed border-[var(--story-accent-amber)] flex items-start justify-end pr-1.5 pointer-events-none">
              <span className="text-[9px] font-mono font-bold text-[var(--story-accent-amber)] bg-[var(--story-surface)] px-1 rounded border border-[var(--story-accent-amber)]/40 shadow-xs">
                IQR Outlier Cutoff ($115.00)
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--story-text-secondary)] border-t border-[var(--story-border)] pt-1.5">
            <span>Min: $18.25</span>
            <span>Median: $70.35</span>
            <span>Max: $118.75</span>
          </div>
        </div>

        {/* Secondary Visualizations: Missing Value + Anomaly Traps (5 cols) */}
        <div className="md:col-span-5 space-y-3 flex flex-col justify-between">
          
          {/* Missing Value Indicator */}
          <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="font-bold text-[var(--story-text-primary)]">
                MISSING CELL AUDIT
              </span>
              <span className="text-[10px] font-mono text-[var(--story-accent-amber)] font-bold">
                11 Nulls (0.11%)
              </span>
            </div>

            <div className="w-full bg-[var(--story-surface-subtle)] rounded-full h-2 overflow-hidden border border-[var(--story-border)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "99.89%" }}
                transition={{ duration: 0.5 }}
                className="bg-[var(--story-accent-teal)] h-full"
              />
            </div>
            
            <div className="mt-1.5 text-[10px] font-mono text-[var(--story-text-secondary)]">
              Target: <span className="font-semibold text-[var(--story-text-primary)]">total_charges</span> · Rule: In-Fold Median Imputation
            </div>
          </div>

          {/* Outlier & Cardinality Tag */}
          <div className="rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] p-3 shadow-sm space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--story-accent-amber)]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>OUTLIER DETECTION (Rule 6)</span>
            </div>
            <p className="text-[11px] font-sans text-[var(--story-text-secondary)] leading-tight">
              24 extreme data points flagged in Monthly Charges. Preserved for operator review; never automatically purged.
            </p>
          </div>

        </div>

      </div>

      {/* Bottom Profiling Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div>18 Features: 12 Numerical, 5 Categorical, 1 Target Candidate</div>
        <div className="text-[var(--story-accent-blue)] font-bold">● Ready for Task Selection</div>
      </div>
    </div>
  );
}
