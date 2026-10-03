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
        "rounded-xl border border-[#E7E2DA] bg-white p-5 card-hover shadow-2xs transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-stone-500 truncate">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-stone-900 tabular-nums">
            {value}
          </p>
          {description && (
            <p className="text-xs text-stone-500 truncate">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium font-mono",
                trend.positive ? "text-emerald-700" : "text-red-600"
              )}
            >
              <span>{trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
              <span className="text-stone-400 font-sans text-[10px]">
                vs periode lalu
              </span>
            </p>
          )}
        </div>
        <div className="rounded-lg bg-[#EA580C]/[0.08] border border-[#EA580C]/15 p-2.5 text-[#EA580C] shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
