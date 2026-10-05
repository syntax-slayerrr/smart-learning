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
    badge: "Scanner",
    podBg: "bg-blue-50/80 border border-blue-100/60",
    iconColor: "text-blue-600",
  },
  {
    id: "classes",
    label: "Kelas",
    href: "/admin/classes",
    icon: GraduationCap,
    badge: "Aktif",
    podBg: "bg-indigo-50/80 border border-indigo-100/60",
    iconColor: "text-indigo-600",
  },
  {
    id: "ai-camera",
    label: "AI Vision",
    href: "/admin/camera-monitor",
    icon: Video,
    badge: "Live",
    podBg: "bg-emerald-50/80 border border-emerald-100/60",
    iconColor: "text-emerald-600",
  },
  {
    id: "at-risk",
    label: "Evaluasi",
    href: "/admin/attendance",
    icon: AlertTriangle,
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
    <div className={`grid grid-cols-4 gap-2.5 sm:gap-3.5 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="card-3d-chip group flex flex-col items-center justify-between p-2.5 sm:p-3 text-center"
          >
            {/* Squircle Icon Pod (3D Floating Tint) */}
            <div
              className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl ${item.podBg} shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] group-hover:scale-105 transition-transform duration-200`}
            >
              <Icon className={`h-5 w-5 ${item.iconColor} stroke-[1.8]`} />
            </div>

            {/* Label */}
            <span className="mt-2 text-[11px] sm:text-xs font-semibold text-slate-800 tracking-tight line-clamp-1">
              {item.label}
            </span>

            {/* Micro Badge */}
            {item.badge && (
              <span className="mt-1 inline-flex items-center rounded-full bg-slate-100/90 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-600 border border-slate-200/50">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
