"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, ShieldCheck, Shield } from "lucide-react";

interface StudentRiskBadgeProps {
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore?: number;
  compact?: boolean;
}

const riskConfig = {
  low: {
    label: "Optimal",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: ShieldCheck,
    dotColor: "bg-emerald-600",
  },
  medium: {
    label: "Perlu Pantau",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Shield,
    dotColor: "bg-amber-500",
  },
  high: {
    label: "At-Risk",
    color: "bg-orange-50 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    dotColor: "bg-[#EA580C]",
  },
  critical: {
    label: "Kritis",
    color: "bg-red-50 text-red-800 border-red-200",
    icon: ShieldAlert,
    dotColor: "bg-red-600 animate-pulse",
  },
};

export function StudentRiskBadge({ riskLevel, riskScore, compact = false }: StudentRiskBadgeProps) {
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
          config.color
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotColor)} />
        {config.label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all",
        config.color
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
      {riskScore !== undefined && (
        <span className="ml-1 border-l border-current/20 pl-1.5 font-mono text-[11px] opacity-80">
          {(riskScore * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
