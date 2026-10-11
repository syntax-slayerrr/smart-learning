"use client";

import React, { useState, useEffect, useRef } from "react";
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

// Compute mathematically safe tab center ensuring corner clearance for all 5 tabs
function getTabCenter(idx: number, W: number): number {
  const minMargin = 56; // 44px notch radius + 12px shoulder clearance
  const usable = Math.max(160, W - minMargin * 2);
  return minMargin + idx * (usable / 4);
}

// Compute concentric circular cradle notch with smooth tangent fillets matching button geometry
function getConcentricDockPaths(W: number, tabIdx: number) {
  const safeW = Math.max(320, W);
  const cx = getTabCenter(tabIdx, safeW);
  
  // Exact button physical alignment:
  // Button: w-14 (56px) at -top-3 (-12px) => center cyBtn = 16px
  // Radius with ring (3px) = 31px. Cradle radius = 35px => uniform 4px clearance
  const cyBtn = 16;
  const rCradle = 35;
  const rFillet = 10;
  const yBase = 22;
  const shoulderR = 14;

  const yF = yBase + rFillet;
  const dist = rCradle + rFillet;
  const dy = yF - cyBtn;
  const dxF = Math.sqrt(Math.max(0, dist * dist - dy * dy));

  const uX = -dxF / dist;
  const uY = dy / dist;

  // Tangent transition points
  const xLeftF = cx - dxF;
  const xLeftC = cx + rCradle * uX;
  const yLeftC = cyBtn + rCradle * uY;

  const xRightC = cx - rCradle * uX;
  const yRightC = yLeftC;
  const xRightF = cx + dxF;

  // Continuous seamless dock body
  const fillPath =
    `M 0 46 ` +
    `C 0 ${(46 - shoulderR * 0.55).toFixed(1)} ${(shoulderR * 0.45).toFixed(1)} ${yBase} ${shoulderR} ${yBase} ` +
    `L ${xLeftF.toFixed(2)} ${yBase} ` +
    `A ${rFillet} ${rFillet} 0 0 1 ${xLeftC.toFixed(2)} ${yLeftC.toFixed(2)} ` +
    `A ${rCradle} ${rCradle} 0 0 0 ${xRightC.toFixed(2)} ${yRightC.toFixed(2)} ` +
    `A ${rFillet} ${rFillet} 0 0 1 ${xRightF.toFixed(2)} ${yBase} ` +
    `L ${(safeW - shoulderR).toFixed(2)} ${yBase} ` +
    `C ${(safeW - shoulderR * 0.45).toFixed(1)} ${yBase} ${safeW} ${(46 - shoulderR * 0.55).toFixed(1)} ${safeW} 46 ` +
    `L ${safeW} 84 L 0 84 Z`;

  // Top hairline rim stroke
  const strokePath =
    `M ${shoulderR} ${yBase} ` +
    `L ${xLeftF.toFixed(2)} ${yBase} ` +
    `A ${rFillet} ${rFillet} 0 0 1 ${xLeftC.toFixed(2)} ${yLeftC.toFixed(2)} ` +
    `A ${rCradle} ${rCradle} 0 0 0 ${xRightC.toFixed(2)} ${yRightC.toFixed(2)} ` +
    `A ${rFillet} ${rFillet} 0 0 1 ${xRightF.toFixed(2)} ${yBase} ` +
    `L ${(safeW - shoulderR).toFixed(2)} ${yBase}`;

  return { fillPath, strokePath };
}

export function MobileBottomNav({ role, onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dockWidth, setDockWidth] = useState<number>(366);

  // Measure actual dock width dynamically to prevent non-uniform scaling on any device
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const measured = Math.round(containerRef.current.getBoundingClientRect().width);
        if (measured > 0) setDockWidth(measured);
      }
    };
    updateWidth();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDockWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    ro.observe(containerRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

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
  const activeCenterPx = getTabCenter(currentIdx, dockWidth);

  const { fillPath, strokePath } = getConcentricDockPaths(dockWidth, currentIdx);
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
      {/* Floating Island Container with dedicated horizontal clearance */}
      <div
        ref={containerRef}
        className="relative mx-3.5 sm:mx-auto max-w-md h-[84px] pointer-events-auto select-none"
      >
        {/* Single Seamless Unified SVG Dock with Concentric Circular Cradle */}
        <svg
          className="absolute inset-0 w-full h-full block overflow-visible pointer-events-none"
          viewBox={`0 0 ${dockWidth} 84`}
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

        {/* Elevated Tactile Floating Circular Button (w-14 h-14, center cy=16px) */}
        <div
          className={cn(
            "absolute -top-3 pointer-events-none -translate-x-1/2 z-20 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            activeIndex >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{ left: `${activeCenterPx}px` }}
        >
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center text-white ring-3 ring-white dark:ring-slate-900 transition-transform active:scale-95"
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

        {/* Navigation Tabs Bar — perfectly aligned with notch center */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = idx === currentIdx;
            const cx = getTabCenter(idx, dockWidth);

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
                  style={{ left: `${cx}px` }}
                  className="absolute -translate-x-1/2 top-0 bottom-0 w-16 flex flex-col items-center justify-end pb-2.5 text-center touch-manipulation cursor-pointer group pointer-events-auto"
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
                style={{ left: `${cx}px` }}
                className="absolute -translate-x-1/2 top-0 bottom-0 w-16 flex flex-col items-center justify-end pb-2.5 text-center touch-manipulation cursor-pointer group pointer-events-auto"
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