"use client";

import { Menu } from "lucide-react";
import { getRoleLabel } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";

interface HeaderProps {
  role: UserRole;
  onMenuClick: () => void;
}

export function Header({ role, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 dark:border-white/10 bg-[#FBF9F5]/90 dark:bg-[#121110]/90 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Left: Mobile Menu & Role Badge (Touch Target >= 44px) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-zinc-800 lg:hidden active:scale-[0.98] transition-all"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-lg border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-stone-900 dark:text-stone-100 shadow-xs">
            {getRoleLabel(role)}
          </span>
          <span className="hidden md:inline-block text-xs text-stone-500 dark:text-stone-400 font-mono">
            SMK TI SYNTAX SLAYER
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator Pill */}
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-stone-800 dark:text-stone-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[12px] tracking-tight font-medium">
          AI Telemetry Engine <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Online</span>
        </span>
      </div>

      {/* Right: Notifications (Touch Target >= 44px) */}
      <div className="flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
