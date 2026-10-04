"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: Array<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center rounded-2xl bg-[#EBEBEB] p-1 border border-[rgba(60,60,67,0.06)] select-none",
        size === "sm" ? "h-9" : "h-11 min-h-[44px]",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] min-h-[36px] sm:min-h-[38px]",
              isSelected
                ? "bg-white text-[#1D1D1F] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[rgba(60,60,67,0.08)]"
                : "text-[#6E6E73] hover:text-[#1D1D1F] active:bg-white/40"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
