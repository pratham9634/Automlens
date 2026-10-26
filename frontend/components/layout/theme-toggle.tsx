"use client";

import React, { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center gap-1 p-0.5 rounded-lg border border-border bg-surface-subtle text-text-muted ${className}`}
        aria-hidden="true"
      >
        <div className="w-7 h-7 flex items-center justify-center rounded-md">
          <Laptop className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Laptop },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={`inline-flex items-center p-0.5 rounded-[8px] border border-border bg-surface-subtle text-text-muted transition-colors ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            aria-label={`${opt.label} theme`}
            title={`${opt.label} theme`}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center justify-center w-7 h-7 rounded-[6px] transition-all duration-150 ${
              isActive
                ? "bg-surface text-text-primary shadow-sm border border-border/80 font-medium"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-hover/50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
