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
      "divide-y divide-border rounded-2xl bg-card border border-border shadow-xs overflow-hidden",
    plain: "divide-y divide-border bg-transparent",
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
          <div className="text-sm font-semibold text-foreground truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </div>
          )}
          {metadata && (
            <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5 font-mono">
              {metadata}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {trailing}
        {chevron && (
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-1 flex-shrink-0" />
        )}
      </div>
    </>
  );

  const sharedClasses = cn(
    "flex w-full items-center justify-between gap-3 px-4 py-3.5 min-h-[52px] text-left transition-colors duration-150 select-none",
    isCard
      ? "rounded-xl bg-card border border-border shadow-xs hover:border-border/80"
      : "hover:bg-muted/50 active:bg-muted/80",
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
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset apple-press"
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
