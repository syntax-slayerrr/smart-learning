"use client";

import React from "react";
import Link from "next/link";
import {
  QrCode,
  GraduationCap,
  Video,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";

export interface QuickAccessItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  asset?: string;
  badge?: string | number;
  podBg: string;
  iconColor: string;
}

interface QuickAccessGridProps {
  items?: QuickAccessItem[];
  className?: string;
}

const DEFAULT_ITEMS: QuickAccessItem[] = [
  {
    id: "qr-scanner",
    label: "Presensi",
    href: "/admin/scanner",
    icon: QrCode,
    asset: "/icons/absensi-siswa.png",
    badge: "Scanner",
    podBg: "bg-blue-50/80 border border-blue-100/60",
    iconColor: "text-blue-600",
  },
  {
    id: "classes",
    label: "Kelas",
    href: "/admin/classes",
    icon: GraduationCap,
    asset: "/icons/kelas.png",
    badge: "Aktif",
    podBg: "bg-indigo-50/80 border border-indigo-100/60",
    iconColor: "text-indigo-600",
  },
  {
    id: "ai-camera",
    label: "Pantauan Kelas",
    href: "/admin/camera-monitor",
    icon: Video,
    asset: "/icons/ai-classroom.png",
    badge: "Live",
    podBg: "bg-emerald-50/80 border border-emerald-100/60",
    iconColor: "text-emerald-600",
  },
  {
    id: "at-risk",
    label: "Evaluasi",
    href: "/admin/attendance",
    icon: AlertTriangle,
    asset: "/icons/laporan-rekap.png",
    badge: "Atensi",
    podBg: "bg-amber-50/80 border border-amber-100/60",
    iconColor: "text-amber-600",
  },
];

export function QuickAccessGrid({
  items = DEFAULT_ITEMS,
  className = "",
}: QuickAccessGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="card-3d-chip group flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 transition-all duration-200"
          >
            {/* Squircle Icon Pod (3D Floating Tint) */}
            <div
              className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl ${item.podBg} shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] group-hover:scale-105 transition-transform duration-200`}
            >
              {item.asset ? (
                <img
                  src={item.asset}
                  alt={item.label}
                  className="h-7 w-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 group-hover:scale-110 select-none"
                />
              ) : (
                <Icon className={`h-5 w-5 ${item.iconColor} stroke-[1.8]`} />
              )}
            </div>

            {/* Content Container: Horizontal on mobile, vertical stacked on desktop */}
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-800 tracking-tight truncate sm:line-clamp-1">
                {item.label}
              </span>

              {/* Micro Badge */}
              {item.badge && (
                <span className="mt-0.5 sm:mt-1.5 inline-flex w-fit items-center rounded-full bg-slate-100/90 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-600 border border-slate-200/50">
                  {item.badge}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
