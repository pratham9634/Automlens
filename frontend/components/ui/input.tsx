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
          "flex h-9 w-full rounded-input border-2 bg-surface px-3 py-1 text-xs text-text-primary font-mono shadow-neo-sm transition-all duration-100",
          "placeholder:text-text-muted/70",
          "focus-visible:outline-none",
          error
            ? "border-danger focus-visible:border-danger focus-visible:shadow-neo"
            : "border-border focus-visible:border-accent focus-visible:shadow-neo focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
