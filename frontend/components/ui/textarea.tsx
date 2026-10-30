import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex min-h-[80px] w-full rounded-input border bg-surface px-3 py-2 text-xs text-text-primary font-mono transition-all duration-160",
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
Textarea.displayName = "Textarea";
