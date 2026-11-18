"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  Sparkles,
  Check,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Download,
  Lock,
  ChevronRight,
  Play,
  Pause,
  Award,
} from "lucide-react";
import { TapeSticker, PaperClip, SketchStamp } from "../doodle-elements";

export function ConceptOrigamiStream() {
  const [activePhase, setActivePhase] = useState<number>(0);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Auto-play through the 4 acts if enabled
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActivePhase((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const phases = [
    {
      id: 0,
      number: "01",
      title: "Raw Sheet",
      tag: "Spreadsheet Ingest",
      desc: "Raw client table with missing cell coordinates.",
    },
    {
      id: 1,
      number: "02",
      title: "3D Origami Crease",
      tag: "Leak-Proof Clean",
      desc: "Folds along CV boundary; heals missing cells in gold ink.",
    },
    {
      id: 2,
      number: "03",
      title: "5-Card Kinetic Fan",
      tag: "CV Tournament",
      desc: "Fans out into 5 parallel tournament cards racing across cores.",
    },
    {
      id: 3,
      number: "04",
      title: "Royal Sealed Envelope",
      tag: "ELI5 Decision",
      desc: "Snaps into a wax-sealed executive report with 1-click export.",
    },
  ];

  const tournamentCards = [
    {
      fold: "FOLD 01",
      model: "Random Forest",
      score: "83.1%",
      latency: "340ms",
      params: "100 Trees · Gini",
      rotation: -16,
      offset: -130,
      isChampion: false,
    },
    {
      fold: "FOLD 02",
      model: "Logistic Reg",
      score: "79.2%",
      latency: "18ms",
      params: "L2 Penalty · C=1.0",
      rotation: -8,
      offset: -65,
      isChampion: false,
    },
    {
      fold: "FOLD 03",
      model: "LightGBM",
      score: "84.2%",
      latency: "124ms",
      params: "31 Leaves · EarlyStop",
      rotation: 0,
      offset: 0,
      isChampion: true,
    },
    {
      fold: "FOLD 04",
      model: "Gradient Boost",
      score: "82.8%",
      latency: "410ms",
      params: "100 Estimators · 0.1 LR",
      rotation: 8,
      offset: 65,
      isChampion: false,
    },
    {
      fold: "FOLD 05",
      model: "Dummy Baseline",
      score: "61.6%",
      latency: "1ms",
      params: "Most Frequent Guess",
      rotation: 16,
      offset: 130,
      isChampion: false,
    },
  ];

  return (
    <div className="relative rounded-3xl border-2 border-border bg-[#FCFAF5] dark:bg-[#11131C] p-6 sm:p-10 shadow-neo-lg overflow-hidden transition-colors">
      {/* Precision Blueprint / Moleskine Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.10] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(140, 120, 90, 0.28) 1.5px, transparent 1.5px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Controller Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-5 mb-8 font-mono text-xs relative z-10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-display text-sm font-bold text-text-primary uppercase tracking-wider">
            THE LIVING ORIGAMI STREAM
          </span>
          <span className="hidden sm:inline font-mono text-text-muted text-[11px]">
            [TACTILE 3D PAPER MORPHOLOGY]
          </span>
        </div>

        {/* Play / Pause Auto-Tour Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-3 py-1.5 rounded-xl border-2 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoPlaying
                ? "border-accent bg-accent text-white shadow-neo-sm"
                : "border-border bg-surface text-text-secondary hover:text-text-primary shadow-neo-sm"
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? "Pause Auto-Tour" : "Auto-Play Tour"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Apple-Style Phase Stepper */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-10 relative z-10">
        {phases.map((p) => {
          const isActive = activePhase === p.id;
          const isDone = activePhase > p.id;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActivePhase(p.id);
                setIsAutoPlaying(false);
              }}
              className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                isActive
                  ? "border-accent bg-accent/10 shadow-neo scale-[1.02]"
                  : isDone
                  ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-border bg-surface opacity-75 hover:opacity-100 hover:border-text-primary"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-mono text-xs font-black ${
                    isActive ? "text-accent" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"
                  }`}
                >
                  ACT {p.number}
                </span>
                <span
                  className={`text-[9px] font-marker font-bold px-1.5 py-0.2 rounded border ${
                    isActive
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-canvas text-text-secondary"
                  }`}
                >
                  {p.tag}
                </span>
              </div>
              <span className="font-display text-xs sm:text-sm font-bold text-text-primary block">
                {p.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          THE 3D ORIGAMI STAGE (Morphs between the 4 Acts with 3D Paper Physics)
         ========================================================================= */}
      <div
        className="relative min-h-[420px] flex items-center justify-center p-2 sm:p-4 z-10"
        style={{ perspective: "1200px" }}
      >
        <AnimatePresence mode="wait">
          
          {/* =====================================================================
              ACT 01: THE RAW SPREADSHEET SHEET
             ===================================================================== */}
          {activePhase === 0 && (
            <motion.div
              key="act-01"
              initial={{ opacity: 0, rotateX: 20, scale: 0.94 }}
              animate={{ opacity: 1, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, rotateX: -20, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
              className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl border-2 border-border bg-white dark:bg-[#181A26] shadow-neo-lg relative"
            >
              {/* Authentic Paper Tape in Corner */}
              <div className="absolute -top-3.5 left-10">
                <TapeSticker />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3 mb-5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-text-primary">Sales_Cohort_Q4.xlsx</span>
                  <span className="text-text-muted">(8,420 rows x 12 cols)</span>
                </div>
                <span className="text-[10px] font-marker font-bold px-2.5 py-0.5 rounded border border-rose-400 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200">
                  ⚠️ 142 Missing Cells Found
                </span>
              </div>

              {/* Realistic Tabular Spreadsheet Mock */}
              <div className="overflow-x-auto my-4">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-[11px]">
                      <th className="py-2 px-3">CustomerID</th>
                      <th className="py-2 px-3">Tenure (Mos)</th>
                      <th className="py-2 px-3">Monthly Spend</th>
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3">Target: Churn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-text-primary">
                    <tr>
                      <td className="py-2 px-3 font-sans font-bold">#4891</td>
                      <td className="py-2 px-3">24.0 mos</td>
                      <td className="py-2 px-3">$64.20</td>
                      <td className="py-2 px-3">Two-Year</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">0 (Retained)</td>
                    </tr>
                    <tr className="bg-rose-50/70 dark:bg-rose-950/30 ring-2 ring-rose-400/80 rounded">
                      <td className="py-2 px-3 font-sans font-bold">#4892</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] animate-pulse">
                          NaN [DIRTY]
                        </span>
                      </td>
                      <td className="py-2 px-3">$115.00</td>
                      <td className="py-2 px-3">Month-to-Month</td>
                      <td className="py-2 px-3 text-rose-600 font-bold">1 (Churned)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-bold">#4893</td>
                      <td className="py-2 px-3">8.5 mos</td>
                      <td className="py-2 px-3">$89.00</td>
                      <td className="py-2 px-3">One-Year</td>
                      <td className="py-2 px-3 text-emerald-600 font-bold">0 (Retained)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Step Forward Prompt */}
              <div className="mt-6 pt-4 border-t-2 border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-sans text-text-secondary">
                  Raw numbers loaded. Watch the document fold along the validation line to heal without data leakage.
                </span>
                <button
                  type="button"
                  onClick={() => setActivePhase(1)}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-neo hover:shadow-neo-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Fold Along CV Line</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* =====================================================================
              ACT 02: THE 3D ORIGAMI CREASE (ZERO LEAKAGE & GOLD INK HEALING)
             ===================================================================== */}
          {activePhase === 1 && (
            <motion.div
              key="act-02"
              initial={{ opacity: 0, rotateY: -35 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 35 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/80 bg-gradient-to-r from-cyan-50/70 via-white to-amber-50/70 dark:from-cyan-950/40 dark:via-[#161824] dark:to-amber-950/30 shadow-neo-lg relative"
            >
              {/* Paper Clip in Corner */}
              <div className="absolute -top-4 right-10">
                <PaperClip />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent animate-spin" />
                  <span className="font-display text-sm font-bold text-accent">
                    Fold Partitioning &amp; Gold-Ink Healing
                  </span>
                </div>
                <SketchStamp label="100% LEAK-FREE" color="border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300" />
              </div>

              {/* The 3D Central Origami Crease Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 font-mono text-xs">
                {/* Left Flap: Training Fold */}
                <div className="p-4 rounded-2xl border-2 border-cyan-400/80 bg-surface shadow-neo-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent text-[11px]">TRAINING FOLD (4 Folds)</span>
                    <span className="text-[10px] text-text-muted">6,736 rows</span>
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary leading-relaxed">
                    Median imputation and categorical encodings are fitted strictly on this side.
                  </p>
                  <div className="p-2.5 rounded-lg border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Row #4892 Tenure Imputed: 14.0 mos</span>
                  </div>
                </div>

                {/* Right Flap: Untouched Validation Fold */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-amber-400 bg-surface/80 shadow-neo-sm space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                      ISOLATED TEST FOLD
                    </span>
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary leading-relaxed">
                    Held completely blind. Never observes training distributions, ensuring your viva score is mathematically bulletproof.
                  </p>
                  <div className="p-2 rounded border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                    🔒 Zero Distribution Contamination
                  </div>
                </div>
              </div>

              {/* Step Forward Prompt */}
              <div className="mt-6 pt-4 border-t-2 border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-sans text-text-secondary">
                  Data cleaned and partitioned. Ready to fan out into 5 parallel tournament cards.
                </span>
                <button
                  type="button"
                  onClick={() => setActivePhase(2)}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-neo hover:shadow-neo-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Fan Out 5 Cards</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* =====================================================================
              ACT 03: THE 5-CARD KINETIC FAN TOURNAMENT
             ===================================================================== */}
          {activePhase === 2 && (
            <motion.div
              key="act-03"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="w-full max-w-3xl text-center py-2"
            >
              <div className="mb-2">
                <span className="text-xs font-mono font-bold text-text-muted block">
                  HOVER ANY TOURNAMENT CARD TO INSPECT REAL TELEMETRY:
                </span>
              </div>

              {/* 3D Kinetic Fanned Cards */}
              <div className="relative h-56 flex items-center justify-center my-4">
                {tournamentCards.map((card, idx) => {
                  const isHovered = hoveredCardIdx === idx;
                  return (
                    <motion.div
                      key={idx}
                      onMouseEnter={() => setHoveredCardIdx(idx)}
                      onMouseLeave={() => setHoveredCardIdx(null)}
                      initial={{ y: 30, rotate: 0 }}
                      animate={{
                        y: isHovered ? -22 : 0,
                        rotate: isHovered ? 0 : card.rotation,
                        scale: isHovered ? 1.08 : 1,
                        zIndex: isHovered ? 50 : 20 + idx,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={`w-40 sm:w-44 h-48 rounded-2xl border-2 border-border shadow-neo p-4 absolute flex flex-col justify-between text-left cursor-pointer transition-shadow select-none ${
                        card.isChampion
                          ? "bg-amber-300 text-slate-950 ring-4 ring-accent shadow-neo-lg"
                          : "bg-surface text-text-primary"
                      }`}
                      style={{
                        left: `calc(50% - 85px + ${card.offset * 1.05}px)`,
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider block">
                            {card.fold}
                          </span>
                          {card.isChampion && (
                            <span className="text-[10px] font-marker font-black bg-emerald-400 text-slate-950 px-1.5 py-0.2 rounded border border-slate-950">
                              ★ #1
                            </span>
                          )}
                        </div>

                        <span className="font-display font-bold text-sm sm:text-base block mt-1">
                          {card.model}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted block mt-0.5">
                          {card.params}
                        </span>
                      </div>

                      <div className="border-t border-current/20 pt-2 flex items-baseline justify-between">
                        <div>
                          <span className="font-display font-black text-xl block">
                            {card.score}
                          </span>
                          <span className="text-[9px] font-mono text-text-muted block">
                            F1 Macro
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold opacity-80">
                          {card.latency}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Step Forward Prompt */}
              <div className="mt-8 flex justify-center items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActivePhase(3)}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-neo hover:shadow-neo-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Seal Champion Envelope</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* =====================================================================
              ACT 04: THE ROYAL SEALED ENVELOPE (EXECUTIVE ELI5 REPORT)
             ===================================================================== */}
          {activePhase === 3 && (
            <motion.div
              key="act-04"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="w-full max-w-xl p-6 sm:p-8 rounded-3xl border-2 border-border bg-[#FFFDF5] dark:bg-[#151722] shadow-neo-lg relative"
            >
              {/* Embossed Golden Crown Wax Seal */}
              <div className="absolute -top-5 right-8">
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className="w-12 h-12 rounded-full border-2 border-amber-600 bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-neo cursor-pointer -rotate-6"
                >
                  👑
                </motion.div>
              </div>

              <div className="border-b-2 border-border pb-3 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-black block">
                  EXECUTIVE ARTIFACT // COMPLETED &amp; AUDITED
                </span>
                <h4 className="font-display text-lg font-bold text-text-primary">
                  Audited Production Model Report (LightGBM)
                </h4>
              </div>

              <div className="space-y-3 font-sans text-xs sm:text-sm text-text-secondary mb-5 leading-relaxed">
                <div className="p-3.5 rounded-xl border border-border bg-canvas">
                  <strong className="text-text-primary block font-display text-sm mb-1">
                    💡 Plain-English ELI5 Finding:
                  </strong>
                  &quot;High monthly fees ($115+) on Month-to-Month contracts are the #1 driver of customer departures. Shifting customers to an annual agreement decreases their churn probability from 84% down to 18%.&quot;
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs pt-1">
                  <div className="p-2.5 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-text-muted block">ACCURACY PEAK:</span>
                    <span className="font-bold text-accent text-sm">84.2% F1 Macro</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-text-muted block">LEAKAGE DEFENSE:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">0.00 Contamination</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-border">
                <button
                  type="button"
                  onClick={() => setActivePhase(0)}
                  className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay Origami Stream</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold shadow-neo hover:shadow-neo-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Production Artifacts</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}