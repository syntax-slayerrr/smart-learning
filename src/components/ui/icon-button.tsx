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
        "bg-[#007AFF] text-white shadow-sm hover:bg-[#0062CC] border border-transparent",
      secondary:
        "bg-white text-[#1D1D1F] border border-[rgba(60,60,67,0.12)] hover:bg-[#F2F2F0] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      outline:
        "bg-transparent text-[#1D1D1F] border border-[rgba(60,60,67,0.2)] hover:bg-[#F2F2F0]",
      ghost: "bg-transparent text-[#1D1D1F] hover:bg-[#F2F2F0]",
      glass:
        "bg-white/80 backdrop-blur-md text-[#1D1D1F] border border-[rgba(60,60,67,0.12)] hover:bg-white/95",
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-95",
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
