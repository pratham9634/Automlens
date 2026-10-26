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
    info: "border-info/30 bg-info/5 text-text-primary",
    warning: "border-warning/30 bg-warning/5 text-text-primary",
    danger: "border-danger/30 bg-danger/5 text-text-primary",
    success: "border-success/30 bg-success/5 text-text-primary",
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
        "flex items-start gap-2.5 p-3 rounded-card border text-xs leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", iconColors[variant])} />
      <div className="flex-1">
        {title && <div className="font-medium text-text-primary mb-0.5">{title}</div>}
        <div className="text-text-secondary">{children}</div>
      </div>
    </div>
  );
}
