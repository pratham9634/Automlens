import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variantStyles = {
      primary:
        "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover/90 border border-transparent",
      secondary:
        "bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-border-strong active:bg-surface-subtle",
      outline:
        "bg-transparent border border-border text-text-primary hover:bg-surface-hover active:bg-surface-subtle",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-subtle",
      danger:
        "bg-danger text-white hover:bg-danger/90 active:bg-danger/80 border border-transparent",
    };

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs rounded-button gap-1.5",
      md: "h-9 px-3.5 text-xs rounded-button gap-2",
      lg: "h-10 px-4 text-sm rounded-button gap-2.5",
      icon: "h-8 w-8 p-0 rounded-button",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
