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
    default: "bg-[#007AFF]/10 text-[#007AFF] border-transparent",
    secondary: "bg-[#F2F2F0] text-[#1D1D1F] border-transparent",
    outline: "bg-transparent text-[#6E6E73] border-[rgba(60,60,67,0.2)]",
    success: "bg-[#34C759]/12 text-[#248A3D] border-transparent",
    warning: "bg-[#FF9F0A]/12 text-[#B26B00] border-transparent",
    destructive: "bg-[#FF3B30]/12 text-[#D70015] border-transparent",
    info: "bg-[#5E5CE6]/12 text-[#5E5CE6] border-transparent",
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
      dot: "bg-[#34C759]",
      bg: "bg-[#34C759]/10 text-[#248A3D] border-[rgba(52,199,89,0.2)]",
      defaultLabel: "Hadir",
    },
    izin: {
      dot: "bg-[#FF9F0A]",
      bg: "bg-[#FF9F0A]/10 text-[#B26B00] border-[rgba(255,159,10,0.2)]",
      defaultLabel: "Izin",
    },
    sakit: {
      dot: "bg-[#007AFF]",
      bg: "bg-[#007AFF]/10 text-[#007AFF] border-[rgba(0,122,255,0.2)]",
      defaultLabel: "Sakit",
    },
    alpa: {
      dot: "bg-[#FF3B30]",
      bg: "bg-[#FF3B30]/10 text-[#D70015] border-[rgba(255,59,48,0.2)]",
      defaultLabel: "Alpa",
    },
    belum: {
      dot: "bg-[#8E8E93]",
      bg: "bg-[#8E8E93]/10 text-[#6E6E73] border-[rgba(142,142,147,0.2)]",
      defaultLabel: "Belum",
    },
    active: {
      dot: "bg-[#34C759] animate-pulse",
      bg: "bg-[#34C759]/10 text-[#248A3D] border-[rgba(52,199,89,0.2)]",
      defaultLabel: "Live",
    },
    standby: {
      dot: "bg-[#8E8E93]",
      bg: "bg-[#8E8E93]/10 text-[#6E6E73] border-[rgba(142,142,147,0.2)]",
      defaultLabel: "Standby",
    },
    warning: {
      dot: "bg-[#FF9F0A] animate-pulse",
      bg: "bg-[#FF9F0A]/10 text-[#B26B00] border-[rgba(255,159,10,0.2)]",
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
