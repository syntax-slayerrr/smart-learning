import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[rgba(60,60,67,0.12)] bg-white p-5 apple-card shadow-[var(--shadow-subtle)] group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold text-[#6E6E73] truncate">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-[#1D1D1F] tabular">
            {value}
          </p>
          {description && (
            <p className="text-xs text-[#8E8E93] truncate">{description}</p>
          )}
          {trend && (
            <div className="pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  trend.positive
                    ? "bg-[#34C759]/10 text-[#34C759]"
                    : "bg-[#FF3B30]/10 text-[#FF3B30]"
                )}
              >
                <span>{trend.positive ? "↑" : "↓"}</span>
                <span className="font-semibold">{Math.abs(trend.value)}%</span>
                <span className="text-[#8E8E93] text-[11px] ml-0.5">
                  vs periode lalu
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-[#F2F2F0] p-2.5 text-[#1D1D1F] shrink-0 transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-5 w-5 text-[#1D1D1F]" />
        </div>
      </div>
    </div>
  );
}
