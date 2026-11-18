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
            "flex h-9 w-full appearance-none rounded-input border-2 bg-surface px-3 py-1 pr-8 text-xs font-medium text-text-primary shadow-neo-sm transition-all duration-100 cursor-pointer",
            "focus-visible:outline-none",
            error
              ? "border-danger focus-visible:border-danger focus-visible:shadow-neo"
              : "border-border focus-visible:border-accent focus-visible:shadow-neo focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5",
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
