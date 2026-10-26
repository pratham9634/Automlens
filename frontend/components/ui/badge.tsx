import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-surface-subtle border-border text-text-secondary",
    accent: "bg-accent/10 border-accent/25 text-accent font-medium",
    success: "bg-success/10 border-success/25 text-success font-medium",
    warning: "bg-warning/10 border-warning/25 text-warning font-medium",
    danger: "bg-danger/10 border-danger/25 text-danger font-medium",
    info: "bg-info/10 border-info/25 text-info font-medium",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-[11px]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border font-mono tracking-tight",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
