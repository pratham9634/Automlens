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
          "flex min-h-[80px] w-full rounded-input border-2 bg-surface px-3 py-2 text-xs text-text-primary font-mono shadow-neo-sm transition-all duration-100",
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
Textarea.displayName = "Textarea";
