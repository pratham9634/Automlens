"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Database, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoodleUnderline, SketchStamp } from "./doodle-elements";

export function StoryCtaSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas relative overflow-hidden">
      {/* Top Transition Soft Gradient Melt from Workflow Section */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#F8F9FA]/80 dark:from-[#0E1017] to-transparent pointer-events-none" />

      {/* Ambient Eye-Soothing Halo Glow behind CTA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-cyan-500/8 dark:bg-cyan-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Subtle Floating Star Watermarks in Negative Space */}
      <div className="hidden md:block absolute top-12 left-16 text-accent/15 font-marker text-3xl select-none pointer-events-none rotate-12">
        ★
      </div>
      <div className="hidden md:block absolute bottom-12 right-20 text-amber-500/15 font-marker text-4xl select-none pointer-events-none -rotate-12">
        ★
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="relative rounded-3xl border-2 border-border bg-pastel-cyan/20 dark:bg-cyan-950/20 p-8 sm:p-12 md:p-16 text-center shadow-neo-lg overflow-hidden"
        >
          {/* Subtle Background Accents */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Stamp in Top Right */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <SketchStamp
              label="READY IN SECONDS"
              sublabel="No Coding Required"
              rotation="rotate-3"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-border bg-white dark:bg-surface text-xs font-mono font-bold shadow-neo-sm mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span>START YOUR NO-CODE WORKSPACE</span>
            <span className="font-marker text-sm font-bold text-amber-500 dark:text-amber-400 -rotate-2 ml-1">★ Zero Setup</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-4 leading-tight">
            Ready to Turn Spreadsheets into{" "}
            <span className="relative inline-block text-accent font-marker font-bold text-4xl sm:text-6xl -rotate-1 px-1">
              Smart Predictions
              <span className="absolute -bottom-2 left-0 w-full text-accent pointer-events-none">
                <DoodleUnderline />
              </span>
            </span>
            ?
          </h2>

          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto font-sans mb-10 leading-relaxed">
            Drop in your CSV or Excel spreadsheet. Get instant data health audits, advice from your built-in AI Data Analyst, and automated models with plain-English explainability.
            <span className="block font-marker text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-2">
              ✏️ Free forever for students, researchers, and everyday teams.
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 14 }}
            >
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-12 px-8 text-sm font-mono font-bold bg-accent text-white shadow-neo hover:shadow-neo-lg transition-all rounded-xl"
                >
                  <Database className="w-4 h-4 mr-2" />
                  <span>Start Free Without Code</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 14 }}
            >
              <Link href="/sign-in">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-7 text-sm font-mono font-bold shadow-neo hover:shadow-neo-lg transition-all rounded-xl bg-surface"
                >
                  <span>Sign In</span>
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
