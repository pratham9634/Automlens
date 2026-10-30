import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "cyan" | "telemetry";
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
      "inline-flex items-center justify-center font-medium transition-all duration-160 ease-enter select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer font-sans";

    const variantStyles = {
      primary:
        "bg-accent text-white hover:bg-accent-hover hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-[0.98] border border-transparent shadow-sm",
      secondary:
        "bg-surface border border-border text-text-primary hover:bg-surface-hover hover:border-accent/40 active:bg-surface-subtle",
      outline:
        "bg-transparent border border-border text-text-primary hover:bg-surface-hover hover:border-accent/40 active:bg-surface-subtle",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-subtle",
      danger:
        "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] border border-transparent shadow-sm",
      cyan:
        "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(6,182,212,0.35)] active:scale-[0.98]",
      telemetry:
        "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(6,182,212,0.35)] active:scale-[0.98]",
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
