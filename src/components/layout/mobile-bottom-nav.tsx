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

// 5 tab horizontal centers in SVG 0..390 coordinates
// Mathematically tuned so scoop runs exactly between shoulder ends (24 and 366)
const TAB_CXS = [50, 122, 195, 268, 340];
const TAB_PERCENTS = [12.82, 31.28, 50.0, 68.72, 87.18];

// Compute SVG path with rounded shoulders and smooth scooped notch around active tab
function getScoopedDockPaths(tabIdx: number) {
  const cx = TAB_CXS[Math.max(0, Math.min(4, tabIdx))];
  const scoopHw = 26; // half-width = 26px (52px wide cradle, fits w-14 button)
  const l = (cx - scoopHw).toFixed(1);
  const r = (cx + scoopHw).toFixed(1);
  const c1 = (cx - 16).toFixed(1);
  const c2 = (cx - 12).toFixed(1);
  const c3 = (cx + 12).toFixed(1);
  const c4 = (cx + 16).toFixed(1);
  const cxStr = cx.toFixed(1);

  // Full dock body with rounded top shoulders (Apple HIG style)
  const fillPath = `M 0 46 C 0 32.5 10.5 22 24 22 L ${l} 22 C ${c1} 22 ${c2} 52 ${cxStr} 52 C ${c3} 52 ${c4} 22 ${r} 22 L 366 22 C 379.5 22 390 32.5 390 46 L 390 84 L 0 84 Z`;

  // Top hairline rim stroke matching the exact contour
  const strokePath = `M 24 22 L ${l} 22 C ${c1} 22 ${c2} 52 ${cxStr} 52 C ${c3} 52 ${c4} 22 ${r} 22 L 366 22`;

  return { fillPath, strokePath };
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

  const currentIdx = optimisticIdx !== null ? optimisticIdx : (activeIndex >= 0 ? activeIndex : 2);
  const activeTab = currentIdx >= 0 && currentIdx < tabs.length ? tabs[currentIdx] : null;
  const ActiveIcon = activeTab?.icon;
  const activePercent = TAB_PERCENTS[currentIdx] ?? 50;

  const { fillPath, strokePath } = getScoopedDockPaths(currentIdx);
  const isMobileAppRole = role === "teacher" || role === "student" || role === "parent";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 pointer-events-none filter drop-shadow-[0_-6px_24px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_-8px_30px_rgba(0,0,0,0.5)]",
        !isMobileAppRole && "lg:hidden"
      )}
      style={{
        paddingBottom: "max(0.6rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Navigasi Bawah Mobile"
    >
      {/* Floating Island Container with Width constraint (ada width nya & margin samping) */}
      <div className="relative mx-auto w-full max-w-md px-3 sm:px-0 h-[84px] pointer-events-auto select-none">
        
        {/* Single Seamless Unified SVG Dock with Dynamic Scooped Notch & Rounded Shoulders */}
        <svg
          className="absolute inset-0 w-full h-full block overflow-visible pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 390 84"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Frosted Unified White Dock Body */}
          <path
            d={fillPath}
            className="fill-white dark:fill-slate-900 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          />

          {/* Hairline Rim Stroke on Top Boundary */}
          <path
            d={strokePath}
            fill="none"
            className="stroke-slate-200/85 dark:stroke-white/10 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            strokeWidth="1.2"
          />
        </svg>

        {/* Elevated Tactile Floating Circular Button (w-14 h-14 like Center FAB) */}
        <div
          className={cn(
            "absolute -top-3.5 pointer-events-none -translate-x-1/2 z-20 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            activeIndex >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{ left: `${activePercent}%` }}
        >
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 transition-transform active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
              boxShadow:
                "inset 0 1.5px 1.5px 0 rgba(255,255,255,0.45), 0 16px 34px -4px rgba(37,99,235,0.5), 0 8px 16px -2px rgba(15,23,42,0.4)",
            }}
          >
            {/* Top specular hairline edge */}
            <div className="absolute inset-0 rounded-full border border-blue-300/40 pointer-events-none" />

            {ActiveIcon && (
              activeTab?.asset ? (
                <img
                  src={activeTab.asset}
                  alt=""
                  className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform duration-200 scale-110"
                />
              ) : (
                <ActiveIcon className="w-6 h-6 stroke-[2.2] text-white transition-transform duration-200 scale-110" />
              )
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="absolute inset-0 flex items-center justify-between px-1 z-10">
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
                {/* Inactive Icon Container (hidden when elevated FAB is floating above it) */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-8 h-8 mb-0.5 transition-all duration-300",
                    isActive
                      ? "opacity-0 -translate-y-3 scale-50 pointer-events-none"
                      : "opacity-100 translate-y-0 scale-100 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {tab.asset ? (
                    <img
                      src={tab.asset}
                      alt=""
                      className="w-6 h-6 object-contain opacity-85 group-hover:opacity-100 transition-all"
                    />
                  ) : (
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  )}
                </div>

                {/* Tab Label */}
                <span
                  className={cn(
                    "text-[10px] tracking-tight transition-all duration-200",
                    isActive
                      ? "font-bold text-blue-600 dark:text-blue-400 mt-5"
                      : "font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
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
                  className="flex-1 h-full flex flex-col items-center justify-end pb-2.5 text-center touch-manipulation cursor-pointer group"
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
                className="flex-1 h-full flex flex-col items-center justify-end pb-2.5 text-center touch-manipulation cursor-pointer group"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}