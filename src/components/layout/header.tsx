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
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-black/20 px-4 sm:px-6 shadow-md relative overflow-hidden">
      {/* Background Banner Image Jelas Langsung */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/header-banner.jpg')" }}
      />
      {/* Soft gradient bottom edge for smooth transition */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {/* Left: Spacer (Teks Smart Learning & Guru Dihapus) */}
      <div className="relative z-10 flex items-center min-w-0" />

      {/* Center: Spacer */}
      <div className="relative z-10 hidden md:flex items-center gap-2 shrink-0" />

      {/* Right: Actions Cluster (Notifications, User Avatar) */}
      <div className="relative z-10 flex items-center gap-2.5 shrink-0">
        {/* Offline Badge */}
        {!isOnline && (
          <div
            className="flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/50 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-sm"
            title="Mode Offline Aktif"
          >
            <WifiOff className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile Avatar Link */}
        <Link
          href={`/${role}/profile`}
          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/50 text-[11px] sm:text-xs font-bold text-white shadow-sm ring-2 ring-white/60 hover:ring-white active:scale-95 transition-all shrink-0 backdrop-blur-md"
          title={`Profil: ${userName || userEmail || getRoleLabel(role)}`}
          aria-label="Profil Akun"
        >
          {getInitials(userName || getRoleLabel(role))}
        </Link>

        {/* Quick Logout for Admin on Desktop */}
        {!isMobileAppRole && onLogout && (
          <button
            onClick={onLogout}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-rose-400 hover:bg-black/60 transition-colors active:scale-95 touch-manipulation ring-1 ring-white/30 backdrop-blur-md"
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