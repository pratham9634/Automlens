import * as React from "react";
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertRowProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}

export function AlertRow({
  variant = "info",
  title,
  children,
  className,
  ...props
}: AlertRowProps) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    danger: AlertCircle,
    success: CheckCircle2,
  };

  const variantStyles = {
    info: "border-2 border-border bg-sky-50 dark:bg-sky-950/40 text-text-primary shadow-neo-sm",
    warning: "border-2 border-border bg-amber-50 dark:bg-amber-950/40 text-text-primary shadow-neo-sm",
    danger: "border-2 border-border bg-rose-50 dark:bg-rose-950/40 text-text-primary shadow-neo-sm",
    success: "border-2 border-border bg-emerald-50 dark:bg-emerald-950/40 text-text-primary shadow-neo-sm",
  };

  const iconColors = {
    info: "text-info",
    warning: "text-warning",
    danger: "text-danger",
    success: "text-success",
  };

  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-card text-xs leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", iconColors[variant])} />
      <div className="flex-1">
        {title && <div className="font-bold text-text-primary mb-0.5">{title}</div>}
        <div className="text-text-secondary">{children}</div>
      </div>
    </div>
  );
}
