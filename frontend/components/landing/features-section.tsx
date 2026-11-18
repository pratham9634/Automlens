"use client";

import { motion } from "framer-motion";
import { BrainCircuit, ShieldCheck, Cpu, History, Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: BrainCircuit,
    title: "Hybrid AI Decision Engine",
    subtitle: "Google Gemini 2.0 Flash + Offline Heuristics",
    description:
      "Formulates tailored ML strategies from your business objectives. Translates plain English goals into pipeline hyperparameters, candidate algorithms, and feature engineering recommendations with live SSE token streaming.",
    badge: "AI Powered",
    accent: "bg-pastel-cyan/30 text-cyan-950 dark:text-cyan-200 border-cyan-400/40",
    glow: "hover:shadow-neo-cyan",
  },
  {
    icon: ShieldCheck,
    title: "Strict Leakage Prevention",
    subtitle: "sklearn.Pipeline Inside Every CV Fold",
    description:
      "Zero data contamination guaranteed. All imputation, encoding, scaling, and feature selection occur strictly within each cross-validation fold. Defends your project with 100% academic rigor during viva defense.",
    badge: "Leakage Safe",
    accent: "bg-pastel-amber/30 text-amber-950 dark:text-amber-200 border-amber-400/40",
    glow: "hover:shadow-neo-amber",
  },
  {
    icon: Cpu,
    title: "Multi-Core Parallel Training",
    subtitle: "5-Fold CV via ProcessPoolExecutor",
    description:
      "Parallel multi-process execution across candidate models (LightGBM, Random Forest, Logistic Regression, Dummy Baseline). Real-time telemetry streams training progress fold-by-fold via Server-Sent Events.",
    badge: "Multi-Process",
    accent: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-400/40",
    glow: "hover:shadow-neo",
  },
  {
    icon: History,
    title: "Explainability & Audit Ledger",
    subtitle: "Tree SHAP & Immutable Action Ledger",
    description:
      "Understand why models make decisions with global feature importance and local SHAP waterfalls. Every user action, dataset upload, AI rationale, and training event is recorded in a tamper-resistant PostgreSQL audit log.",
    badge: "Full Transparency",
    accent: "bg-purple-100 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 border-purple-400/40",
    glow: "hover:shadow-neo",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 border-b-2 border-border bg-canvas relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>CHAPTER 04 // THE ARCHITECTURAL PILLARS</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-2 ml-1">★ 4 Pillars</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Engineered for{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              Scientific Rigor
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Unlike black-box commercial AutoML tools, AutoMLens makes every preprocessing decision, model choice, and evaluation metric verifiable and explainable.
            <span className="block font-marker text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              ✏️ Transparent code beats proprietary black-box promises every time.
            </span>
          </p>
        </div>

        {/* 4-Card Bento Grid with Framer Motion Bounce */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 20,
                  delay: i * 0.08,
                }}
                whileHover={{
                  y: -6,
                  scale: 1.015,
                  transition: { type: "spring", stiffness: 400, damping: 15 },
                }}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-border bg-surface shadow-neo transition-all flex flex-col justify-between ${f.glow}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <motion.div
                      whileHover={{ rotate: 12, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 450, damping: 12 }}
                      className="p-3.5 rounded-xl border-2 border-border bg-canvas shadow-neo-sm cursor-pointer"
                    >
                      <Icon className="w-6 h-6 text-accent" />
                    </motion.div>
                    <span
                      className={`text-[12px] font-marker font-bold px-2.5 py-0.5 rounded-md border ${f.accent} shadow-sm`}
                    >
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-text-primary mb-1">
                    {f.title}
                  </h3>
                  <div className="text-sm font-marker font-bold text-accent mb-2.5">
                    {f.subtitle}
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                    {f.description}
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
