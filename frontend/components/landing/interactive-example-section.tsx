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
import { SketchStamp, MarkerBadge } from "./doodle-elements";

export function InteractiveExampleSection() {
  const [activeLens, setActiveLens] = useState<"scanner" | "speedway" | "xray">("scanner");

  const lenses = [
    {
      id: "scanner",
      icon: Sparkles,
      label: "Lens 01: AI Data Scanner",
      tag: "Live Inspection",
      accent: "from-amber-500/20 to-amber-500/0 text-amber-500",
    },
    {
      id: "speedway",
      icon: Flame,
      label: "Lens 02: Kinetic Race Arena",
      tag: "5-Model Duel",
      accent: "from-cyan-500/20 to-cyan-500/0 text-accent",
    },
    {
      id: "xray",
      icon: BrainCircuit,
      label: "Lens 03: SHAP X-Ray Vectors",
      tag: "Plain-English Why",
      accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-500",
    },
  ] as const;

  return (
    <section id="example" className="py-20 sm:py-28 border-b-2 border-border bg-[#F4F6F9]/70 dark:bg-[#0C0E14] relative overflow-hidden transition-colors">
      {/* Eye-Soothing Arena Spotlight Glow behind Interactive Container */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] sm:w-[900px] h-[450px] pointer-events-none rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(99, 102, 241, 0.06) 55%, transparent 80%)",
        }}
      />
      {/* Subtle Horizontal Telemetry Beam */}
      <div
        className="absolute top-1/3 left-0 right-0 h-px pointer-events-none opacity-30 dark:opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(14, 165, 233, 0.6) 50%, transparent 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>CHAPTER 03 // THE OPTICAL LAB BENCH</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-2 ml-1">
              ★ The &quot;Lens&quot; in AutoMLens
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Inspect Any Spreadsheet Through the{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              AutoMLens
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Raw tabular data goes in. Switch between three optical inspection lenses below to see the hidden machine learning machinery reveal itself in real-time.
            <span className="block font-marker text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              ✏️ Zero black boxes: every number, recommendation, and prediction is fully explainable.
            </span>
          </p>
        </div>

        {/* Optical Lens Selector Dial (Not a generic card tab bar!) */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="p-1.5 sm:p-2 rounded-2xl border-2 border-border bg-surface shadow-neo flex flex-col sm:flex-row items-stretch justify-between gap-2">
            {lenses.map((lens) => {
              const isSelected = activeLens === lens.id;
              const Icon = lens.icon;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setActiveLens(lens.id)}
                  className={`relative flex-1 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left flex items-center justify-between group ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-neo-sm scale-[1.01]"
                      : "border-transparent hover:border-border hover:bg-canvas opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg border-2 border-border ${
                        isSelected
                          ? "bg-accent text-white"
                          : "bg-surface-subtle text-text-secondary group-hover:text-text-primary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-display text-xs sm:text-sm font-bold text-text-primary block">
                        {lens.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {lens.tag}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping mr-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* The Open Optical Stage (Unboxed, Asymmetric, Living Telemetry) */}
        <div className="max-w-5xl mx-auto relative">
          <AnimatePresence mode="wait">
            {activeLens === "scanner" && (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="space-y-6"
              >
                {/* Visual Spreadsheet Strip with Optical Target */}
                <div className="p-5 sm:p-7 rounded-2xl border-2 border-border bg-surface shadow-neo relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3 mb-4">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>RAW SPREADSHEET SCANNER: titanic_survival_q1.xlsx</span>
                    </div>
                    <span className="font-marker font-bold text-sm text-amber-500 -rotate-2">
                      ★ 891 Rows Analyzed
                    </span>
                  </div>

                  {/* Table Slice */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-text-muted text-[11px]">
                          <th className="py-2 px-3">Passenger</th>
                          <th className="py-2 px-3">Gender</th>
                          <th className="py-2 px-3">Age</th>
                          <th className="py-2 px-3">Class</th>
                          <th className="py-2 px-3">Ticket Fare</th>
                          <th className="py-2 px-3">Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-text-primary">
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-bold">Owen Harris</td>
                          <td className="py-2.5 px-3">male</td>
                          <td className="py-2.5 px-3">22.0 yrs</td>
                          <td className="py-2.5 px-3">3rd Class</td>
                          <td className="py-2.5 px-3">$7.25</td>
                          <td className="py-2.5 px-3 text-rose-500 font-bold">0 (Perished)</td>
                        </tr>
                        <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                          <td className="py-2.5 px-3 font-sans font-bold">Florence Briggs</td>
                          <td className="py-2.5 px-3">female</td>
                          <td className="py-2.5 px-3">38.0 yrs</td>
                          <td className="py-2.5 px-3">1st Class</td>
                          <td className="py-2.5 px-3 font-black text-accent">$71.28</td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">1 (Survived)</td>
                        </tr>
                        {/* Target Anomaly Row with Optical Magnifier Ring */}
                        <tr className="bg-rose-50/70 dark:bg-rose-950/30 ring-2 ring-rose-400/80 rounded-lg">
                          <td className="py-2.5 px-3 font-sans font-bold">James Moran</td>
                          <td className="py-2.5 px-3">male</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] animate-pulse">
                              NaN [MISSING]
                            </span>
                          </td>
                          <td className="py-2.5 px-3">3rd Class</td>
                          <td className="py-2.5 px-3">$8.05</td>
                          <td className="py-2.5 px-3 text-text-muted">Uncertain</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Optical Annotation Marker Note */}
                  <div className="mt-4 p-3.5 rounded-xl border-2 border-dashed border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
                    <span className="text-xl">🔍</span>
                    <div>
                      <strong className="block font-marker text-base text-amber-900 dark:text-amber-200">
                        AutoMLens Optical Fix Detected:
                      </strong>
                      <p className="text-xs font-mono text-text-secondary mt-0.5">
                        James Moran&apos;s missing age was imputed with the 5-fold local median (28.0 yrs). Notice that zero future test fold data was leaked, maintaining 100% mathematical validity.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Thought Stream Bubble */}
                <div className="p-5 rounded-2xl border-2 border-border bg-canvas shadow-neo-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl border-2 border-border bg-accent text-white shadow-neo-sm shrink-0">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-text-primary">
                        Google Gemini 2.0 Flash AI Analyst:
                      </span>
                      <SketchStamp label="STREAMED" color="border-cyan-500 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <p className="text-xs sm:text-sm font-sans text-text-secondary leading-relaxed">
                      &quot;I scanned your Titanic dataset. Target &apos;Survived&apos; has a 38.4% balance. High-influence drivers: Gender, Ticket Class, and Cabin Location. I have structured a 5-model tournament using Stratified 5-Fold Cross Validation. Ready to race!&quot;
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeLens === "speedway" && (
              <motion.div
                key="speedway"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-mono text-text-muted">
                  <span className="font-bold">5-MODEL CROSS-VALIDATION HORSEPOWER ARENA</span>
                  <span className="font-marker font-bold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-border">
                    🔥 +22.6% over naive guessing!
                  </span>
                </div>

                {/* Champion Track: LightGBM */}
                <div className="p-5 rounded-2xl border-2 border-border bg-pastel-cyan/30 dark:bg-cyan-950/30 shadow-neo hover:shadow-neo-lg transition-all relative">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl border-2 border-border bg-yellow-300 text-slate-950 font-mono font-black text-base flex items-center justify-center shadow-neo-sm">
                        #1
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-base sm:text-lg text-text-primary">
                            LightGBM Classifier
                          </span>
                          <span className="font-marker text-xs font-bold px-2 py-0.5 rounded border border-border bg-emerald-300 text-slate-950 shadow-[1px_1px_0px_0px_var(--neo-shadow-color)]">
                            ★ TOURNAMENT CHAMPION
                          </span>
                        </div>
                        <span className="text-xs font-mono text-text-muted">
                          Pipeline: Fold-Safe Median + OneHotEncoder + EarlyStopping
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 font-mono text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">ACCURACY</span>
                        <span className="font-black text-accent text-lg">84.2%</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">CONFIDENCE</span>
                        <span className="font-bold text-text-primary text-base">0.887</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">TRAIN TIME</span>
                        <span className="font-bold text-text-secondary text-sm">124ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Kinetic Speed Fuel Gauge */}
                  <div className="w-full h-3 rounded-full border border-border bg-canvas overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "84.2%" }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                </div>

                {/* Runner-Up Track: Random Forest */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-border bg-surface shadow-neo-sm hover:shadow-neo transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl border-2 border-border bg-surface-subtle text-text-primary font-mono font-bold text-sm flex items-center justify-center">
                        #2
                      </div>
                      <div>
                        <span className="font-display font-bold text-base text-text-primary block">
                          Random Forest Classifier
                        </span>
                        <span className="text-xs font-mono text-text-muted">
                          Pipeline: SimpleImputer + StandardScale + 100 Estimator Trees
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 font-mono text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">ACCURACY</span>
                        <span className="font-bold text-text-primary text-base">83.5%</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">CONFIDENCE</span>
                        <span className="font-bold text-text-primary text-base">0.871</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px] font-bold">TRAIN TIME</span>
                        <span className="font-bold text-text-secondary text-sm">340ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full border border-border bg-canvas overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "83.5%" }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                      className="h-full bg-pastel-cyan rounded-full"
                    />
                  </div>
                </div>

                {/* Baseline Track: Dummy Guessing */}
                <div className="p-3.5 sm:p-4 rounded-xl border-2 border-dashed border-border bg-surface-subtle/40 opacity-70 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-border text-text-muted font-mono font-bold text-xs flex items-center justify-center">
                      BASE
                    </div>
                    <div>
                      <span className="font-display font-bold text-sm text-text-muted block">
                        Zero-Intelligence Baseline (Most Frequent)
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        Benchmark verification: real algorithms beating naive baselines
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs text-text-muted">
                    <div>
                      <span className="block text-[10px]">ACCURACY</span>
                      <span className="font-bold">61.6%</span>
                    </div>
                    <div>
                      <span className="block text-[10px]">CONFIDENCE</span>
                      <span className="font-bold">0.500</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeLens === "xray" && (
              <motion.div
                key="xray"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="space-y-4 font-mono text-xs"
              >
                {/* Single Passenger Diagnosis Header */}
                <div className="p-4 rounded-xl border-2 border-border bg-surface flex flex-wrap items-center justify-between gap-3 shadow-neo-sm">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">
                      DIAGNOSING PASSENGER: FLORENCE BRIGGS
                    </span>
                    <span className="font-sans text-sm font-bold text-text-primary">
                      Female, Age 38, 1st Class, Ticket Fare $71.28
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-emerald-600 dark:text-emerald-400 text-lg">
                      84.2% Likely to Survive
                    </span>
                    <span className="px-2 py-0.5 rounded border border-border bg-emerald-100 dark:bg-emerald-950/60 font-bold text-[11px] text-emerald-800 dark:text-emerald-200">
                      ✓ HIGH CONFIDENCE
                    </span>
                  </div>
                </div>

                {/* Force Vector 1 */}
                <div className="p-4 rounded-xl border-2 border-border bg-canvas shadow-neo-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary font-sans text-sm">
                      1. Gender: Female
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono">
                      +28.4% Boost Towards Survival
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-surface overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "88%" }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary">
                    💡 <strong>ELI5 Explanation:</strong> Emergency evacuation protocol gave women and children priority access to the primary lifeboats.
                  </p>
                </div>

                {/* Force Vector 2 */}
                <div className="p-4 rounded-xl border-2 border-border bg-canvas shadow-neo-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary font-sans text-sm">
                      2. Ticket Class: 1st Class
                    </span>
                    <span className="text-accent font-black font-mono">
                      +19.2% Boost Towards Survival
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-surface overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "62%" }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary">
                    💡 <strong>ELI5 Explanation:</strong> 1st class staterooms were located on the upper promenade decks, directly adjacent to lifeboat stations.
                  </p>
                </div>

                {/* Force Vector 3 */}
                <div className="p-4 rounded-xl border-2 border-border bg-canvas shadow-neo-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary font-sans text-sm">
                      3. Ticket Price: Higher Fare ($71.28)
                    </span>
                    <span className="text-amber-500 font-black font-mono">
                      +11.8% Boost Towards Survival
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full border border-border bg-surface overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "41%" }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      className="h-full bg-amber-400 rounded-full"
                    />
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary">
                    💡 <strong>ELI5 Explanation:</strong> Higher fare tiers correlated with private cabins and personal emergency stewards.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
