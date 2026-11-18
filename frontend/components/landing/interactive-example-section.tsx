"use client";

import { useState } from "react";
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  BarChart2,
  Cpu,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function InteractiveExampleSection() {
  const [activeTab, setActiveTab] = useState<"strategy" | "leaderboard" | "shap">("leaderboard");

  return (
    <section id="example" className="py-16 sm:py-20 border-b-2 border-border bg-surface-subtle/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="neutral" className="font-mono text-xs mb-3 shadow-neo-sm">
            {"// LIVE BENCHMARK EXAMPLE"}
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3">
            Real AutoMLens Execution: Titanic Survival Benchmark
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary font-mono">
            Dataset: 891 rows, 11 features, mixed numeric & categorical types with missing values in Age & Cabin.
          </p>
        </div>

        {/* Interactive Preview Container */}
        <div className="border-2 border-border rounded-xl bg-surface shadow-neo-lg overflow-hidden max-w-5xl mx-auto">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b-2 border-border bg-canvas">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 border border-border" />
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-border" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-border" />
              <span className="text-xs font-mono font-bold text-text-primary ml-2">
                project://titanic-benchmark-cv5
              </span>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border-2 border-border bg-surface">
              <button
                type="button"
                onClick={() => setActiveTab("leaderboard")}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                  activeTab === "leaderboard"
                    ? "bg-accent text-white shadow-neo-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                1. Leaderboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("strategy")}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                  activeTab === "strategy"
                    ? "bg-accent text-white shadow-neo-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                2. AI Strategy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shap")}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                  activeTab === "shap"
                    ? "bg-accent text-white shadow-neo-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                3. SHAP Impact
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === "leaderboard" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
                  <span>5-FOLD STRATIFIED CV RESULTS (METRIC: F1 MACRO)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+22.6% over Dummy Baseline</span>
                </div>

                {/* Model 1 Champion */}
                <div className="p-3.5 rounded-lg border-2 border-border bg-pastel-cyan/20 dark:bg-cyan-950/20 shadow-neo-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded border-2 border-border bg-yellow-300 text-slate-950 font-mono font-black text-xs shadow-neo-sm">
                      #1
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-text-primary">LightGBM Classifier</span>
                        <Badge variant="success" className="text-[10px] font-mono">
                          CHAMPION
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-text-muted">
                        Pipeline: MedianImputer + OneHotEncoder + EarlyStopping
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px]">F1 MACRO</span>
                      <span className="font-bold text-accent text-sm">0.842</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">ROC-AUC</span>
                      <span className="font-bold text-text-primary text-sm">0.887</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">LATENCY</span>
                      <span className="font-bold text-text-secondary text-sm">124ms</span>
                    </div>
                  </div>
                </div>

                {/* Model 2 Random Forest */}
                <div className="p-3.5 rounded-lg border-2 border-border bg-surface shadow-neo-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded border-2 border-border bg-surface-subtle text-text-primary font-mono font-bold text-xs">
                      #2
                    </span>
                    <div>
                      <span className="font-mono font-bold text-sm text-text-primary">Random Forest Classifier</span>
                      <span className="text-[11px] font-mono text-text-muted block">
                        Pipeline: SimpleImputer + StandardScale + 100 Trees
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px]">F1 MACRO</span>
                      <span className="font-bold text-text-primary text-sm">0.835</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">ROC-AUC</span>
                      <span className="font-bold text-text-primary text-sm">0.871</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">LATENCY</span>
                      <span className="font-bold text-text-secondary text-sm">340ms</span>
                    </div>
                  </div>
                </div>

                {/* Model 3 Baseline */}
                <div className="p-3.5 rounded-lg border-2 border-dashed border-border bg-surface-subtle/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded border border-border text-text-muted font-mono text-xs">
                      BASE
                    </span>
                    <div>
                      <span className="font-mono font-bold text-sm text-text-muted">Dummy Baseline (Most Frequent)</span>
                      <span className="text-[11px] font-mono text-text-muted block">
                        Academic requirement: Proves real models beat zero-intelligence baseline
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px]">F1 MACRO</span>
                      <span className="font-bold text-text-muted text-sm">0.616</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">ROC-AUC</span>
                      <span className="font-bold text-text-muted text-sm">0.500</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">LATENCY</span>
                      <span className="font-bold text-text-muted text-sm">1ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "strategy" && (
              <div className="p-4 rounded-lg border-2 border-border bg-canvas font-mono text-xs space-y-3">
                <div className="flex items-center gap-2 text-accent font-bold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Google Gemini 2.0 Flash Reasoning Formulation:</span>
                </div>
                <div className="p-3 rounded border border-border bg-surface text-text-secondary leading-relaxed">
                  &quot;Identified binary target &apos;Survived&apos; with 38.4% positive class balance. Selected macro F1 as primary optimization metric to ensure balanced precision and recall. Engineered &apos;FamilySize&apos; feature from SibSp + Parch and isolated Deck extraction from Cabin. Preprocessing transformations are strictly isolated inside 5 cross-validation folds to prevent out-of-fold data contamination.&quot;
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded border border-border bg-surface">
                    <span className="font-bold text-text-primary block mb-1">Recommended Candidates:</span>
                    <span className="text-text-muted">LightGBM, Random Forest, Logistic Regression</span>
                  </div>
                  <div className="p-2.5 rounded border border-border bg-surface">
                    <span className="font-bold text-text-primary block mb-1">Preprocessing Plan:</span>
                    <span className="text-text-muted">Median Imputation (Age, Fare), One-Hot (Sex, Embarked)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "shap" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-text-muted text-[11px] mb-1">
                  GLOBAL TREE SHAP FEATURE IMPORTANCE (MEAN |SHAP VALUE|):
                </div>
                {/* Feature 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-text-primary">Sex (Gender)</span>
                    <span className="text-accent font-bold">+0.284</span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-canvas overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>
                {/* Feature 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-text-primary">Pclass (Passenger Class)</span>
                    <span className="text-text-primary font-bold">+0.192</span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-canvas overflow-hidden">
                    <div className="h-full bg-pastel-cyan rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>
                {/* Feature 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-text-primary">Fare (Ticket Cost)</span>
                    <span className="text-text-primary font-bold">+0.118</span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-canvas overflow-hidden">
                    <div className="h-full bg-pastel-amber rounded-full" style={{ width: "41%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
