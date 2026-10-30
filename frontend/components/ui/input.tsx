import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-input border bg-surface px-3 py-1 text-xs text-text-primary font-mono transition-all duration-160",
          "placeholder:text-text-muted/70",
          "focus-visible:outline-none focus-visible:ring-1",
          error
            ? "border-danger focus-visible:border-danger focus-visible:ring-danger"
            : "border-border/80 focus-visible:border-accent focus-visible:ring-accent focus-visible:shadow-[0_0_8px_rgba(6,182,212,0.3)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
