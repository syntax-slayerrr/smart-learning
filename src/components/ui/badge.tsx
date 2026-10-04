import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive"
    | "info";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    secondary: "bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-white/10",
    outline: "bg-transparent text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-white/10",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    destructive: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium gap-1",
    md: "text-xs px-2.5 py-1 font-semibold gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export interface StatusBadgeProps {
  status: "hadir" | "izin" | "sakit" | "alpa" | "belum" | "active" | "standby" | "warning";
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusConfig = {
    hadir: {
      dot: "bg-emerald-600 dark:bg-emerald-400",
      bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      defaultLabel: "Hadir",
    },
    izin: {
      dot: "bg-amber-600 dark:bg-amber-400",
      bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      defaultLabel: "Izin",
    },
    sakit: {
      dot: "bg-sky-600 dark:bg-sky-400",
      bg: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
      defaultLabel: "Sakit",
    },
    alpa: {
      dot: "bg-destructive dark:bg-red-400",
      bg: "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/20",
      defaultLabel: "Alpa",
    },
    belum: {
      dot: "bg-muted-foreground/60",
      bg: "bg-muted text-muted-foreground border-border",
      defaultLabel: "Belum",
    },
    active: {
      dot: "bg-emerald-500 animate-pulse",
      bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      defaultLabel: "Live",
    },
    standby: {
      dot: "bg-muted-foreground/60",
      bg: "bg-muted text-muted-foreground border-border",
      defaultLabel: "Standby",
    },
    warning: {
      dot: "bg-primary animate-pulse",
      bg: "bg-primary/10 text-primary border-primary/20",
      defaultLabel: "Perhatian",
    },
  };

  const config = statusConfig[status] || statusConfig.belum;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border select-none",
        config.bg,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      <span>{label || config.defaultLabel}</span>
    </span>
  );
}
