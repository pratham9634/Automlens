"use client";

import Link from "next/link";
import { Github, ExternalLink } from "lucide-react";
import { AutoMLensIcon } from "@/components/ui/logo";

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-border bg-surface/90 backdrop-blur-sm px-4 sm:px-8 py-8 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand + Punchy Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <Link href="/" className="flex items-center gap-2 group">
            <AutoMLensIcon size={24} />
            <span className="font-display text-sm tracking-tight text-text-primary uppercase font-bold">
              AutoM<span className="text-accent">Lens</span>
            </span>
          </Link>
          <span className="hidden sm:inline text-text-muted text-xs">•</span>
          <p className="text-xs text-text-secondary font-sans">
            No-code machine learning with human-first explainability.
          </p>
        </div>

        {/* Right: Sleek Quick Links & Live Status */}
        <div className="flex items-center flex-wrap justify-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready to Train</span>
          </div>

          <Link
            href="/dashboard"
            className="text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Dashboard
          </Link>

          <a
            href="https://github.com/pratham9634/Automlens.git"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 font-medium"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 font-medium"
          >
            <span>API Docs</span>
            <ExternalLink className="w-3 h-3 text-text-muted" />
          </a>
        </div>
      </div>

      {/* Bottom compact line */}
      <div className="max-w-7xl mx-auto pt-6 mt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-text-muted gap-2">
        <span>© 2026 AutoMLens. Designed for non-technical creators & researchers.</span>
        <span>100% Open &amp; Reproducible Architecture</span>
      </div>
    </footer>
  );
}
