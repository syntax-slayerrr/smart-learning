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
      "relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "h-9 min-h-[36px] sm:min-h-[44px] px-3.5 text-xs rounded-lg gap-1.5",
      md: "h-11 min-h-[44px] px-4 text-sm rounded-xl gap-2",
      lg: "h-12 min-h-[48px] px-6 text-base rounded-xl gap-2.5",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-xl justify-center",
    };

    const variantStyles = {
      primary:
        "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 border border-orange-700/20 shadow-xs",
      secondary:
        "bg-white dark:bg-zinc-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-zinc-800 active:bg-stone-100 shadow-xs",
      outline:
        "bg-transparent text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-white/10 hover:bg-stone-100/60 dark:hover:bg-zinc-800",
      ghost:
        "bg-transparent text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-100",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-700/20 shadow-xs",
      glass:
        "bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md text-stone-900 dark:text-stone-100 border border-stone-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-zinc-900 shadow-xs",
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
