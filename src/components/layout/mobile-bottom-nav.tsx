"use client";

import React, { useRef, useState, useEffect } from "react";
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
  Calendar,
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
  const navRef = useRef<HTMLElement>(null);
  const [indicatorLeft, setIndicatorLeft] = useState<number | null>(null);

  // Define tailored 5-item thumb-accessible primary tabs with center elevated action
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

  // Find active tab index
  const activeIndex = tabs.findIndex((tab) => {
    if (!tab.href) return false;
    return (
      pathname === tab.href ||
      (tab.href !== `/${role}` && pathname.startsWith(tab.href))
    );
  });

  // Calculate indicator position when activeIndex or window size changes
  useEffect(() => {
    if (activeIndex === -1 || activeIndex === 2) {
      // If center tab or unknown, hide side pill indicator
      setIndicatorLeft(null);
      return;
    }

    const updateIndicator = () => {
      if (!navRef.current) return;
      const targetBtn = navRef.current.querySelector(
        `[data-tab-index="${activeIndex}"]`
      ) as HTMLElement | null;

      if (targetBtn) {
        const navRect = navRef.current.getBoundingClientRect();
        const btnRect = targetBtn.getBoundingClientRect();
        const centerOffset = btnRect.left + btnRect.width / 2 - navRect.left;
        setIndicatorLeft(centerOffset);
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeIndex, pathname]);

  if (tabs.length === 0) return null;

  const isMobileAppRole = role === "teacher" || role === "student" || role === "parent";

  return (
    <nav
      ref={navRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 pointer-events-none filter drop-shadow-[0_-4px_20px_rgba(0,0,0,0.06)]",
        !isMobileAppRole && "lg:hidden"
      )}
      aria-label="Navigasi Bawah"
    >
      {/* Background connector extending down to bottom of screen */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-white dark:bg-card pointer-events-auto" />

      {/* Container with responsive max width on larger mobile / tablet */}
      <div className="relative mx-auto w-full max-w-lg h-[84px] pointer-events-auto select-none">
        
        {/* SVG Dock Background with Scooped Center Notch */}
        <svg
          className="absolute inset-0 w-full h-full block"
          preserveAspectRatio="none"
          viewBox="0 0 390 84"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Solid White Dock Body with Curved Scoop */}
          <path
            d="
              M 0 22
              L 146 22
              C 162 22 168 54 195 54
              C 222 54 228 22 244 22
              L 390 22
              L 390 84
              L 0 84
              Z
            "
            fill="#FFFFFF"
          />

          {/* Hairline subtle top specular border for Apple HIG depth */}
          <path
            d="
              M 0 22
              L 146 22
              C 162 22 168 54 195 54
              C 222 54 228 22 244 22
              L 390 22
            "
            fill="none"
            stroke="rgba(226, 232, 240, 0.85)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Sliding Active Indicator Pill (for side tabs) with Spring Curve */}
        <div
          className={cn(
            "absolute top-[23px] h-1 w-8 rounded-full bg-blue-600 pointer-events-none -translate-x-1/2 z-20",
            "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            indicatorLeft !== null ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{
            left: indicatorLeft !== null ? `${indicatorLeft}px` : "50%",
            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.55)",
          }}
        />

        {/* Navigation Tabs Bar */}
        <div className="absolute inset-x-0 bottom-0 h-16 flex items-center justify-between px-2 z-10">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isCenter = tab.isCenter || idx === 2;
            const isActive =
              tab.href &&
              (pathname === tab.href ||
                (tab.href !== `/${role}` && pathname.startsWith(tab.href)));

            // 1. Center Action FAB (Resting in the Scooped Notch)
            if (isCenter) {
              const CenterComponent = tab.href ? Link : "button";
              return (
                <div
                  key={tab.label}
                  data-tab-index={idx}
                  className="flex-1 h-full flex flex-col items-center justify-end pb-1.5 relative group"
                >
                  {/* Floating Circular Elevated Button */}
                  <CenterComponent
                    href={tab.href as any}
                    onClick={tab.action === "open-menu" ? onOpenMenu : undefined}
                    aria-label={tab.label}
                    className={cn(
                      "absolute -top-3.5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-white z-20",
                      "touch-manipulation cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                      "active:scale-90",
                      isActive
                        ? "scale-105 shadow-[0_16px_34px_-4px_rgba(37,99,235,0.5),0_8px_16px_-2px_rgba(15,23,42,0.4)] ring-4 ring-white"
                        : "scale-100 shadow-[0_12px_26px_-4px_rgba(37,99,235,0.4),0_6px_12px_-2px_rgba(15,23,42,0.3)] ring-2 ring-white/80"
                    )}
                    style={{
                      background:
                        "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
                    }}
                  >
                    {/* Specular Rim Light on Center FAB */}
                    <div className="absolute inset-0 rounded-full border border-blue-300/40 pointer-events-none" />
                    {tab.asset ? (
                      <img
                        src={tab.asset}
                        alt=""
                        className={cn(
                          "w-8 h-8 object-contain transition-transform duration-300 relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
                          isActive ? "scale-115" : "scale-100"
                        )}
                      />
                    ) : (
                      <Icon
                        className={cn(
                          "w-6 h-6 stroke-[2.2] transition-transform duration-300 relative z-10",
                          isActive ? "scale-110" : "scale-100"
                        )}
                      />
                    )}
                  </CenterComponent>

                  {/* Center Tab Label */}
                  <span
                    className={cn(
                      "text-[10px] tracking-tight transition-colors duration-200 mt-5",
                      isActive
                        ? "font-bold text-blue-600"
                        : "font-medium text-slate-500"
                    )}
                  >
                    {tab.label}
                  </span>
                </div>
              );
            }

            // 2. Menu Drawer Action Button (Side Tab)
            if (tab.action === "open-menu") {
              return (
                <button
                  key="menu-tab"
                  data-tab-index={idx}
                  onClick={onOpenMenu}
                  aria-label="Buka Menu Lengkap"
                  className="flex-1 h-full flex flex-col items-center justify-center py-1 text-center touch-manipulation transition-transform active:scale-95 text-slate-500 hover:text-slate-800"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-transform duration-300">
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <span className="mt-0.5 text-[10px] font-medium tracking-tight text-slate-500">
                    {tab.label}
                  </span>
                </button>
              );
            }

            // 3. Regular Side Navigation Link Tabs
            return (
              <Link
                key={tab.href}
                data-tab-index={idx}
                href={tab.href!}
                className={cn(
                  "group relative flex-1 h-full flex flex-col items-center justify-center py-1 text-center touch-manipulation",
                  "transition-transform active:scale-95",
                  isActive
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300",
                    isActive
                      ? "scale-105 bg-blue-50/90 text-blue-600 shadow-sm border border-blue-100/70"
                      : "scale-100 bg-transparent text-slate-500"
                  )}
                >
                  {tab.asset ? (
                    <img
                      src={tab.asset}
                      alt=""
                      className={cn(
                        "w-6 h-6 object-contain transition-all duration-200 select-none",
                        isActive
                          ? "scale-115 drop-shadow-[0_2px_4px_rgba(37,99,235,0.3)]"
                          : "opacity-85 group-hover:opacity-100 group-hover:scale-105"
                      )}
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive ? "stroke-[2.2]" : "stroke-[1.8]"
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-0.5 text-[10px] tracking-tight transition-all duration-200",
                    isActive
                      ? "font-bold text-blue-600"
                      : "font-medium text-slate-500"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Device Safe Area Filler to ensure seamless background connection on iPhones & Android gesture bars */}
      <div className="w-full bg-white dark:bg-card h-[env(safe-area-inset-bottom,0px)] pointer-events-auto" />
    </nav>
  );
}