"use client";

import { Sparkles, Cpu, Target, ShieldCheck, Award, HelpCircle } from "lucide-react";

interface AiRationalePanelProps {
  rationale: string;
  isLlmEnriched: boolean;
}

export function AiRationalePanel({ rationale, isLlmEnriched }: AiRationalePanelProps) {
  return (
    <div className="p-6 rounded-xl border border-hairline bg-surface-1 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-hover" />
            <span>AI Decision Engine: Transparent Explanation</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Clear, non-technical reasoning explaining what we are predicting, how data is cleaned, and why these models were chosen.
          </p>
        </div>

        <div>
          {isLlmEnriched ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3 h-3 text-purple-400" />
              LLM Enriched (Llama-3.3-70B)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30">
              <Cpu className="w-3 h-3 text-sky-400" />
              Expert Heuristic Engine (100% Offline)
            </span>
          )}
        </div>
      </div>

      {/* 3 Quick Layman Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-hairline space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Target className="w-3.5 h-3.5 text-brand-hover" />
            <span>1. Clear Goal</span>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Identifies the prediction target and automatically selects the most honest evaluation metric so the model cannot cheat on rare classes.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-hairline space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Zero Data Leakage</span>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Rule 1 compliance: data transformations are isolated per fold. The AI never sees test questions ahead of time.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-hairline space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>3. Scientific Control</span>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Rule 4 compliance: includes a naive Dummy baseline (like a medical placebo) to prove our real models are genuinely learning.
          </p>
        </div>
      </div>

      {/* Main Narrative Explanation */}
      <div className="p-4 rounded-lg bg-surface-2/40 border border-hairline space-y-3 text-xs leading-relaxed text-ink-muted">
        {rationale.split("\n\n").map((para, idx) => {
          // If paragraph has bullet points, format them cleanly
          if (para.includes("•")) {
            const lines = para.split("\n");
            const heading = lines[0];
            const bullets = lines.slice(1);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="text-xs font-semibold text-ink">{heading}</div>
                <div className="space-y-1 pl-2">
                  {bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="text-[11px] text-ink-muted leading-relaxed">
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <p key={idx} className="whitespace-pre-line text-[11px] text-ink-muted leading-relaxed">
              {para}
            </p>
          );
        })}
      </div>
    </div>
  );
}
