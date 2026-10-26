"use client";

import { Sparkles, Cpu, Target, ShieldCheck, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AiRationalePanelProps {
  rationale: string;
  isLlmEnriched: boolean;
}

export function AiRationalePanel({ rationale, isLlmEnriched }: AiRationalePanelProps) {
  return (
    <Card className="p-4 sm:p-5 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>AI Decision Engine: Engineering Rationale</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Transparent, defensible reasoning explaining target formulation, preprocessing choices, and candidate selection.
          </p>
        </div>

        <div>
          {isLlmEnriched ? (
            <Badge variant="accent" className="gap-1.5 font-mono">
              <Sparkles className="w-3 h-3 text-accent" />
              LLM Enriched (Llama-3.3-70B)
            </Badge>
          ) : (
            <Badge variant="info" className="gap-1.5 font-mono">
              <Cpu className="w-3 h-3 text-info" />
              Deterministic Rule Engine (100% Offline)
            </Badge>
          )}
        </div>
      </div>

      {/* 3 Academic Principle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Target className="w-3.5 h-3.5 text-accent" />
            <span>1. Objective Metric</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Identifies target task type and sets an honest evaluation metric (e.g. F1-macro or R²) so models cannot cheat on imbalanced distributions.
          </p>
        </div>

        <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>2. Fold-Safe Preprocessing</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Rule 1 compliance: data transformations are fit exclusively on training folds to guarantee zero test set leakage.
          </p>
        </div>

        <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Award className="w-3.5 h-3.5 text-warning" />
            <span>3. Scientific Control</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Rule 4 compliance: includes a naive Dummy baseline (placebo benchmark) to mathematically verify that real models are learning patterns.
          </p>
        </div>
      </div>

      {/* Main Narrative Explanation */}
      <div className="p-4 rounded-card bg-surface-subtle/60 border border-border space-y-3 text-xs leading-relaxed text-text-secondary">
        {rationale.split("\n\n").map((para, idx) => {
          if (para.includes("•")) {
            const lines = para.split("\n");
            const heading = lines[0];
            const bullets = lines.slice(1);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="text-xs font-semibold text-text-primary">{heading}</div>
                <div className="space-y-1 pl-2">
                  {bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="text-[11px] text-text-muted leading-relaxed">
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <p key={idx} className="whitespace-pre-line text-[11px] text-text-secondary leading-relaxed">
              {para}
            </p>
          );
        })}
      </div>
    </Card>
  );
}
