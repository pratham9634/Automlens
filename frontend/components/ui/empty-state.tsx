import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-card border-2 border-dashed border-border bg-surface shadow-neo",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-lg bg-surface-subtle border-2 border-border shadow-neo-sm flex items-center justify-center mb-3 text-text-primary">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
