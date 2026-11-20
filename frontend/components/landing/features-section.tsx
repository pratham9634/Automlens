"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  ShieldCheck,
  Cpu,
  History,
  Sparkles,
  Layers,
  Sliders,
  ArrowRight,
  HelpCircle,
  Gauge,
  FileText,
  RotateCcw,
} from "lucide-react";
import { TapeSticker, PaperClip, SketchStamp, DoodleUnderline } from "./doodle-elements";

export function FeaturesSection() {
  // Interactive state for Instrument 3 (ELI5 Decoder)
  const [decoderMode, setDecoderMode] = useState<"eli5" | "math">("eli5");

  // Interactive state for Instrument 4 (Live What-If Slider)
  const [sliderFare, setSliderFare] = useState<number>(75);
  const [isFamily, setIsFamily] = useState<boolean>(true);

  // Dynamic calculation for What-If simulator
  const calculatedProbability = Math.min(
    95,
    Math.max(15, Math.round(35 + sliderFare * 0.45 + (isFamily ? 18 : 0)))
  );

  return (
    <section id="features" className="py-20 sm:py-28 border-b-2 border-border bg-canvas relative overflow-hidden transition-colors">
      {/* Eye-Soothing Architectural Drafting Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(100, 116, 139, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
        }}
      />

      {/* Floating Underglow Orbs (Mint-Cyan & Lavender) */}
      <div className="absolute top-1/3 -left-24 w-96 h-96 bg-cyan-500/8 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -right-24 w-96 h-96 bg-purple-500/8 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>ENGINEERING SUITE // THE ARCHITECT&apos;S OPEN TOOLBELT</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-2 ml-1">
              ★ 4 Tangible Instruments
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Four Specialized Tools.{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-1 inline-block px-1">
              Zero Code.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Instead of hidden algorithms in black boxes, AutoMLens places four distinct, tangible instruments onto your drafting table.
            <span className="block font-marker text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              ✏️ Every tool has its own tactile purpose and real-time interaction.
            </span>
          </p>
        </div>

        {/* The Open Toolbelt Layout (Asymmetric, Tactile, No Repetitive Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* INSTRUMENT 1: The AI Analyst Memo Pad (Paper Notebook Format) */}
          <div className="lg:col-span-6 relative p-6 sm:p-8 rounded-2xl border-2 border-border bg-[#FFFDF5] dark:bg-[#151720] shadow-neo flex flex-col justify-between min-h-[380px]">
            {/* Paperclip & Tape */}
            <div className="absolute -top-5 left-10 z-10">
              <PaperClip />
            </div>
            <div className="absolute -top-3 right-8 z-10">
              <TapeSticker />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 border-b-2 border-dashed border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg border-2 border-border bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                      INSTRUMENT 01 // CONVERSATIONAL WORKBENCH
                    </span>
                    <h3 className="font-display text-lg font-bold text-text-primary">
                      AI Data Analyst Assistant
                    </h3>
                  </div>
                </div>
                <SketchStamp label="24/7 COPILOT" color="border-purple-500 text-purple-600 dark:text-purple-400" />
              </div>

              {/* Chat Simulation Transcript */}
              <div className="space-y-3 font-mono text-xs my-4">
                <div className="p-3 rounded-xl border border-border bg-canvas shadow-neo-sm flex items-start gap-2.5">
                  <span className="text-sm">👤</span>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted block">YOU (MARKETING LEAD):</span>
                    <p className="text-text-primary font-sans text-xs">
                      &quot;Why did Customer #492 churn right after month 3?&quot;
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border-2 border-accent/40 bg-accent/5 dark:bg-accent/10 shadow-neo-sm flex items-start gap-2.5">
                  <span className="text-sm">🤖</span>
                  <div>
                    <span className="text-[10px] font-bold text-accent block">AI ANALYST (GEMINI 2.0 FLASH):</span>
                    <p className="text-text-secondary font-sans text-xs leading-relaxed">
                      &quot;High monthly fee ($115) + Month-to-Month contract drove 84% churn risk. When we simulate a 1-year contract discount, their churn risk drops to 22%. Want to apply this rule across all Q3 cohorts?&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted font-sans border-t border-border pt-3">
              💡 Talk to your numbers in plain English. No SQL or Python scripts required.
            </p>
          </div>

          {/* INSTRUMENT 2: The Multi-Core Tournament Speedway Dial */}
          <div className="lg:col-span-6 relative p-6 sm:p-8 rounded-2xl border-2 border-border bg-[#FBFBFA] dark:bg-[#13151D] shadow-neo flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b-2 border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg border-2 border-border bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                      INSTRUMENT 02 // MULTI-PROCESS FOUNDRY
                    </span>
                    <h3 className="font-display text-lg font-bold text-text-primary">
                      1-Click Model Tournament
                    </h3>
                  </div>
                </div>
                <SketchStamp label="PARALLEL 5-CV" color="border-cyan-500 text-cyan-600 dark:text-cyan-400" />
              </div>

              {/* Real-time Telemetry Dial Simulation */}
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-xl border-2 border-border bg-canvas text-center shadow-neo-sm">
                  <span className="text-[10px] font-mono font-bold text-text-muted block">BEST ACCURACY</span>
                  <span className="font-display font-black text-2xl text-accent">84.2%</span>
                  <span className="text-[10px] font-marker font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    ★ LightGBM
                  </span>
                </div>

                <div className="p-3 rounded-xl border-2 border-border bg-canvas text-center shadow-neo-sm">
                  <span className="text-[10px] font-mono font-bold text-text-muted block">TRAIN TIME</span>
                  <span className="font-display font-black text-2xl text-text-primary">124ms</span>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    4-Core CPU
                  </span>
                </div>

                <div className="p-3 rounded-xl border-2 border-border bg-canvas text-center shadow-neo-sm">
                  <span className="text-[10px] font-mono font-bold text-text-muted block">LEAKAGE CHECK</span>
                  <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">0.00</span>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    Fold Isolated
                  </span>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="space-y-2 font-mono text-xs pt-1">
                <div className="flex justify-between text-[11px]">
                  <span>Fold 1..5 Cross-Validation Progress:</span>
                  <span className="text-accent font-bold">100% COMPLETE</span>
                </div>
                <div className="w-full h-3 rounded-full border border-border bg-canvas overflow-hidden">
                  <div className="h-full bg-accent rounded-full w-full" />
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted font-sans border-t border-border pt-3 mt-4">
              🛡️ All scaling, imputation, and encoding isolated inside each CV fold to guarantee out-of-sample validity.
            </p>
          </div>

          {/* INSTRUMENT 3: The Interactive ELI5 Decoder (Math ↔ English Slider) */}
          <div className="lg:col-span-6 relative p-6 sm:p-8 rounded-2xl border-2 border-border bg-surface shadow-neo flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b-2 border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg border-2 border-border bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                      INSTRUMENT 03 // BILINGUAL DECODER
                    </span>
                    <h3 className="font-display text-lg font-bold text-text-primary">
                      ELI5 Explainability (No Black Boxes)
                    </h3>
                  </div>
                </div>

                {/* Interactive Toggle Pill */}
                <div className="flex items-center p-1 rounded-xl border-2 border-border bg-canvas text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setDecoderMode("eli5")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      decoderMode === "eli5"
                        ? "bg-amber-400 text-slate-950 shadow-neo-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    ★ Plain English
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecoderMode("math")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      decoderMode === "math"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-neo-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Raw Math (SHAP)
                  </button>
                </div>
              </div>

              {/* Morphing Decoder Card */}
              <div className="p-4 sm:p-5 rounded-xl border-2 border-border bg-canvas my-3 min-h-[140px] flex items-center justify-center text-center transition-all">
                <AnimatePresence mode="wait">
                  {decoderMode === "eli5" ? (
                    <motion.div
                      key="eli5"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 text-left w-full"
                    >
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                        ✓ TRANSLATED INTO HUMAN LANGUAGE:
                      </span>
                      <p className="font-sans text-sm text-text-primary font-medium leading-relaxed">
                        &quot;Women passengers in 1st class had a <strong className="text-accent">+47.6% higher probability</strong> of reaching lifeboats due to deck proximity and maritime evacuation priority.&quot;
                      </p>
                      <span className="text-[11px] font-marker font-bold text-amber-500 block">
                        ✏️ Easy to present to teachers, bosses, or non-technical clients!
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="math"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="font-mono text-xs text-text-muted text-left w-full space-y-2"
                    >
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {"// EXACT SHAPLEY FORMULATION:"}
                      </span>
                      <pre className="p-2 rounded bg-slate-950 text-emerald-400 overflow-x-auto text-[11px]">
                        <code>phi_i(x) = Sum[ ( |S|!(|F|-|S|-1)! / |F|! ) * (f(S U &#123;i&#125;) - f(S)) ]</code>
                      </pre>
                      <span className="text-[10px] text-text-muted">
                        Computed via TreeExplainer across 100 validation samples.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <p className="text-xs text-text-muted font-sans border-t border-border pt-3">
              👉 Tap the toggle above to experience how AutoMLens translates complex equations into clear sentences.
            </p>
          </div>

          {/* INSTRUMENT 4: The Live "What-If" Scenario Console (Interactive Slider) */}
          <div className="lg:col-span-6 relative p-6 sm:p-8 rounded-2xl border-2 border-border bg-[#F9FBFB] dark:bg-[#12161B] shadow-neo flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b-2 border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg border-2 border-border bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                      INSTRUMENT 04 // SINGLE-RECORD INFERENCE
                    </span>
                    <h3 className="font-display text-lg font-bold text-text-primary">
                      Interactive Single-Record Prediction
                    </h3>
                  </div>
                </div>
                <SketchStamp label="INTERACTIVE" color="border-emerald-500 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Live Interactive Sliders */}
              <div className="space-y-4 my-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-bold text-text-primary">TICKET FARE / SPEND:</span>
                    <span className="text-accent font-black text-sm">${sliderFare}.00</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={sliderFare}
                    onChange={(e) => setSliderFare(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                    <span>$10 (Economy)</span>
                    <span>$150 (First Class)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-canvas">
                  <span className="font-bold text-text-primary">Family Member Onboard?</span>
                  <button
                    type="button"
                    onClick={() => setIsFamily(!isFamily)}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                      isFamily
                        ? "border-accent bg-accent text-white shadow-neo-sm"
                        : "border-border bg-surface text-text-muted"
                    }`}
                  >
                    {isFamily ? "✓ Yes (+18%)" : "✕ Alone (0%)"}
                  </button>
                </div>

                {/* Dynamic Outcome Meter */}
                <div className="p-3.5 rounded-xl border-2 border-border bg-surface flex items-center justify-between shadow-neo-sm">
                  <div>
                    <span className="text-[10px] font-mono text-text-muted block">CALCULATED PREDICTION:</span>
                    <span className="font-display font-black text-lg text-text-primary">
                      {calculatedProbability}% Probability
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-marker font-bold ${
                      calculatedProbability >= 60
                        ? "bg-emerald-300 text-slate-950"
                        : "bg-amber-300 text-slate-950"
                    }`}
                  >
                    {calculatedProbability >= 60 ? "★ Likely to Survive" : "⚠️ High Risk"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted font-sans border-t border-border pt-3">
              🎯 Test business assumptions live without re-running models or touching any code.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
