"use client";

import React, { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, Sparkles, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ExplainerCardItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ExplainerTipItem {
  label: string;
  text: string;
  badge?: string;
  variant?: "success" | "danger" | "warning" | "neutral" | "accent";
}

export interface SectionExplainerGuideProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  cards: ExplainerCardItem[];
  tipsTitle?: string;
  tips?: ExplainerTipItem[];
  defaultOpen?: boolean;
}

export function SectionExplainerGuide({
  title,
  subtitle,
  badgeText = "For Non-Tech Users",
  cards,
  tipsTitle = "How to read and understand this section:",
  tips,
  defaultOpen = false,
}: SectionExplainerGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="border-2 border-accent/40 bg-accent/5 overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-accent/10 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
              <span>{title}</span>
              <Badge variant="optimal" size="sm" className="text-[10px]">
                {badgeText}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="text-accent flex items-center gap-1 text-xs font-mono shrink-0 ml-2">
          <span>{isOpen ? "Collapse" : "Open Guide"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <div className="am-collapse" data-open={isOpen}>
        <div>
          <div className="p-4 sm:p-5 pt-0 border-t border-accent/20 space-y-4 text-xs leading-relaxed">
            {/* Concept Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-surface border border-border space-y-1.5 shadow-xs"
                  >
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-accent shrink-0" />
                      <span>{card.title}</span>
                    </div>
                    <p className="text-text-secondary text-[11px] leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Practical Tips Box */}
            {tips && tips.length > 0 && (
              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border/80 font-mono text-[11px] text-text-secondary space-y-1.5">
                <div className="text-text-primary font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>{tipsTitle}</span>
                </div>
                <div className="space-y-1 pt-0.5">
                  {tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-accent select-none">•</span>
                      <div>
                        <strong className="text-text-primary">{tip.label}:</strong>{" "}
                        <span>{tip.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
