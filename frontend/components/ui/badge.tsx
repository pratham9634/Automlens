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
    accent: "bg-accent/12 border-accent/30 text-accent font-medium",
    success: "bg-success/12 border-success/30 text-success font-medium",
    warning: "bg-warning/12 border-warning/30 text-warning font-medium",
    danger: "bg-danger/12 border-danger/30 text-danger font-medium",
    info: "bg-info/12 border-info/30 text-info font-medium",
    streaming:
      "bg-cyan-500/12 border-cyan-500/35 text-cyan-400 font-medium shadow-[0_0_8px_rgba(6,182,212,0.25)]",
    optimal:
      "bg-sky-500/12 border-sky-500/35 text-sky-400 font-medium shadow-[0_0_8px_rgba(14,165,233,0.25)]",
    custom:
      "bg-indigo-500/12 border-indigo-500/35 text-indigo-400 font-medium shadow-[0_0_8px_rgba(99,102,241,0.25)]",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px] tracking-wide",
    md: "px-2 py-0.5 text-[11px] tracking-wider",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border font-mono uppercase select-none",
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
