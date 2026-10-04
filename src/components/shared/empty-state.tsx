import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]",
        className
      )}
    >
      {icon && (
        <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F5] border border-[rgba(60,60,67,0.08)] text-[#8E8E93]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[#6E6E73] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
