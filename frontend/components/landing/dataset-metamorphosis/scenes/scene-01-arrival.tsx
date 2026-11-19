"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, TableProperties, CheckCircle2, AlertCircle } from "lucide-react";
import { DEMO_DATASET_ROWS } from "../story-data";

export function Scene01Arrival() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-7">
      {/* Top Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--story-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--story-surface-subtle)] border border-[var(--story-border)] flex items-center justify-center text-[var(--story-accent-blue)]">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[var(--story-text-primary)] flex items-center gap-1.5">
              <span>customer_churn.csv</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--story-accent-teal)]" />
            </div>
            <div className="text-[11px] font-mono text-[var(--story-text-secondary)]">
              10,000 rows × 18 columns · 2.4 MB · UTF-8
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--story-text-secondary)]">
          <span className="px-2 py-0.5 rounded bg-[var(--story-surface-subtle)] border border-[var(--story-border)] font-semibold">
            STATUS: INGESTION STABLE
          </span>
        </div>
      </div>

      {/* The Raw Spreadsheet Canvas */}
      <div className="my-auto py-2 overflow-x-auto">
        <div className="min-w-[480px] rounded-lg border border-[var(--story-border)] bg-[var(--story-surface)] overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-6 bg-[var(--story-surface-subtle)] border-b border-[var(--story-border)] text-[10px] sm:text-xs font-mono font-bold text-[var(--story-text-primary)]">
            <div className="p-2.5 border-r border-[var(--story-border)]">tenure</div>
            <div className="p-2.5 border-r border-[var(--story-border)]">monthly_charges</div>
            <div className="p-2.5 border-r border-[var(--story-border)]">total_charges</div>
            <div className="p-2.5 border-r border-[var(--story-border)]">contract</div>
            <div className="p-2.5 border-r border-[var(--story-border)]">internet</div>
            <div className="p-2.5 text-[var(--story-accent-blue)]">churn (target)</div>
          </div>

          {/* Table Rows with subtle entry animation */}
          {DEMO_DATASET_ROWS.map((row, idx) => {
            const isMissing = row.total === "NaN";
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                className={`grid grid-cols-6 border-b border-[var(--story-border)] last:border-b-0 text-[11px] font-mono ${
                  idx % 2 === 1 ? "bg-[var(--story-surface-subtle)]/40" : "bg-[var(--story-surface)]"
                }`}
              >
                <div className="p-2.5 border-r border-[var(--story-border)] text-[var(--story-text-primary)]">
                  {row.tenure} mo
                </div>
                <div className="p-2.5 border-r border-[var(--story-border)] text-[var(--story-text-primary)]">
                  ${row.monthly.toFixed(2)}
                </div>
                <div className="p-2.5 border-r border-[var(--story-border)] relative">
                  {isMissing ? (
                    <span className="inline-flex items-center gap-1 text-[var(--story-accent-amber)] font-bold bg-[var(--story-accent-amber)]/10 px-1.5 py-0.5 rounded text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      <span>NaN (missing)</span>
                    </span>
                  ) : (
                    <span className="text-[var(--story-text-primary)]">${row.total}</span>
                  )}
                </div>
                <div className="p-2.5 border-r border-[var(--story-border)] truncate text-[var(--story-text-secondary)]">
                  {row.contract}
                </div>
                <div className="p-2.5 border-r border-[var(--story-border)] truncate text-[var(--story-text-secondary)]">
                  {row.internet}
                </div>
                <div className="p-2.5 font-bold text-[var(--story-accent-blue)]">
                  {row.churn}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Ingestion Annotation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--story-border)] pt-2.5 text-[11px] font-mono text-[var(--story-text-secondary)]">
        <div className="flex items-center gap-1.5 text-[var(--story-accent-teal)]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-semibold">Immutable Fingerprint Generated</span>
        </div>
        <div>SHA-256: 4f8a...c19d</div>
      </div>
    </div>
  );
}
