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
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-border/80 bg-background/85 px-4 sm:px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 transition-colors shadow-2xs relative overflow-hidden">
      {/* Ambient Cyber Aura Glow (Opsi 3: Tekstur halus ungu-biru tidak norak) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] pointer-events-none mix-blend-luminosity filter blur-xs"
        style={{ backgroundImage: "url('/brand/header-banner.jpg')" }}
      />
      <div className="absolute -top-10 -left-10 w-48 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 right-20 w-48 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Left: Brand Logo (Teks label role dihapus agar clean) */}
      <div className="relative z-10 flex items-center min-w-0">
        <Link
          href={`/${role}`}
          className="flex items-center transition-opacity hover:opacity-90 active:scale-98 shrink-0"
        >
          <img
            src="/brand/syntax-slayer-logo.png"
            alt="SYNTAX SLAYER"
            className="h-7 sm:h-8 w-auto object-contain dark:brightness-110"
          />
        </Link>
      </div>

      {/* Center: Spacer */}
      <div className="relative z-10 hidden md:flex items-center gap-2 shrink-0" />

      {/* Right: Actions Cluster (Notifications, User Avatar) */}
      <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 shrink-0">
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
          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary text-[11px] sm:text-xs font-bold text-primary-foreground shadow-2xs ring-2 ring-background hover:ring-border active:scale-95 transition-all shrink-0"
          title={`Profil: ${userName || userEmail || getRoleLabel(role)}`}
          aria-label="Profil Akun"
        >
          {getInitials(userName || getRoleLabel(role))}
        </Link>

        {/* Quick Logout for Admin on Desktop */}
        {!isMobileAppRole && onLogout && (
          <button
            onClick={onLogout}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95 touch-manipulation"
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