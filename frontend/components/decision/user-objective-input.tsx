"use client";

import { Sparkles, Compass, Lightbulb, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserObjectiveInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

const EXAMPLE_OBJECTIVES = [
  "Predict customer churn risk and extract tenure from signup date",
  "Forecast property sale prices and compute price-to-size interaction ratios",
  "Run PCA dimensionality reduction to compress wide feature space into principal components",
  "Classify transaction fraud with extreme sensitivity to false negatives",
  "Build an explainable linear baseline prioritizing high interpretability",
];

export function UserObjectiveInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isStreaming = false,
}: UserObjectiveInputProps) {
  return (
    <Card accentTop="cyan" className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-button bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.25)]">
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary font-sans flex items-center gap-2">
              Modeling Goal &amp; Desired Output
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                Objective Prompt
              </span>
            </h4>
            <p className="text-xs text-text-muted font-sans">
              State what you want to predict. The local AI will formulate domain feature extractions, PCA reductions, and candidate algorithms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-cyan-400">Local Ollama: qwen2.5:3b</span>
        </div>
      </div>

      {/* Input Textarea */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isStreaming}
            placeholder="e.g., I want to predict ticket fare, extract passenger family interactions, and run PCA dimensionality reduction on numeric features..."
            rows={2}
            className="w-full rounded-button border border-border/80 bg-surface-subtle p-3 text-xs text-text-primary font-mono placeholder:text-text-muted/60 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_8px_rgba(6,182,212,0.3)] resize-none transition-all duration-160"
          />
        </div>

        {/* Example Prompt Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono uppercase tracking-wider">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            <span>Example objectives:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_OBJECTIVES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(example)}
                disabled={disabled || isStreaming}
                className="text-[11px] font-mono px-2.5 py-1 rounded-pill bg-surface-subtle hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 text-text-secondary border border-border/80 transition-all duration-160 text-left cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end pt-1">
        <Button
          onClick={onSubmit}
          disabled={disabled || isStreaming}
          size="sm"
          className="gap-2 bg-accent text-white hover:bg-accent-hover hover:shadow-[0_0_12px_rgba(6,182,212,0.45)]"
        >
          <Wand2 className="w-3.5 h-3.5 text-white" />
          <span>{isStreaming ? "AI Reasoning in Progress..." : "Analyze Dataset & Plan Pipeline"}</span>
        </Button>
      </div>
    </Card>
  );
}
