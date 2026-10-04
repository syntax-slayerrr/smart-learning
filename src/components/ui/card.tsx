import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "interactive";
}

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/10 shadow-xs",
    secondary:
      "bg-stone-50/80 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-white/10 shadow-xs",
    outline: "bg-transparent border border-stone-200 dark:border-white/10",
    interactive:
      "bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/10 shadow-xs hover:border-orange-500/40 hover:shadow-sm active:scale-[0.99] transition-all duration-150 cursor-pointer",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 text-stone-900 dark:text-stone-100",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-muted-foreground leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center pt-4 border-t border-border/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
