"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Terminal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoodleUnderline, TapeSticker, SketchStamp, MarkerBadge, DoodleArrow } from "./doodle-elements";
import { HeroGridBackground } from "./hero-grid-background";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 350, damping: 20 },
  },
};

export function HeroSection() {
  return (
    <section id="hero-section" className="relative isolate pt-24 pb-20 sm:pt-36 sm:pb-32 lg:pt-40 border-b-2 border-border overflow-hidden bg-canvas">
      {/* Eye-Soothing Ambient Dual-Mesh Aurora (Cyan + Warm Amber) */}
      <div className="absolute -top-24 left-1/4 -translate-x-1/2 w-96 sm:w-[540px] h-96 sm:h-[480px] bg-cyan-500/10 dark:bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 translate-x-1/2 w-80 sm:w-[500px] h-80 sm:h-[440px] bg-amber-400/10 dark:bg-amber-400/6 rounded-full blur-[110px] pointer-events-none" />

      {/* Precision Grid with Lighting Animation (Light & Dark Mode) */}
      <HeroGridBackground />

      {/* Floating decorative sketch stickers in margins */}
      <div className="hidden xl:block absolute left-10 top-32 lg:top-36 pointer-events-none">
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-4, -2, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <SketchStamp label="NO CODING REQUIRED" sublabel="Drop in Any CSV or Excel" rotation="-rotate-6" />
        </motion.div>
      </div>

      <div className="hidden xl:block absolute right-12 top-36 lg:top-40 pointer-events-none">
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [3, 5, 3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <SketchStamp
            label="AI DATA ANALYST"
            sublabel="Chat & Plan with Gemini"
            color="border-purple-500 text-purple-600 dark:border-purple-400 dark:text-purple-300"
            rotation="rotate-6"
          />
        </motion.div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 text-center flex flex-col items-center"
      >
        {/* Top Feature Pill with Playful Marker Callout */}
        <motion.div variants={itemVariants} className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-pastel-cyan dark:bg-cyan-950/70 text-slate-900 dark:text-cyan-200 text-xs font-mono font-bold shadow-neo-sm cursor-default"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>CHAPTER 01 // NO-CODE AUTOMATED MACHINE LEARNING</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </motion.div>
          <MarkerBadge className="text-sm sm:text-base text-amber-500 dark:text-amber-400 font-bold ml-1" rotation="-rotate-3">
            ★ No Tech Background Needed!
          </MarkerBadge>
        </motion.div>

        {/* Main Headline with Marker Contrast */}
        <motion.h1
          variants={itemVariants}
          className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary max-w-4xl leading-[1.12] mb-6 relative"
        >
          Turn Raw Spreadsheets into Machine Learning Models —{" "}
          <span className="relative inline-block text-accent font-marker font-bold text-4xl sm:text-6xl lg:text-7xl -rotate-1 px-1">
            No Code Needed
            <span className="absolute -bottom-2 sm:-bottom-3 left-0 w-full text-accent pointer-events-none">
              <DoodleUnderline />
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-base lg:text-lg text-text-secondary max-w-2xl font-sans font-medium mb-8 leading-relaxed"
        >
          The human-friendly AutoML platform built for non-technical creators, analysts, and students. Simply upload your CSV or Excel file, collaborate with our interactive AI Data Analyst Assistant in plain English, and get transparent, explainable predictions in minutes.
          <span className="block font-marker text-lg sm:text-xl text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            ✏️ Zero Python syntax • Plain-English explainability • Automatic 1-click training.
          </span>
        </motion.p>

        {/* Bouncy Action CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 mb-10 relative"
        >
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 15 }}
          >
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-12 px-7 text-sm font-mono font-bold bg-accent text-white shadow-neo hover:shadow-neo-lg transition-all rounded-xl"
              >
                <span>Upload Dataset &amp; Begin</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 15 }}
          >
            <a href="#example">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-7 text-sm font-mono font-bold shadow-neo hover:shadow-neo-lg transition-all rounded-xl bg-surface"
              >
                <span>See It in Action</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Interactive Trust Badges with Bouncy Hover */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-mono font-bold text-text-muted"
        >
          {[
            { icon: ShieldCheck, label: "Zero Code Required", color: "text-emerald-500" },
            { icon: Sparkles, label: "AI Data Analyst Assistant", color: "text-accent" },
            { icon: Cpu, label: "ELI5 Plain-English Explanations", color: "text-amber-500" },
            { icon: Terminal, label: "1-Click Predictions & Exports", color: "text-cyan-500" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{
                  scale: 1.06,
                  y: -2,
                  rotate: idx % 2 === 0 ? -1 : 1,
                  transition: { type: "spring", stiffness: 500, damping: 14 },
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-border bg-surface shadow-neo-sm select-none cursor-default"
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-text-primary">{item.label}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
