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
      className={`inline-flex items-center p-1 rounded-lg border-2 border-border bg-surface-subtle shadow-neo-sm text-text-primary transition-colors ${className}`}
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
            className={`flex items-center justify-center w-7 h-7 rounded-[6px] transition-all duration-100 cursor-pointer ${
              isActive
                ? "bg-surface text-text-primary border-2 border-border shadow-[2px_2px_0px_0px_var(--neo-shadow-color)] font-bold"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover border-2 border-transparent"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
