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
    { label: "Presensi Siswa", href: "/admin/attendance" },
    { label: "Presensi Guru", href: "/admin/attendance/teachers" },
    { label: "Direktori Siswa", href: "/admin/students" },
    { label: "Laporan & Rekap", href: "/admin/reports" },
    { label: "Pengaturan", href: "/admin/settings" },
  ];

  return (
    <div className="lg:hidden border-b border-stone-200 dark:border-white/10 bg-[#FBF9F5]/95 dark:bg-[#121110]/95 px-4 py-2 backdrop-blur-md overflow-x-auto scrollbar-none">
      <nav className="flex items-center gap-2 min-w-max">
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
                "rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 select-none min-h-[44px] flex items-center active:scale-[0.98]",
                isActive
                  ? "bg-orange-600 text-white font-semibold shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-white/10"
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
