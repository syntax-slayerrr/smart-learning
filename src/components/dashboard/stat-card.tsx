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
        "card-3d-ceramic p-5 group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            {title}
          </p>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-400 truncate">{description}</p>
          )}
          {trend && (
            <div className="pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  trend.positive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-rose-50 text-rose-700 border border-rose-200/60"
                )}
              >
                <span>{trend.positive ? "↑" : "↓"}</span>
                <span className="font-semibold">{Math.abs(trend.value)}%</span>
                <span className="text-slate-400 text-[11px] ml-0.5">
                  vs periode lalu
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-sm">
          <Icon className="h-5 w-5 stroke-[1.8]" />
        </div>
      </div>
    </div>
  );
}
