"use client";

import React from "react";
import { motion } from "framer-motion";
import { Eye, ShieldAlert, CheckCircle2, Info, Sparkles } from "lucide-react";
import { SHAP_FEATURE_ITEMS } from "../story-data";

export function Scene06Explanation() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-teal)]">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] flex items-center gap-2">
              <span>SHAP FEATURE ATTRIBUTION (TreeExplainer)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] text-[var(--story-text-secondary)]">
                100 Sample Points
              </span>
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              Model Introspection: HistGradientBoosting internal decision attribution
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-mono text-[10px] text-[var(--story-text-secondary)]">
          <Info className="w-3.5 h-3.5 text-[var(--story-accent-blue)]" />
          <span>Rule 10: Explains Behavior, Not Causation</span>
        </div>
      </div>

      {/* Central SHAP Attribution Breakdown */}
      <div className="my-auto py-2 space-y-2.5">
        
        {/* SHAP Axis Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono border-b border-[var(--story-border)] pb-1.5 text-[var(--story-text-secondary)]">
          <div className="flex items-center gap-1.5 text-[var(--story-accent-teal)] font-bold">
            <span className="w-2 h-2 rounded-full bg-[var(--story-accent-teal)]" />
            <span>Positive Attribution (+Push toward Retention)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--story-accent-amber)] font-bold">
            <span>Negative Attribution (-Push toward Churn)</span>
            <span className="w-2 h-2 rounded-full bg-[var(--story-accent-amber)]" />
          </div>
        </div>

        {/* Feature Attribution Rows */}
        <div className="space-y-2">
          {SHAP_FEATURE_ITEMS.map((item, idx) => {
            const isPositive = item.direction === "positive";
            const absVal = Math.abs(parseFloat(item.impact));

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: isPositive ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="rounded-md border border-[var(--story-border)] bg-[var(--story-surface)] p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs font-mono shadow-xs"
              >
                {/* Feature Name */}
                <div className="w-48 truncate">
                  <span className="font-bold text-[var(--story-text-primary)]">{item.name}</span>
                </div>

                {/* Bi-Directional Impact Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[var(--story-surface-subtle)] overflow-hidden border border-[var(--story-border)] relative">
                    <div
                      className={`h-full rounded-full ${
                        isPositive ? "bg-[var(--story-accent-teal)] ml-auto" : "bg-[var(--story-accent-amber)] mr-auto"
                      }`}
                      style={{ width: `${absVal * 200}%` }}
                    />
                  </div>
                  <span
                    className={`font-mono text-[11px] font-bold w-12 text-right ${
                      isPositive ? "text-[var(--story-accent-teal)]" : "text-[var(--story-accent-amber)]"
                    }`}
                  >
                    {item.impact}
                  </span>
                </div>

                {/* Subtext description */}
                <div className="text-[10px] text-[var(--story-text-secondary)] hidden lg:block w-64 truncate text-right">
                  {item.desc}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Bottom Disclaimer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div>Top Predictor: Tenure (+0.34 Mean |SHAP|) · Validated with TreeExplainer</div>
        <div className="text-[var(--story-accent-blue)] font-bold">● Resolving to Prediction &amp; Export</div>
      </div>
    </div>
  );
}
