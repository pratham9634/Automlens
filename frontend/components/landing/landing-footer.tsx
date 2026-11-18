"use client";

import Link from "next/link";
import { Github, ExternalLink, ShieldCheck, Heart } from "lucide-react";
import { AutoMLensIcon } from "@/components/ui/logo";

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-border bg-surface px-4 sm:px-8 py-12 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Left: Brand & Attribution */}
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-2.5">
            <AutoMLensIcon size={28} />
            <span className="font-display text-sm tracking-tight text-text-primary uppercase font-bold">
              AutoM<span className="text-accent">Lens</span>
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-border bg-pastel-cyan text-slate-950">
              OPEN PLATFORM
            </span>
          </div>
          <p className="text-xs text-text-secondary font-sans leading-relaxed">
            Human-Assisted AutoML Platform for Tabular Data. B.Tech Final-Year Minor Project engineered with 100% offline reproducible heuristics, Google Gemini 2.0 Flash reasoning, and strict 5-fold CV leakage prevention.
          </p>
          <div className="text-[11px] font-mono text-text-muted">
            Developer: <strong className="text-text-primary">Pratham Petwal</strong> • 2026
          </div>
        </div>

        {/* Right: Quick Links & Tech Stack */}
        <div className="flex flex-wrap gap-8 text-xs font-mono">
          <div>
            <div className="font-bold text-text-primary uppercase tracking-wider mb-2.5">
              Workspace
            </div>
            <ul className="space-y-1.5 text-text-secondary">
              <li>
                <Link href="/dashboard" className="hover:text-text-primary transition-colors">
                  &gt; Dashboard
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-text-primary transition-colors">
                  &gt; Sign In
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-text-primary transition-colors">
                  &gt; Create Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-text-primary uppercase tracking-wider mb-2.5">
              Source & Docs
            </div>
            <ul className="space-y-1.5 text-text-secondary">
              <li>
                <a
                  href="https://github.com/pratham9634/Automlens.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>FastAPI Swagger</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-text-muted gap-2">
        <span>© 2026 AutoMLens. All rights reserved.</span>
        <span>Built with Next.js, FastAPI, scikit-learn & Google Gemini</span>
      </div>
    </footer>
  );
}
