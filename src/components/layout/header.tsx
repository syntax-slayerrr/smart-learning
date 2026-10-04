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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[rgba(60,60,67,0.12)] bg-[#F7F7F5]/80 px-4 sm:px-6 backdrop-blur-[24px] supports-[backdrop-filter]:bg-[#F7F7F5]/70 transition-colors">
      {/* Left: Mobile Menu & Role Badge (Touch Target >= 44px) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#1D1D1F] hover:bg-[#F2F2F0] lg:hidden apple-press"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-lg border border-[rgba(60,60,67,0.12)] bg-white px-2.5 py-1 text-xs font-semibold text-[#1D1D1F] shadow-[var(--shadow-subtle)]">
            {getRoleLabel(role)}
          </span>
          <span className="hidden md:inline-block text-xs text-[#8E8E93]">
            • Smart Learning Platform
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator Pill (Section 22) */}
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-[rgba(52,199,89,0.25)] bg-[#34C759]/[0.08] px-3.5 py-1 text-xs font-medium text-[#1D1D1F]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]" />
        </span>
        <span className="text-[12px] tracking-tight">
          AI Telemetry Engine <span className="text-[#34C759] font-semibold">• Live</span>
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
