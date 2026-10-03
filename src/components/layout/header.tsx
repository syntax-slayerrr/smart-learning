"use client";

import { Menu, Radio } from "lucide-react";
import { getRoleLabel } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";

interface HeaderProps {
  role: UserRole;
  onMenuClick: () => void;
}

export function Header({ role, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E7E2DA] bg-[#FBF9F5]/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-[#FBF9F5]/80 sm:px-6 transition-colors">
      {/* Left: Mobile Menu & Role Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-stone-600 hover:bg-[#F5F2EB] hover:text-stone-900 lg:hidden apple-press"
          aria-label="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-md border border-[#E7E2DA] bg-white px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-2xs">
            {getRoleLabel(role)}
          </span>
          <span className="hidden md:inline-block text-xs text-stone-400 font-mono">
            • Smart Learning v2.6
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator Pill */}
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.06] px-3.5 py-1 text-xs font-medium text-orange-800 shadow-2xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA580C] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA580C]" />
        </span>
        <span className="font-mono text-[11px] tracking-tight">
          AI Telemetry Engine <span className="text-orange-500 font-semibold">• Live Active</span>
        </span>
      </div>

      {/* Right: Notifications & Actions */}
      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
