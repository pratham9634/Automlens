import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full appearance-none rounded-input border bg-surface px-3 py-1 pr-8 text-xs text-text-primary transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-1",
            error
              ? "border-danger focus-visible:border-danger focus-visible:ring-danger"
              : "border-border focus-visible:border-accent focus-visible:ring-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 w-4 h-4 text-text-muted" />
      </div>
    );
  }
);
Select.displayName = "Select";
