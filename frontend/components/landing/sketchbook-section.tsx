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
    id: "leakage-trap",
    title: "1. The Hidden Leakage Trap",
    badge: "The Problem",
    color: "bg-[#FFF9C4] text-amber-950 border-[#FBC02D]", // Sticky Yellow
    darkColor: "dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-600/50",
    rotation: -2.5,
    annotation: "Why 90% of beginner AutoML pipelines secretly fail the viva defense.",
    summary:
      "Most naive scripts fit StandardScaler or SimpleImputer on the full dataset before splitting train/test. That leaks future distributions into the evaluation fold. The test scores look amazing (0.95), but fail in real life.",
    codeSnippet: "# ❌ WRONG (Data Leakage):\nimputer.fit(Full_Dataset)\nscores = cross_val(Full_Dataset)",
    stamp: "LEAKAGE DETECTED",
    stampColor: "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400",
  },
  {
    id: "fold-isolation",
    title: "2. The Fold-Isolated Pipeline",
    badge: "The AutoMLens Architecture",
    color: "bg-[#E1F5FE] text-sky-950 border-[#81D4FA]", // Sticky Blue
    darkColor: "dark:bg-sky-950/70 dark:text-sky-100 dark:border-sky-600/50",
    rotation: 1.8,
    annotation: "All transformations encapsulated strictly inside each cross-validation fold.",
    summary:
      "AutoMLens builds dynamic `sklearn.Pipeline` objects where imputation, one-hot encoding, and feature scaling are isolated per fold. Folds never observe test distributions during training.",
    codeSnippet: "# ✅ AutoMLens Method:\npipeline = Pipeline([\n  ('prep', FoldLocalTransformer()),\n  ('model', LightGBM())\n])\ncross_validate(pipeline, X, y, cv=5)",
    stamp: "100% VIVA-PROOF",
    stampColor: "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300",
  },
  {
    id: "gemini-copilot",
    title: "3. The Gemini Reasoning Copilot",
    badge: "Human-in-the-Loop",
    color: "bg-[#F3E5F5] text-purple-950 border-[#CE93D8]", // Sticky Lavender
    darkColor: "dark:bg-purple-950/70 dark:text-purple-100 dark:border-purple-600/50",
    rotation: -1.2,
    annotation: "No mystery black boxes. Google Gemini 2.0 Flash explains every single choice.",
    summary:
      "Instead of opaque hyperparameter guesses, the hybrid AI reasoning engine inspects dataset cardinality and user objectives ('minimize churn', 'penalize false negatives') to propose models with clear explanations.",
    codeSnippet: "# Gemini Prompt Rationale:\n\"Selected LightGBM + Macro F1.\nEngineered FamilySize from\nSibSp + Parch. Handled high-skew Fare.\"",
    stamp: "HUMAN-VERIFIED",
    stampColor: "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300",
  },
];

export function SketchbookSection() {
  const [activeNote, setActiveNote] = useState<string>("fold-isolation");

  const current = sketchNotes.find((n) => n.id === activeNote) || sketchNotes[1];

  return (
    <section id="sketchbook" className="py-20 sm:py-28 border-b-2 border-border bg-[#F7F5EE] dark:bg-[#121316] relative overflow-hidden transition-colors">
      {/* Notebook Grid / Graph Paper Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(120, 110, 90, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 110, 90, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-border bg-white dark:bg-surface shadow-neo-sm text-xs font-mono font-bold text-accent mb-3">
            <Bookmark className="w-3.5 h-3.5" />
            <span>CHAPTER 02 // ARCHITECT&apos;S LAB SKETCHBOOK</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-3">
            Inside the Engineer&apos;s Field Notes
          </h2>

          <p className="text-sm sm:text-base text-text-secondary font-sans max-w-2xl mx-auto">
            Before writing a single line of production code, here is how AutoMLens solves the two biggest dilemmas in machine learning:{" "}
            <span className="font-bold text-text-primary">Data Leakage</span> and{" "}
            <span className="font-bold text-text-primary">Black-Box Opacity</span>.
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
                <span>TAP A STICKY NOTE TO INSPECT:</span>
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
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded border border-current/30">
                        {note.badge}
                      </span>
                      <SketchStamp label={note.stamp} color={note.stampColor} />
                    </div>

                    <h3 className="font-display font-bold text-base sm:text-lg mb-1">
                      {note.title}
                    </h3>
                    <p className="text-xs font-mono leading-relaxed opacity-90">
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
                        {"// BLUEPRINT BREAKDOWN"}
                      </span>
                      <h4 className="font-display font-bold text-xl text-text-primary">
                        {current.title}
                      </h4>
                    </div>

                    <SketchStamp label={current.stamp} color={current.stampColor} />
                  </div>

                  {/* Plain Language Summary */}
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                    {current.summary}
                  </p>

                  {/* Code Snippet Sketch */}
                  <div className="rounded-lg border-2 border-border bg-slate-900 text-slate-100 p-4 font-mono text-xs shadow-neo-sm relative overflow-x-auto">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 border-b border-slate-700 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-accent" />
                        pipeline_architecture.py
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">
                        Academic Standard
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
                      <strong className="block text-text-primary mb-0.5">Viva Defense Guarantee:</strong>
                      Whenever examiners ask how you ensured valid out-of-fold generalization, AutoMLens provides the exact timestamped scikit-learn Pipeline graph in your project audit ledger.
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
