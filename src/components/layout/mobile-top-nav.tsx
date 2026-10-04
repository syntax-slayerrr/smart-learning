"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface MobileTopNavProps {
  role: UserRole;
}

export function MobileTopNav({ role }: MobileTopNavProps) {
  const pathname = usePathname();

  if (role !== "admin") return null;

  const destinations = [
    { label: "Beranda", href: "/admin" },
    { label: "Siswa", href: "/admin/students" },
    { label: "Absensi", href: "/admin/attendance" },
    { label: "AI Classroom", href: "/admin/camera-monitor" },
    { label: "Laporan", href: "/admin/reports" },
    { label: "Pengaturan", href: "/admin/settings" },
  ];

  return (
    <div className="lg:hidden border-b border-[rgba(60,60,67,0.08)] bg-[#F7F7F5]/95 px-4 py-2 backdrop-blur-md overflow-x-auto scrollbar-none">
      <nav className="flex items-center gap-1.5 min-w-max">
        {destinations.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 select-none min-h-[36px] flex items-center",
                isActive
                  ? "bg-[#007AFF] text-white font-semibold shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                  : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border border-[rgba(60,60,67,0.12)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
