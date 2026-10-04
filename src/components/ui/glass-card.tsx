import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "light" | "medium" | "heavy";
}

export function GlassCard({
  className,
  intensity = "medium",
  children,
  ...props
}: GlassCardProps) {
  const intensityStyles = {
    light: "bg-white/70 backdrop-blur-md border-[rgba(60,60,67,0.1)]",
    medium: "bg-white/85 backdrop-blur-xl border-[rgba(60,60,67,0.12)]",
    heavy: "bg-white/95 backdrop-blur-2xl border-[rgba(60,60,67,0.16)]",
  };

  return (
    <div
      className={cn(
        "rounded-[20px] p-5 text-[#1D1D1F] border shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
        intensityStyles[intensity],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
