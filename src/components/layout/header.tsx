"use client";

import Link from "next/link";
import Image from "next/image";
import { WifiOff, LogOut } from "lucide-react";
import { getRoleLabel, getInitials } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useOfflineStatus } from "@/lib/offline-lms-cache";

interface HeaderProps {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onMenuClick?: () => void;
}

export function Header({
  role,
  userName,
  userEmail,
  onLogout,
}: HeaderProps) {
  const { isOnline } = useOfflineStatus();
  const isMobileAppRole = role === "teacher" || role === "student" || role === "parent";

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 sm:px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 transition-colors shadow-2xs">
      {/* Left: Brand Identity & Role Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={`/${role}`}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 active:scale-98 shrink-0"
        >
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-2xs">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="Smart Learning Logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              Smart Learning
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider leading-none">
              {getRoleLabel(role)}
            </span>
          </div>
        </Link>

        {/* Desktop School & Portal Sub-tag */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200/80 text-xs text-slate-500 font-medium">
          <span>SMK Negeri 1 Cibatu</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">Enterprise AI</span>
        </div>
      </div>

      {/* Center: Live Telemetry Indicator (Tablet & Desktop only) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {role === "admin" ? (
          <Link
            href="/admin/camera-monitor"
            className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 hover:bg-emerald-100/70 dark:bg-emerald-950/30 px-3.5 py-1 text-xs font-medium text-slate-800 transition-all active:scale-95 shadow-2xs"
            title="Buka Pantauan Kelas Live"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] tracking-tight">
              Pantauan Kelas <span className="text-emerald-600 font-semibold">• Live</span>
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-3.5 py-1 text-xs font-medium text-slate-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] tracking-tight">
              Sistem <span className="text-emerald-600 font-semibold">• Siap</span>
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions Cluster (Sync status, Notifications, User Avatar) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Offline Badge */}
        {!isOnline && (
          <div
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-2xs"
            title="Mode Offline Aktif"
          >
            <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile Avatar Link */}
        <Link
          href={`/${role}/profile`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white shadow-2xs ring-2 ring-slate-100 hover:ring-slate-300 active:scale-95 transition-all shrink-0"
          title={`Profil: ${userName || userEmail || getRoleLabel(role)}`}
          aria-label="Profil Akun"
        >
          {getInitials(userName || getRoleLabel(role))}
        </Link>

        {/* Quick Logout for Admin on Desktop */}
        {!isMobileAppRole && onLogout && (
          <button
            onClick={onLogout}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors active:scale-95 touch-manipulation"
            title="Keluar / Logout"
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}