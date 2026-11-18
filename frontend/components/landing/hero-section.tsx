"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Terminal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b-2 border-border overflow-hidden">
      {/* Background Accent Grid / Decors */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--neo-shadow-color)_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 text-center flex flex-col items-center">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-border bg-pastel-cyan dark:bg-cyan-950/70 text-slate-900 dark:text-cyan-200 text-xs font-mono font-bold shadow-neo-sm mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span>HYBRID AI DECISION ENGINE + LEAKAGE-SAFE AUTOML</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary max-w-4xl leading-[1.15] mb-6">
          Transparent, Leakage-Safe Machine Learning for{" "}
          <span className="text-accent underline decoration-4 decoration-border underline-offset-4">
            Tabular Data
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-text-secondary max-w-2xl font-sans font-medium mb-8 leading-relaxed">
          Engineered for academic credibility and enterprise reproducibility. Features strict 5-fold cross-validation inside each fold pipeline, Google Gemini 2.0 Flash reasoning, and Tree SHAP explainability.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-11 px-6 text-sm font-mono font-bold bg-accent text-white shadow-neo hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <a href="#example">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 text-sm font-mono font-bold shadow-neo hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <span>Explore Benchmark Demo</span>
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono font-bold text-text-muted">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border-2 border-border bg-surface shadow-neo-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Zero-Leakage Pipelines</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border-2 border-border bg-surface shadow-neo-sm">
            <Cpu className="w-3.5 h-3.5 text-accent" />
            <span>5-Fold Parallel CV</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border-2 border-border bg-surface shadow-neo-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gemini 2.0 Flash Copilot</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border-2 border-border bg-surface shadow-neo-sm">
            <Terminal className="w-3.5 h-3.5 text-cyan-500" />
            <span>PostgreSQL Audit Ledger</span>
          </div>
        </div>
      </div>
    </section>
  );
}
