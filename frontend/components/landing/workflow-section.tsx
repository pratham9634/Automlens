"use client";

import { UploadCloud, Sliders, PlayCircle, BarChart3, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    icon: UploadCloud,
    title: "Ingest & Profile",
    desc: "Upload CSV or Excel files. Generates statistical health scores, missingness profiles, and column typing.",
  },
  {
    step: "02",
    icon: Sliders,
    title: "AI Strategy Formulation",
    desc: "Specify target and business goals. Gemini 2.0 Flash formulates pipeline steps, feature extraction, and model candidates.",
  },
  {
    step: "03",
    icon: PlayCircle,
    title: "5-Fold CV Training",
    desc: "Parallel multi-core training executes across models. Real-time SSE telemetry streams fold metrics and progress.",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "SHAP & Batch Inference",
    desc: "Inspect champion model leaderboard, interpret Tree SHAP attributions, and run batch predictions with CSV export.",
  },
];

export function WorkflowSection() {
  return (
    <section id="pipeline" className="py-16 sm:py-24 border-b-2 border-border bg-surface-subtle/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="neutral" className="font-mono text-xs mb-3 shadow-neo-sm">
            {"// END-TO-END PIPELINE"}
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3">
            From Raw Tabular Data to Audited Deployment
          </h2>
          <p className="text-sm text-text-secondary font-sans max-w-xl mx-auto">
            A guided 4-step human-assisted workflow that balances automation with explicit user confirmation.
          </p>
        </div>

        {/* 4-Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-xl border-2 border-border bg-surface shadow-neo hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono font-black text-xl text-accent">
                      {s.step}
                    </span>
                    <div className="p-2 rounded-md border-2 border-border bg-canvas shadow-neo-sm">
                      <Icon className="w-4 h-4 text-text-primary" />
                    </div>
                  </div>
                  <h3 className="font-display text-base font-bold text-text-primary mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
