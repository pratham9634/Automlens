import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accentTop?: "azure" | "cyan" | "indigo" | "none";
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accentTop = "none", interactive = false, children, ...props }, ref) => {
    const accentStyles = {
      none: "",
      azure: "border-t-4 border-t-accent",
      cyan: "border-t-4 border-t-secondary",
      indigo: "border-t-4 border-t-tertiary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-card border-2 border-border bg-surface text-text-primary transition-all duration-150 shadow-neo",
          interactive && "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg cursor-pointer",
          accentStyles[accentTop],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-5 border-b-2 border-border bg-surface-subtle/30 rounded-t-[calc(var(--radius-card)-2px)]", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-sm sm:text-base font-bold tracking-tight text-text-primary font-sans", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-text-muted font-sans leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-4 sm:p-5 pt-0 border-t-2 border-border mt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
