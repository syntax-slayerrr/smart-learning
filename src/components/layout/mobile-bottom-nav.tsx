"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Video,
  Menu,
  QrCode,
  History,
  BarChart3,
  UserCircle,
  Bell,
  BookOpen,
  ClipboardList,
} from "lucide-react";

interface MobileBottomNavProps {
  role: UserRole;
  onOpenMenu: () => void;
}

interface BottomTab {
  label: string;
  href?: string;
  icon: React.ElementType;
  asset?: string;
  action?: "open-menu";
  isCenter?: boolean;
}

export function MobileBottomNav({ role, onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);

  // Define tailored 5-item thumb-accessible primary tabs
  const getTabs = (): BottomTab[] => {
    switch (role) {
      case "admin":
        return [
          { label: "Beranda", href: "/admin", icon: LayoutDashboard, asset: "/icons/dashboard.png" },
          { label: "Siswa", href: "/admin/students", icon: Users, asset: "/icons/direktori-siswa.png" },
          { label: "Presensi", href: "/admin/attendance", icon: ClipboardCheck, asset: "/icons/absensi-siswa.png", isCenter: true },
          { label: "AI Vision", href: "/admin/camera-monitor", icon: Video, asset: "/icons/ai-classroom.png" },
          { label: "Menu", icon: Menu, action: "open-menu" },
        ];
      case "teacher":
        return [
          { label: "Beranda", href: "/teacher", icon: LayoutDashboard, asset: "/icons/dashboard.png" },
          { label: "Tugas", href: "/teacher/assignments", icon: ClipboardList, asset: "/icons/absensi-siswa.png" },
          { label: "Scan QR", href: "/teacher/scan", icon: QrCode, isCenter: true },
          { label: "Rekap", href: "/teacher/recap", icon: BarChart3, asset: "/icons/laporan-rekap.png" },
          { label: "Profil", href: "/teacher/profile", icon: UserCircle, asset: "/icons/profil-akun.png" },
        ];
      case "student":
        return [
          { label: "Beranda", href: "/student", icon: LayoutDashboard, asset: "/icons/dashboard.png" },
          { label: "Notebook", href: "/student/notebook", icon: BookOpen, asset: "/icons/mata-pelajaran.png" },
          { label: "Scan QR", href: "/student/scan", icon: QrCode, isCenter: true },
          { label: "Tugas", href: "/student/assignments", icon: ClipboardCheck, asset: "/icons/absensi-siswa.png" },
          { label: "Profil", href: "/student/profile", icon: UserCircle, asset: "/icons/profil-akun.png" },
        ];
      case "parent":
        return [
          { label: "Beranda", href: "/parent", icon: LayoutDashboard, asset: "/icons/dashboard.png" },
          { label: "Riwayat", href: "/parent/history", icon: History },
          { label: "Presensi", href: "/parent/attendance", icon: ClipboardCheck, asset: "/icons/absensi-siswa.png", isCenter: true },
          { label: "Notifikasi", href: "/parent/notifications", icon: Bell, asset: "/icons/log-notifikasi.png" },
          { label: "Profil", href: "/parent/profile", icon: UserCircle, asset: "/icons/profil-akun.png" },
        ];
      default:
        return [];
    }
  };

  const tabs = getTabs();

  // Find active tab index based on current URL
  const activeIndex = tabs.findIndex((tab) => {
    if (!tab.href) return false;
    return (
      pathname === tab.href ||
      (tab.href !== `/${role}` && pathname.startsWith(tab.href))
    );
  });

  // Reset optimistic state when route navigation completes
  useEffect(() => {
    setOptimisticIdx(null);
  }, [pathname]);

  if (tabs.length === 0) return null;

  const currentIdx = optimisticIdx !== null ? optimisticIdx : activeIndex;
  const activeTab = currentIdx >= 0 && currentIdx < tabs.length ? tabs[currentIdx] : null;
  const ActiveIcon = activeTab?.icon;
  const activePercent = currentIdx >= 0 ? currentIdx * 20 + 10 : 50;

  const isMobileAppRole = role === "teacher" || role === "student" || role === "parent";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 pointer-events-none filter drop-shadow-[0_-6px_25px_rgba(15,23,42,0.06)] dark:drop-shadow-[0_-8px_30px_rgba(0,0,0,0.45)]",
        !isMobileAppRole && "lg:hidden"
      )}
      aria-label="Navigasi Bawah"
    >
      <div className="relative mx-auto w-full max-w-lg h-[68px] pointer-events-auto select-none">
        {/* Main Flat Navbar Body */}
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-white/10 transition-colors" />

        {/* Moving Fluid Mound & Elevated Active Circle */}
        <div
          className={cn(
            "absolute top-0 pointer-events-none -translate-x-1/2 z-20 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            currentIdx >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{ left: `${activePercent}%` }}
        >
          {/* Smooth Bell Curve Mound SVG */}
          <svg
            className="absolute -top-[19px] left-1/2 -translate-x-1/2 w-[92px] h-[21px] pointer-events-none overflow-visible"
            viewBox="0 0 92 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Body Fill connecting flush to navbar top */}
            <path
              d="M 0 20 C 23 20 27 0 46 0 C 65 0 69 20 92 20 L 92 22 L 0 22 Z"
              className="fill-white/95 dark:fill-slate-900/95 transition-colors"
            />
            {/* Rim Border Stroke */}
            <path
              d="M 0 20 C 23 20 27 0 46 0 C 65 0 69 20 92 20"
              className="stroke-slate-200/90 dark:stroke-white/10"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>

          {/* Elevated Circular Badge */}
          <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-[0_10px_22px_-4px_rgba(37,99,235,0.4),0_4px_10px_rgba(0,0,0,0.12)] ring-4 ring-white dark:ring-slate-900 transition-colors">
            {ActiveIcon && (
              activeTab?.asset ? (
                <img
                  src={activeTab.asset}
                  alt=""
                  className="w-6 h-6 object-contain drop-shadow-[0_2px_6px_rgba(37,99,235,0.35)] transition-transform duration-200 scale-105"
                />
              ) : (
                <ActiveIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 stroke-[2.3] transition-transform duration-200 scale-105" />
              )
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="absolute inset-x-0 bottom-0 h-[68px] flex items-center justify-between z-10">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = idx === currentIdx;

            const handleClick = () => {
              setOptimisticIdx(idx);
              if (tab.action === "open-menu") {
                onOpenMenu();
              }
            };

            const content = (
              <>
                {/* Inactive Icon Container (fades/lifts out when active) */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-7 h-7 mb-1 transition-all duration-300",
                    isActive
                      ? "opacity-0 -translate-y-2 scale-75 pointer-events-none"
                      : "opacity-100 translate-y-0 scale-100 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )}
                >
                  {tab.asset ? (
                    <img
                      src={tab.asset}
                      alt=""
                      className="w-5 h-5 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                    />
                  ) : (
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  )}
                </div>

                {/* Tab Label */}
                <span
                  className={cn(
                    "text-[10px] tracking-tight transition-colors duration-200",
                    isActive
                      ? "font-bold text-slate-900 dark:text-white"
                      : "font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )}
                >
                  {tab.label}
                </span>
              </>
            );

            if (tab.href) {
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  onClick={handleClick}
                  className="flex-1 h-full flex flex-col items-center justify-end pb-2 pt-1 touch-manipulation cursor-pointer group"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={tab.label}
                type="button"
                onClick={handleClick}
                aria-label={tab.label}
                className="flex-1 h-full flex flex-col items-center justify-end pb-2 pt-1 touch-manipulation cursor-pointer group"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* Device Safe Area Filler */}
      <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-[env(safe-area-inset-bottom,0px)] pointer-events-auto transition-colors" />
    </nav>
  );
}
