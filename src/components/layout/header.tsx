"use client";

import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-[rgba(60,60,67,0.12)] bg-[#F7F7F5]/85 px-4 sm:px-6 backdrop-blur-[24px] supports-[backdrop-filter]:bg-[#F7F7F5]/75 transition-colors">
      {/* Left: Brand Identity on Mobile / Role Badge on Desktop */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#1D1D1F] hover:bg-[#F2F2F0] lg:hidden apple-press touch-manipulation"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand identity on mobile */}
        <Link
          href={`/${role}`}
          className="flex items-center gap-2.5 lg:hidden"
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-[rgba(60,60,67,0.12)] bg-white p-0.5 shadow-sm">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="Logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <span className="text-xs font-bold tracking-tight text-[#1D1D1F]">
            Smart Learning
          </span>
        </Link>

        {/* Desktop Role Tag */}
        <div className="hidden lg:flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-lg border border-[rgba(60,60,67,0.12)] bg-white px-2.5 py-1 text-xs font-semibold text-[#1D1D1F] shadow-[var(--shadow-subtle)]">
            {getRoleLabel(role)}
          </span>
          <span className="text-xs text-[#8E8E93]">
            • Syntax Slayer Enterprise
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator Pill */}
      {role === "admin" ? (
        <Link
          href="/admin/camera-monitor"
          className="hidden md:flex items-center gap-2 rounded-full border border-[rgba(52,199,89,0.25)] bg-[#34C759]/[0.08] hover:bg-[#34C759]/[0.15] px-3.5 py-1 text-xs font-medium text-[#1D1D1F] transition-all apple-press"
          title="Buka AI Classroom Vision & Live Monitor"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]" />
          </span>
          <span className="text-[12px] tracking-tight">
            AI Telemetry <span className="text-[#34C759] font-semibold">• Live Monitor</span>
          </span>
        </Link>
      ) : (
        <div className="hidden md:flex items-center gap-2 rounded-full border border-[rgba(52,199,89,0.25)] bg-[#34C759]/[0.08] px-3.5 py-1 text-xs font-medium text-[#1D1D1F]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34C759]" />
          </span>
          <span className="text-[12px] tracking-tight">
            AI Engine <span className="text-[#34C759] font-semibold">• Aktif</span>
          </span>
        </div>
      )}

      {/* Right: Notifications & Quick Profile */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
