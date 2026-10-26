"use client";

import { PreprocessingStep } from "@/lib/types";
import { Layers, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PreprocessingPipelineCardProps {
  steps: PreprocessingStep[];
}

export function PreprocessingPipelineCard({ steps }: PreprocessingPipelineCardProps) {
  const getStepBadge = (type: string) => {
    switch (type) {
      case "imputation":
        return <Badge variant="info" size="sm">Imputation</Badge>;
      case "scaling":
        return <Badge variant="success" size="sm">Scaling</Badge>;
      case "encoding":
        return <Badge variant="accent" size="sm">Encoding</Badge>;
      case "drop":
        return <Badge variant="danger" size="sm">Exclusion</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="card-title text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <span>Formulated Preprocessing Pipeline</span>
            <Badge variant="success" size="sm" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              Rule 1: Fold-Safe (CV Fold Encapsulated)
            </Badge>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Transformations derived by deterministic heuristic rules. All fit transformations occur strictly inside cross-validation splits to prevent lookahead bias.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, idx) => (
          <div
            key={`${step.column}-${step.step_type}-${idx}`}
            className="p-3.5 rounded-card bg-surface-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-border-strong transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-text-primary">
                  {step.column}
                </span>
                {getStepBadge(step.step_type)}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pill bg-surface text-text-muted border border-border">
                  strategy: {step.strategy}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {step.reason}
              </p>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="p-6 text-center text-xs font-mono text-text-muted">
            No transformations needed for selected feature set.
          </div>
        )}
      </div>
    </Card>
  );
}
