"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.958] touch-manipulation hover:-translate-y-0.5";

    const sizeStyles = {
      sm: "h-9 min-h-[36px] sm:min-h-[44px] px-3.5 text-xs rounded-xl gap-1.5",
      md: "h-11 min-h-[44px] px-4 text-sm rounded-xl gap-2",
      lg: "h-12 min-h-[48px] px-6 text-base rounded-2xl gap-2.5",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-xl justify-center",
    };

    const variantStyles = {
      primary:
        "bg-[#007AFF] text-white shadow-sm hover:bg-[#0062CC] active:bg-[#004FB3] border border-transparent shadow-[0_2px_8px_rgba(0,122,255,0.25)]",
      secondary:
        "bg-white text-[#1D1D1F] border border-[rgba(60,60,67,0.12)] hover:bg-[#F2F2F0] hover:border-[rgba(60,60,67,0.2)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      outline:
        "bg-transparent text-[#1D1D1F] border border-[rgba(60,60,67,0.2)] hover:bg-[#F2F2F0]",
      ghost:
        "bg-transparent text-[#1D1D1F] hover:bg-[#F2F2F0] hover:text-[#1D1D1F]",
      destructive:
        "bg-[#FF3B30] text-white hover:bg-[#D70015] border border-transparent shadow-[0_2px_8px_rgba(255,59,48,0.25)]",
      glass:
        "bg-white/80 backdrop-blur-md text-[#1D1D1F] border border-[rgba(60,60,67,0.12)] hover:bg-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";
