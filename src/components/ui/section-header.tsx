import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2",
        className
      )}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-[#6E6E73] mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 pt-1 sm:pt-0">{action}</div>}
    </div>
  );
}
