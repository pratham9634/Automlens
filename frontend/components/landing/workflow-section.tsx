"use client";

import { motion } from "framer-motion";
import { UploadCloud, Sliders, PlayCircle, BarChart3, ArrowRight, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    icon: UploadCloud,
    title: "Ingest & Profile",
    desc: "Upload CSV or Excel files. Generates statistical health scores, missingness profiles, and column typing.",
    tag: "Data Quality",
  },
  {
    step: "02",
    icon: Sliders,
    title: "AI Strategy Formulation",
    desc: "Specify target and business goals. Gemini 2.0 Flash formulates pipeline steps, feature extraction, and candidate models.",
    tag: "Gemini Copilot",
  },
  {
    step: "03",
    icon: PlayCircle,
    title: "5-Fold CV Training",
    desc: "Parallel multi-core training executes across models. Real-time SSE telemetry streams fold metrics and progress.",
    tag: "Multi-Process",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "SHAP & Batch Inference",
    desc: "Inspect champion model leaderboard, interpret Tree SHAP attributions, and run batch predictions with CSV export.",
    tag: "Deployment",
  },
];

export function WorkflowSection() {
  return (
    <section id="pipeline" className="py-20 sm:py-28 border-b-2 border-border bg-surface-subtle/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Route className="w-3.5 h-3.5" />
            <span>CHAPTER 05 // THE END-TO-END PIPELINE</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            From Raw Tabular Data to Audited Model
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-xl mx-auto">
            A transparent 4-stage pipeline where human oversight and machine learning automation work in tandem.
          </p>
        </div>

        {/* 4-Step Animated Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 20,
                  delay: idx * 0.1,
                }}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 450, damping: 14 },
                }}
                className="p-6 rounded-2xl border-2 border-border bg-surface shadow-neo hover:shadow-neo-lg transition-all flex flex-col justify-between cursor-default"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono font-black text-2xl text-accent">
                      {s.step}
                    </span>
                    <div className="p-2.5 rounded-lg border-2 border-border bg-canvas shadow-neo-sm">
                      <Icon className="w-4 h-4 text-text-primary" />
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-border inline-block mb-2">
                    {s.tag}
                  </span>

                  <h3 className="font-display text-lg font-bold text-text-primary mb-2">
                    {s.title}
                  </h3>

                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
