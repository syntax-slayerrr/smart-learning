"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, WifiOff, RefreshCw } from "lucide-react";
import { getRoleLabel } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useOfflineStatus } from "@/lib/offline-lms-cache";
import { cn } from "@/lib/utils";

interface HeaderProps {
  role: UserRole;
  onMenuClick: () => void;
}

export function Header({ role, onMenuClick }: HeaderProps) {
  const { isOnline, offlineQueueCount, isSyncing, triggerSync } = useOfflineStatus();
  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-[24px] supports-[backdrop-filter]:bg-white/70 transition-colors shadow-[0_1px_3px_0_rgba(15,23,42,0.02)]">
      {/* Left: Brand Identity on Mobile / Role Badge on Desktop */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-900 hover:bg-slate-100/80 lg:hidden transition-colors active:scale-95 touch-manipulation"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand identity on mobile */}
        <Link
          href={`/${role}`}
          className="flex items-center gap-2.5 lg:hidden"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-sm">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="Logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <div>
            <span className="text-xs font-extrabold tracking-tight text-slate-900 block leading-tight">
              Smart Learning
            </span>
            <span className="text-[10px] font-medium text-slate-400 block leading-tight">
              Syntax Slayer
            </span>
          </div>
        </Link>

        {/* Desktop Role Tag */}
        <div className="hidden lg:flex items-center gap-2.5">
          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm border-t-white">
            {getRoleLabel(role)}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            • Syntax Slayer Enterprise
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator Pill & Offline Resilience Status */}
      <div className="flex items-center gap-2">
        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-xs">
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            <span>Mode Offline</span>
          </div>
        )}

        {isOnline && offlineQueueCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 shadow-xs active:scale-95 transition-all"
            title="Klik untuk sinkronisasi data draf lokal ke server"
          >
            <RefreshCw className={cn("h-3 w-3 text-blue-600", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Menyinkronkan..." : `${offlineQueueCount} draf`}</span>
          </button>
        )}

        {role === "admin" ? (
          <Link
            href="/admin/camera-monitor"
            className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 px-3.5 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 transition-all active:scale-95 shadow-2xs"
            title="Buka Pantauan Kelas Live"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] tracking-tight">
              Pantauan Kelas <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Live</span>
            </span>
          </Link>
        ) : (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/30 px-3.5 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] tracking-tight">
              Sistem <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Siap</span>
            </span>
          </div>
        )}
      </div>

      {/* Right: Notifications & Quick Profile */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
