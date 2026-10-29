"use client";

import { Sparkles, Compass, Lightbulb } from "lucide-react";
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
    <Card className="p-4 sm:p-5 space-y-4 border border-border bg-surface">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-accent/10 text-accent">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Modeling Goal & Desired Output
            </h4>
            <p className="text-xs text-text-muted">
              Tell the AI what you want to predict. It will automatically engineer domain features and select models matching your goal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono text-[11px]">Powered by Local Ollama (qwen2.5:3b)</span>
        </div>
      </div>

      {/* Input Textarea */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isStreaming}
            placeholder="e.g., I want to predict whether a customer will churn next month, extracting tenure and activity frequency from the timestamp..."
            rows={2}
            className="w-full rounded-md border border-border bg-surface-subtle p-3 text-xs text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none transition-colors"
          />
        </div>

        {/* Example Prompt Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Lightbulb className="w-3 h-3 text-warning" />
            <span>Example objectives:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_OBJECTIVES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(example)}
                disabled={disabled || isStreaming}
                className="text-[11px] px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-subtle/80 text-text-secondary border border-border transition-colors text-left"
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
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isStreaming ? "AI Reasoning in Progress..." : "Formulate with AI"}</span>
        </Button>
      </div>
    </Card>
  );
}

