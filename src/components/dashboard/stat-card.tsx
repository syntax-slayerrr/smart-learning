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
        "rounded-2xl border border-border bg-card p-5 apple-card shadow-xs group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground/80 truncate">{description}</p>
          )}
          {trend && (
            <div className="pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                  trend.positive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                <span>{trend.positive ? "↑" : "↓"}</span>
                <span className="font-semibold font-mono">{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground text-[11px] ml-0.5">
                  vs periode lalu
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-muted p-2.5 text-foreground shrink-0 transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}
