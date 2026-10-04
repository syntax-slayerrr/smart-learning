"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      "aria-label": ariaLabel,
      children,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "h-9 w-9 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] rounded-xl text-sm",
      md: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-base",
      lg: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-2xl text-lg",
    };

    const variantStyles = {
      primary:
        "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 border border-transparent",
      secondary:
        "bg-card text-foreground border border-border hover:bg-muted/70 shadow-2xs",
      outline:
        "bg-transparent text-foreground border border-border hover:bg-muted/70",
      ghost: "bg-transparent text-foreground hover:bg-muted/70",
      glass:
        "bg-card/80 backdrop-blur-md text-foreground border border-border hover:bg-card/95",
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.96] cursor-pointer",
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
