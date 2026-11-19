"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShieldAlert, CheckCircle2, Lightbulb, Bookmark, FileCode2 } from "lucide-react";
import {
  TapeSticker,
  DoodleArrow,
  SketchStamp,
  PaperClip,
  DoodleUnderline,
} from "./doodle-elements";

interface SketchNote {
  id: string;
  title: string;
  badge: string;
  color: string;
  darkColor: string;
  rotation: number;
  annotation: string;
  summary: string;
  codeSnippet: string;
  stamp: string;
  stampColor: string;
}

const sketchNotes: SketchNote[] = [
  {
    id: "drag-and-clean",
    title: "1. Drag, Drop & Auto-Clean",
    badge: "Zero Setup",
    color: "bg-[#FFF9C4] text-amber-950 border-[#FBC02D]", // Sticky Yellow
    darkColor: "dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-600/50",
    rotation: -2.5,
    annotation: "Messy columns? Missing numbers? Safely diagnosed & imputed inside folds.",
    summary:
      "You don't need to learn Python or pandas data cleaning scripts. Simply drag and drop your raw Excel or CSV spreadsheet. AutoMLens profiles every column, detects missing values, isolates outliers without auto-deleting, and prepares a pristine training set inside each fold.",
    codeSnippet: "// 📂 Uploaded: Sales_Q4_2024.xlsx (8,420 rows)\n✓ Detected: 12 numeric, 4 text categories\n✓ Repaired: 142 missing values handled safely\n✓ Status: 100% clean & ready for model training!",
    stamp: "100% NO-CODE",
    stampColor: "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300",
  },
  {
    id: "ai-analyst",
    title: "2. AI Decision Rationale",
    badge: "Heuristic + LLM Reasoning",
    color: "bg-[#E1F5FE] text-sky-950 border-[#81D4FA]", // Sticky Blue
    darkColor: "dark:bg-sky-950/70 dark:text-sky-100 dark:border-sky-600/50",
    rotation: 1.8,
    annotation: "Inspect the engineering rationale behind task and algorithm selections.",
    summary:
      "No black boxes. AutoMLens combines a deterministic rule engine (100% offline reproducible and fully auditable) with optional LLM reasoning to explain why specific candidate algorithms, encodings, and metrics were chosen for your data scale.",
    codeSnippet: "// 💡 Decision Engine Reasoning\n→ Target: 'Renewed' (Binary)\n→ Selected: Classification (Macro F1)\n→ Rationale: Class distribution is 73/27; tree ensembles with balanced scoring recommended.",
    stamp: "AI RATIONALE",
    stampColor: "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300",
  },
  {
    id: "eli5-explain",
    title: "3. Plain-English Explainability",
    badge: "Zero Black Boxes",
    color: "bg-[#F3E5F5] text-purple-950 border-[#CE93D8]", // Sticky Lavender
    darkColor: "dark:bg-purple-950/70 dark:text-purple-100 dark:border-purple-600/50",
    rotation: -1.2,
    annotation: "Every prediction explained like you're five. No complex math needed.",
    summary:
      "Traditional machine learning gives you confusing math formulas. AutoMLens translates complex mathematical SHAP scores into intuitive color-coded bars and plain-English sentences so you can explain findings to clients or managers with 100% confidence.",
    codeSnippet: "★ Prediction: 84% Likely to Churn\n🟢 Risk Factor: MonthlyCharges ($115.00) [+32%]\n🔴 Safe Factor: TwoYearContractActive [-25%]\n💡 ELI5 Note: \"High monthly fees are the primary driver.\"",
    stamp: "HUMAN EXPLAINABLE",
    stampColor: "border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300",
  },
];

export function SketchbookSection() {
  const [activeNote, setActiveNote] = useState<string>("drag-and-clean");

  const current = sketchNotes.find((n) => n.id === activeNote) || sketchNotes[0];

  return (
    <section id="sketchbook" className="py-20 sm:py-28 border-b-2 border-border bg-[#FAF8F3] dark:bg-[#0F111A] relative overflow-hidden transition-colors">
      {/* Warm Moleskine Dot-Matrix Paper Texture with Edge Vignette */}
      <div
        className="absolute inset-0 opacity-[0.45] dark:opacity-[0.20] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(135, 120, 95, 0.35) 1.5px, transparent 1.5px)`,
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
        }}
      />

      {/* Gentle Warm Paper Glow in Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[500px] bg-amber-300/10 dark:bg-amber-400/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Bookmark className="w-3.5 h-3.5" />
            <span>ARCHITECTURAL PRINCIPLES // ZERO-CODE MACHINE LEARNING</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-3 ml-1">★ No Code Needed</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            From Messy Spreadsheets to{" "}
            <span className="font-marker font-bold text-4xl sm:text-6xl text-accent -rotate-2 inline-block px-1">
              Clear Insights
            </span>
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            You don&apos;t need coding experience or a statistics degree. Here is how AutoMLens empowers anyone to turn raw numbers into{" "}
            <span className="font-bold text-text-primary">high-accuracy predictions</span> with{" "}
            <span className="font-bold text-text-primary">human-first explainability</span>.
          </p>

          <div className="w-44 mx-auto mt-2 text-accent">
            <DoodleUnderline />
          </div>
        </div>

        {/* The Sketchbook Canvas */}
        <div className="relative rounded-2xl border-2 border-border bg-white dark:bg-[#18191E] shadow-neo-lg p-5 sm:p-8 md:p-10 transition-all">
          {/* Notebook Binder Rings (Top on mobile, Left on tablet/desktop) */}
          <div className="hidden lg:flex absolute -left-4 top-12 bottom-12 flex-col justify-around pointer-events-none z-20">
            {[1, 2, 3, 4, 5, 6].map((ring) => (
              <div
                key={ring}
                className="w-8 h-4 rounded-full border-2 border-border bg-slate-300 dark:bg-slate-700 shadow-neo-sm transform -rotate-12"
              />
            ))}
          </div>

          {/* Grid Layout: 3 Sticky Notes on the Left/Top, Deep-Dive Workspace on the Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 3 Interactive Sticky Notes */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-text-muted mb-1">
                <span>TAP A STICKY NOTE TO EXPLORE:</span>
                <span className="text-[10px] text-accent animate-pulse">● Interactive</span>
              </div>

              {sketchNotes.map((note) => {
                const isSelected = activeNote === note.id;
                return (
                  <motion.div
                    key={note.id}
                    layoutId={`sticky-${note.id}`}
                    whileHover={{
                      scale: 1.025,
                      rotate: 0,
                      transition: { type: "spring", stiffness: 400, damping: 15 },
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveNote(note.id)}
                    style={{ rotate: isSelected ? 0 : `${note.rotation}deg` }}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-shadow shadow-neo hover:shadow-neo-lg select-none ${
                      note.color
                    } ${note.darkColor} ${
                      isSelected
                        ? "ring-2 ring-accent shadow-neo-lg scale-[1.01]"
                        : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Washi Tape Accent */}
                    <div className="absolute -top-3 left-8 z-10">
                      <TapeSticker />
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-marker font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-current/30">
                        {note.badge}
                      </span>
                      <SketchStamp label={note.stamp} color={note.stampColor} />
                    </div>

                    <h3 className="font-marker font-bold text-xl sm:text-2xl mb-1 text-text-primary">
                      {note.title}
                    </h3>
                    <p className="text-base sm:text-lg font-marker font-bold leading-snug opacity-95 tracking-wide">
                      {note.annotation}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Right Column: Detailed Blueprint Workspace for Active Note */}
            <div className="lg:col-span-7 rounded-xl border-2 border-border bg-[#FBFBFA] dark:bg-[#121317] p-5 sm:p-7 shadow-neo-sm relative flex flex-col justify-between min-h-[380px]">
              {/* Paper Clip in corner */}
              <div className="absolute -top-5 right-8 z-10">
                <PaperClip />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold block">
                        {"// NO-CODE WORKFLOW PREVIEW"}
                      </span>
                      <h4 className="font-marker font-bold text-2xl sm:text-3xl text-text-primary">
                        {current.title}
                      </h4>
                    </div>

                    <SketchStamp label={current.stamp} color={current.stampColor} />
                  </div>

                  {/* Plain Language Summary */}
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                    {current.summary}
                  </p>

                  {/* Interactive Flow Preview */}
                  <div className="rounded-lg border-2 border-border bg-slate-900 text-slate-100 p-4 font-mono text-xs shadow-neo-sm relative overflow-x-auto">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 border-b border-slate-700 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-accent" />
                        interactive_pipeline_preview.log
                      </span>
                      <span className="text-[11px] font-marker font-bold uppercase tracking-wider text-amber-400">
                        ★ Fully Automated
                      </span>
                    </div>
                    <pre className="text-slate-200 leading-relaxed font-mono">
                      <code>{current.codeSnippet}</code>
                    </pre>
                  </div>

                  {/* Doodle Annotation Footer */}
                  <div className="p-3.5 rounded-lg border-2 border-dashed border-border bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200 flex items-start gap-3 text-xs font-mono">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-marker text-base sm:text-lg text-text-primary mb-0.5">
                        No Technical Background Needed:
                      </strong>
                      You don&apos;t have to write Python code, configure neural networks, or debug package installations. AutoMLens provides the rigorous engineering under the hood while giving you an intuitive, visual playground.
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
