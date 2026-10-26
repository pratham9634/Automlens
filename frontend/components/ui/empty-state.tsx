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
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-card border border-dashed border-border bg-surface/50",
        className
      )}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center mb-3 text-text-muted">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="card-title text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
