import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accentTop?: "azure" | "cyan" | "indigo" | "none";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accentTop = "none", children, ...props }, ref) => {
    const accentStyles = {
      none: "",
      azure: "border-t-2 border-t-accent",
      cyan: "border-t-2 border-t-secondary",
      indigo: "border-t-2 border-t-tertiary",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-card border border-border/80 bg-surface text-text-primary transition-all duration-160 shadow-sm",
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
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-5 border-b border-border/60", className)}
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
    className={cn("text-sm sm:text-base font-semibold tracking-tight text-text-primary font-sans", className)}
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
      "flex items-center p-4 sm:p-5 pt-0 border-t border-border/60 mt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
