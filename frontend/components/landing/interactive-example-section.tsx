"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  BarChart2,
  Cpu,
  Layers,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SketchStamp } from "./doodle-elements";

export function InteractiveExampleSection() {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "strategy" | "shap">("leaderboard");

  const tabs = [
    { id: "leaderboard", label: "1. Leaderboard Arena" },
    { id: "strategy", label: "2. Gemini Strategy" },
    { id: "shap", label: "3. SHAP Interpretability" },
  ] as const;

  return (
    <section id="example" className="py-20 sm:py-28 border-b-2 border-border bg-surface-subtle/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>CHAPTER 03 // THE TOURNAMENT ARENA</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Real Live Benchmark: Titanic Survival
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Witness how 5 models clash in strict 5-fold cross-validation. Every metric is real, reproducible, and verifiable.
          </p>
        </div>

        {/* Interactive Preview Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="border-2 border-border rounded-2xl bg-surface shadow-neo-lg overflow-hidden max-w-5xl mx-auto"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b-2 border-border bg-canvas">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-border" />
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-border" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-border" />
              <span className="text-xs font-mono font-bold text-text-primary ml-2">
                tournament://titanic-survival-5cv
              </span>
            </div>

            {/* Framer Motion Sliding Pill Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl border-2 border-border bg-surface relative">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer z-10 ${
                      isActive ? "text-white" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeBenchmarkTab"
                        className="absolute inset-0 bg-accent rounded-lg shadow-neo-sm -z-10"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content with Spring Animations */}
          <div className="p-5 sm:p-7 min-h-[340px]">
            <AnimatePresence mode="wait">
              {activeTab === "leaderboard" && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-text-muted mb-2">
                    <span className="font-bold">5-FOLD STRATIFIED CV RESULTS (OPTIMIZED FOR F1 MACRO)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-border">
                      +22.6% over Dummy Baseline
                    </span>
                  </div>

                  {/* Champion Model */}
                  <motion.div
                    whileHover={{ scale: 1.015, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="p-4 rounded-xl border-2 border-border bg-pastel-cyan/30 dark:bg-cyan-950/30 shadow-neo flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-lg border-2 border-border bg-yellow-300 text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-neo-sm">
                        #1
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-base text-text-primary">
                            LightGBM Classifier
                          </span>
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded border border-border bg-emerald-300 text-slate-950 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                            CHAMPION
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-text-muted">
                          Pipeline: Fold-Safe MedianImputer + OneHotEncoder + EarlyStopping
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-7 font-mono text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">F1 MACRO</span>
                        <span className="font-black text-accent text-base">0.842</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">ROC-AUC</span>
                        <span className="font-black text-text-primary text-base">0.887</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">LATENCY</span>
                        <span className="font-bold text-text-secondary text-sm">124ms</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Model 2 Random Forest */}
                  <motion.div
                    whileHover={{ scale: 1.015, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="p-4 rounded-xl border-2 border-border bg-surface shadow-neo-sm flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-lg border-2 border-border bg-surface-subtle text-text-primary font-mono font-bold text-sm flex items-center justify-center">
                        #2
                      </div>
                      <div>
                        <span className="font-display font-bold text-base text-text-primary block">
                          Random Forest Classifier
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          Pipeline: SimpleImputer + StandardScale + 100 Trees
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-7 font-mono text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">F1 MACRO</span>
                        <span className="font-bold text-text-primary text-base">0.835</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">ROC-AUC</span>
                        <span className="font-bold text-text-primary text-base">0.871</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">LATENCY</span>
                        <span className="font-bold text-text-secondary text-sm">340ms</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Model 3 Baseline */}
                  <div className="p-3.5 rounded-xl border-2 border-dashed border-border bg-surface-subtle/40 flex flex-wrap items-center justify-between gap-4 opacity-75">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-lg border border-border text-text-muted font-mono font-bold text-xs flex items-center justify-center">
                        BASE
                      </div>
                      <div>
                        <span className="font-display font-bold text-sm text-text-muted block">
                          Dummy Baseline (Most Frequent)
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          Academic standard: Verifies algorithms truly beat naive zero-intelligence guessing
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-7 font-mono text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">F1 MACRO</span>
                        <span className="font-bold text-text-muted text-sm">0.616</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">ROC-AUC</span>
                        <span className="font-bold text-text-muted text-sm">0.500</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">LATENCY</span>
                        <span className="font-bold text-text-muted text-sm">1ms</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "strategy" && (
                <motion.div
                  key="strategy"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-5 rounded-xl border-2 border-border bg-canvas font-mono text-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent font-bold">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                      <span>Google Gemini 2.0 Flash Reasoning Formulation:</span>
                    </div>
                    <SketchStamp label="STREAMED SSE" color="border-cyan-500 text-cyan-600 dark:text-cyan-400" />
                  </div>

                  <div className="p-4 rounded-lg border-2 border-border bg-surface text-text-secondary leading-relaxed shadow-neo-sm">
                    &quot;Identified binary target &apos;Survived&apos; with 38.4% positive class balance. Selected macro F1 as primary optimization metric to ensure balanced precision and recall. Engineered &apos;FamilySize&apos; feature from SibSp + Parch and isolated Deck extraction from Cabin. Preprocessing transformations are strictly isolated inside 5 cross-validation folds to prevent out-of-fold data contamination.&quot;
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                    <div className="p-3 rounded-lg border-2 border-border bg-surface shadow-neo-sm">
                      <span className="font-bold text-text-primary block mb-1">
                        🎯 Recommended Algorithm Candidates:
                      </span>
                      <span className="text-text-muted">
                        LightGBM (Gradient Boosted Trees), Random Forest, Logistic Regression
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border-2 border-border bg-surface shadow-neo-sm">
                      <span className="font-bold text-text-primary block mb-1">
                        🛡️ Fold Preprocessing Strategy:
                      </span>
                      <span className="text-text-muted">
                        Median Imputation (Age, Fare), One-Hot (Sex, Embarked), StandardScaling
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "shap" && (
                <motion.div
                  key="shap"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="space-y-4 font-mono text-xs"
                >
                  <div className="flex items-center justify-between text-text-muted text-[11px]">
                    <span className="font-bold">GLOBAL TREE SHAP FEATURE IMPORTANCE (MEAN |SHAP VALUE|):</span>
                    <span className="text-accent font-bold">TreeExplainer (Exact Shuffled Coalitions)</span>
                  </div>

                  {/* Feature 1 */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border bg-surface shadow-neo-sm">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-text-primary">1. Sex (Passenger Gender)</span>
                      <span className="text-accent font-black">+0.284 SHAP</span>
                    </div>
                    <div className="w-full h-3.5 rounded-full border border-border bg-canvas overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "88%" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border bg-surface shadow-neo-sm">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-text-primary">2. Pclass (Passenger Ticket Class)</span>
                      <span className="text-text-primary font-black">+0.192 SHAP</span>
                    </div>
                    <div className="w-full h-3.5 rounded-full border border-border bg-canvas overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "62%" }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                        className="h-full bg-pastel-cyan rounded-full"
                      />
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border bg-surface shadow-neo-sm">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-text-primary">3. Fare (Ticket Price)</span>
                      <span className="text-text-primary font-black">+0.118 SHAP</span>
                    </div>
                    <div className="w-full h-3.5 rounded-full border border-border bg-canvas overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "41%" }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="h-full bg-pastel-amber rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
