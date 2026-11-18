import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "streaming"
    | "optimal"
    | "custom";
  size?: "sm" | "md";
  withBeacon?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  withBeacon = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-surface-subtle border-border text-text-secondary",
    accent: "bg-sky-100 dark:bg-sky-950/80 border-border text-sky-800 dark:text-sky-300 font-bold",
    success: "bg-emerald-100 dark:bg-emerald-950/80 border-border text-emerald-800 dark:text-emerald-300 font-bold",
    warning: "bg-amber-100 dark:bg-amber-950/80 border-border text-amber-900 dark:text-amber-300 font-bold",
    danger: "bg-rose-100 dark:bg-rose-950/80 border-border text-rose-800 dark:text-rose-300 font-bold",
    info: "bg-blue-100 dark:bg-blue-950/80 border-border text-blue-800 dark:text-blue-300 font-bold",
    streaming:
      "bg-cyan-100 dark:bg-cyan-950/80 border-border text-cyan-800 dark:text-cyan-300 font-bold",
    optimal:
      "bg-yellow-200 dark:bg-yellow-900/60 border-border text-yellow-950 dark:text-yellow-300 font-bold",
    custom:
      "bg-purple-100 dark:bg-purple-950/80 border-border text-purple-800 dark:text-purple-300 font-bold",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] tracking-wider",
    md: "px-2.5 py-0.5 text-[11px] tracking-wider",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border-2 border-border shadow-[2px_2px_0px_0px_var(--neo-shadow-color)] font-mono uppercase select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {withBeacon && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
        </span>
      )}
      {children}
    </span>
  );
}
