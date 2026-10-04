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
      "bg-white border border-[rgba(60,60,67,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
    secondary:
      "bg-[#F7F7F5] border border-[rgba(60,60,67,0.08)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]",
    outline: "bg-transparent border border-[rgba(60,60,67,0.16)]",
    interactive:
      "bg-white border border-[rgba(60,60,67,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[rgba(60,60,67,0.2)] active:scale-[0.99] transition-all duration-200 cursor-pointer",
  };

  return (
    <div
      className={cn(
        "rounded-[20px] p-5 text-[#1D1D1F]",
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
        "text-base font-semibold tracking-tight text-[#1D1D1F]",
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
    <p className={cn("text-xs text-[#6E6E73] leading-relaxed", className)} {...props}>
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
        "flex items-center pt-4 border-t border-[rgba(60,60,67,0.08)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
