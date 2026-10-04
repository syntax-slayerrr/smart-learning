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
    light: "bg-card/70 backdrop-blur-md border-border/60",
    medium: "bg-card/85 backdrop-blur-xl border-border/80",
    heavy: "bg-card/95 backdrop-blur-2xl border-border",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 text-foreground border shadow-xs",
        intensityStyles[intensity],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
