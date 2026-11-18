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
      "inline-flex items-center justify-center font-bold tracking-tight transition-all duration-100 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 cursor-pointer font-sans";

    const variantStyles = {
      primary:
        "bg-accent text-white border-2 border-border shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-accent-hover",
      secondary:
        "bg-surface text-text-primary border-2 border-border shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-surface-hover",
      outline:
        "bg-transparent text-text-primary border-2 border-border shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-surface",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-subtle active:bg-surface-container border-2 border-transparent hover:border-border",
      danger:
        "bg-danger text-white border-2 border-border shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-danger/90",
      cyan:
        "bg-cyan-400 dark:bg-cyan-500 text-slate-950 font-black border-2 border-border shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      telemetry:
        "bg-cyan-500/15 border-2 border-cyan-500 text-cyan-600 dark:text-cyan-300 font-bold shadow-neo-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    };

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs rounded-button gap-1.5",
      md: "h-9 px-3.5 text-xs rounded-button gap-2",
      lg: "h-10 px-4 text-sm rounded-button gap-2.5",
      icon: "h-9 w-9 p-0 rounded-button",
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
