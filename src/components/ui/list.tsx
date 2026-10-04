import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "inset" | "plain" | "cards";
}

export function List({
  className,
  variant = "inset",
  children,
  ...props
}: ListProps) {
  const variantStyles = {
    inset:
      "divide-y divide-[rgba(60,60,67,0.08)] rounded-[20px] bg-white border border-[rgba(60,60,67,0.12)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden",
    plain: "divide-y divide-[rgba(60,60,67,0.08)] bg-transparent",
    cards: "space-y-2.5 bg-transparent",
  };

  return (
    <div className={cn("w-full", variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}

export interface ListRowProps {
  className?: string;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metadata?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  isCard?: boolean;
  id?: string;
}

export function ListRow({
  className,
  leading,
  title,
  subtitle,
  metadata,
  trailing,
  chevron = false,
  onClick,
  isCard = false,
  id,
}: ListRowProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="flex-shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#1D1D1F] truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-[#6E6E73] truncate mt-0.5">
              {subtitle}
            </div>
          )}
          {metadata && (
            <div className="text-[11px] text-[#8E8E93] truncate mt-0.5">
              {metadata}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {trailing}
        {chevron && (
          <ChevronRight className="h-4 w-4 text-[#8E8E93] ml-1 flex-shrink-0" />
        )}
      </div>
    </>
  );

  const sharedClasses = cn(
    "flex w-full items-center justify-between gap-3 px-4 py-3.5 min-h-[52px] text-left transition-colors duration-150 select-none",
    isCard
      ? "rounded-2xl bg-white border border-[rgba(60,60,67,0.12)] shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-[rgba(60,60,67,0.2)]"
      : "hover:bg-[#F7F7F5]/80 active:bg-[#F2F2F0]",
    className
  );

  if (onClick) {
    return (
      <button
        id={id}
        type="button"
        onClick={onClick}
        className={cn(
          sharedClasses,
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-inset"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div id={id} className={sharedClasses}>
      {content}
    </div>
  );
}
