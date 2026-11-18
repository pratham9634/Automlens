"use client";

import React from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { useELI5, ELI5_DICTIONARY } from "./eli5-context";

interface ELI5BadgeProps {
  termKey: keyof typeof ELI5_DICTIONARY | string;
  fallbackText?: string;
  className?: string;
}

export function ELI5Badge({ termKey, fallbackText, className = "" }: ELI5BadgeProps) {
  const { isELI5, getTerm } = useELI5();
  const def = getTerm(termKey);

  if (!isELI5) {
    return <span className={className}>{fallbackText || def.academic}</span>;
  }

  return (
    <span
      title={`🎓 Academic Term: ${def.academic}\n💡 Analogy: ${def.analogy}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 cursor-help transition-all ${className}`}
    >
      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
      <span className="font-marker font-bold text-xs tracking-wide">{def.simple}</span>
      <HelpCircle className="w-2.5 h-2.5 text-amber-400/70" />
    </span>
  );
}
