"use client";

import { BrainCircuit, ShieldCheck, Cpu, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: BrainCircuit,
    title: "Hybrid AI Decision Engine",
    subtitle: "Google Gemini 2.0 Flash + Deterministic Heuristics",
    description:
      "Formulates tailored ML strategies from your business objectives. Translates plain English goals into pipeline hyperparameters, candidate algorithms, and feature engineering recommendations with live SSE token streaming.",
    badge: "AI Powered",
    accent: "bg-pastel-cyan/30 text-cyan-900 dark:text-cyan-300",
  },
  {
    icon: ShieldCheck,
    title: "Strict Leakage Prevention",
    subtitle: "sklearn.Pipeline Inside Every CV Fold",
    description:
      "Zero data contamination guaranteed. All imputation, encoding, scaling, and feature selection occur strictly within each cross-validation fold. Defends your project with 100% academic rigor during viva defense.",
    badge: "Leakage Safe",
    accent: "bg-pastel-amber/30 text-amber-900 dark:text-amber-300",
  },
  {
    icon: Cpu,
    title: "Multi-Core Parallel Training",
    subtitle: "5-Fold CV via ProcessPoolExecutor",
    description:
      "Parallel multi-process execution across candidate models (LightGBM, Random Forest, Logistic Regression, Dummy Baseline). Real-time telemetry streams training progress fold-by-fold via Server-Sent Events.",
    badge: "High Performance",
    accent: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300",
  },
  {
    icon: History,
    title: "Explainability & Audit Ledger",
    subtitle: "Tree SHAP & Immutable Action Ledger",
    description:
      "Understand why models make decisions with global feature importance and local SHAP waterfalls. Every user action, dataset upload, AI rationale, and training event is recorded in a tamper-resistant PostgreSQL audit log.",
    badge: "Reproducible",
    accent: "bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 border-b-2 border-border bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="neutral" className="font-mono text-xs mb-3 shadow-neo-sm">
            {"// CORE ARCHITECTURE"}
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3">
            Engineered for Academic Rigor & Transparency
          </h2>
          <p className="text-sm text-text-secondary font-sans max-w-2xl mx-auto">
            Unlike black-box commercial AutoML tools, AutoMLens makes every preprocessing decision, model choice, and evaluation metric verifiable and explainable.
          </p>
        </div>

        {/* 4-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-xl border-2 border-border bg-surface shadow-neo hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg border-2 border-border bg-canvas shadow-neo-sm">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-border ${f.accent}`}
                    >
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-text-primary mb-1">
                    {f.title}
                  </h3>
                  <div className="text-xs font-mono font-bold text-accent mb-3">
                    {f.subtitle}
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                    {f.description}
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
