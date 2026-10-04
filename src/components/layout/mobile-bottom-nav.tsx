"use client";

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
} from "lucide-react";

interface MobileBottomNavProps {
  role: UserRole;
  onOpenMenu: () => void;
}

interface BottomTab {
  label: string;
  href?: string;
  icon: React.ElementType;
  action?: "open-menu";
  badge?: string;
}

export function MobileBottomNav({ role, onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Define tailored thumb-accessible primary tabs for each role
  const getTabs = (): BottomTab[] => {
    switch (role) {
      case "admin":
        return [
          { label: "Beranda", href: "/admin", icon: LayoutDashboard },
          { label: "Siswa", href: "/admin/students", icon: Users },
          { label: "Absensi", href: "/admin/attendance", icon: ClipboardCheck },
          { label: "AI Vision", href: "/admin/camera-monitor", icon: Video },
          { label: "Menu", icon: Menu, action: "open-menu" },
        ];
      case "teacher":
        return [
          { label: "Beranda", href: "/teacher", icon: LayoutDashboard },
          { label: "Scan QR", href: "/teacher/scan", icon: QrCode },
          { label: "Riwayat", href: "/teacher/history", icon: History },
          { label: "Rekap", href: "/teacher/recap", icon: BarChart3 },
          { label: "Profil", href: "/teacher/profile", icon: UserCircle },
        ];
      case "student":
        return [
          { label: "Beranda", href: "/student", icon: LayoutDashboard },
          { label: "Scan QR", href: "/student/scan", icon: QrCode },
          { label: "Riwayat", href: "/student/history", icon: History },
          { label: "Profil", href: "/student/profile", icon: UserCircle },
        ];
      case "parent":
        return [
          { label: "Beranda", href: "/parent", icon: LayoutDashboard },
          { label: "Absensi", href: "/parent/attendance", icon: ClipboardCheck },
          { label: "Riwayat", href: "/parent/history", icon: History },
          { label: "Notifikasi", href: "/parent/notifications", icon: Bell },
        ];
      default:
        return [];
    }
  };

  const tabs = getTabs();
  if (tabs.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-[rgba(60,60,67,0.12)] bg-white/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/75 transition-all shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Navigasi Bawah Mobile"
    >
      <div className="flex h-14 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href &&
            (pathname === tab.href ||
              (tab.href !== `/${role}` && pathname.startsWith(tab.href)));

          if (tab.action === "open-menu") {
            return (
              <button
                key="menu-tab"
                onClick={onOpenMenu}
                className="group flex flex-1 flex-col items-center justify-center py-1 text-center touch-manipulation transition-transform active:scale-95"
                aria-label="Buka Menu Lengkap"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-[#6E6E73] group-hover:text-[#1D1D1F] transition-colors">
                  <Icon className="h-5 w-5 stroke-[2]" />
                </div>
                <span className="mt-0.5 text-[10px] font-medium text-[#6E6E73] group-hover:text-[#1D1D1F]">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center py-1 text-center touch-manipulation transition-transform active:scale-95",
                isActive ? "text-[#007AFF]" : "text-[#8E8E93] hover:text-[#1D1D1F]"
              )}
            >
              <div
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200",
                  isActive ? "text-[#007AFF]" : "text-[#6E6E73]"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
                {isActive && (
                  <span className="absolute -top-1 h-1 w-1 rounded-full bg-[#007AFF]" />
                )}
              </div>
              <span
                className={cn(
                  "mt-0.5 text-[10px] tracking-tight leading-none",
                  isActive ? "font-semibold text-[#007AFF]" : "font-medium text-[#6E6E73]"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
