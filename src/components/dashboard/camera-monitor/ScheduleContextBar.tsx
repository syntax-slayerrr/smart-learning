"use client";

import React from "react";
import { Clock, FileText, ChevronDown } from "lucide-react";
import { ScheduleContext } from "./types";

interface ScheduleContextBarProps {
  schedule: ScheduleContext | null;
  isLoading: boolean;
  classes?: { id: string; name: string }[];
  selectedClassId?: string | null;
  onSelectClass?: (classId: string) => void;
  onOpenSessionSummary?: () => void;
}

/**
 * ScheduleContextBar — Versi ramping dengan Class Selector & Akses Ringkasan Sesi.
 */
export function ScheduleContextBar({
  schedule,
  isLoading,
  classes = [],
  selectedClassId,
  onSelectClass,
  onOpenSessionSummary,
}: ScheduleContextBarProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 animate-pulse flex items-center justify-between text-xs">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    );
  }

  const renderClassSelector = () => {
    if (classes.length > 1 && onSelectClass) {
      return (
        <div className="relative inline-flex items-center">
          <select
            value={selectedClassId || ""}
            onChange={(e) => onSelectClass(e.target.value)}
            className="appearance-none bg-muted/60 hover:bg-muted text-foreground text-[11px] font-bold rounded px-1.5 py-0.5 pr-4 border border-border/60 cursor-pointer transition-colors focus:outline-none"
            title="Pilih Kelas yang Dimonitor"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground absolute right-1 pointer-events-none" />
        </div>
      );
    }
    return (
      <span className="font-bold text-foreground text-[11px] px-1 py-0.5 bg-muted/50 rounded border border-border/50">
        {schedule?.class_name || "Kelas"}
      </span>
    );
  };

  if (!schedule || !schedule.active) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 flex items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          {renderClassSelector()}
          <span className="truncate text-[11px]">Tidak ada jam aktif</span>
        </div>
        {schedule?.server_time && (
          <span className="font-mono text-[11px] tabular-nums shrink-0">
            {schedule.server_time.slice(0, 5)}
          </span>
        )}
      </div>
    );
  }

  const active = schedule.active;

  return (
    <div className="rounded-lg border border-orange-500/25 bg-orange-500/[0.04] px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        {renderClassSelector()}
        <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold bg-orange-600 text-white shrink-0 tracking-wide">
          JAM {active.period_number}
        </span>
        <span className="font-semibold text-foreground truncate text-[11px]">
          {active.subject_name}
        </span>
        <span className="text-[10px] text-muted-foreground truncate hidden md:inline">
          • {active.teacher_name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {active.start_time}-{active.end_time}
        </span>
        {onOpenSessionSummary && (
          <button
            type="button"
            onClick={onOpenSessionSummary}
            className="inline-flex items-center gap-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 text-[10px] font-medium transition-all ml-0.5"
            title="Lihat Ringkasan Jam Pelajaran"
          >
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Rangkum</span>
          </button>
        )}
      </div>
    </div>
  );
}
