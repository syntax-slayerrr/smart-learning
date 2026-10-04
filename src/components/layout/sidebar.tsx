"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/types/database";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Settings,
  History,
  QrCode,
  Bell,
  LogOut,
  X,
  UserCircle,
  BookOpen,
  Calendar,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Settings,
  History,
  QrCode,
  Bell,
  UserCircle,
  BookOpen,
  Calendar,
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({
  role,
  userName,
  userEmail,
  open,
  onClose,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS[role] || [];

  interface NavItem {
    label: string;
    href: string;
    icon: string;
    group?: string;
  }

  // Group nav items by semantic group field
  const groupedItems = (navItems as readonly NavItem[]).reduce<Record<string, NavItem[]>>(
    (acc, item) => {
      const g = item.group || "MENU UTAMA";
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    },
    {}
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Persistent / Sheet Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-stone-200 dark:border-white/10 bg-[#F7F5F0] dark:bg-[#121110] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-3 bg-[#F7F5F0] dark:bg-[#121110]">
          <Link
            href={`/${role}`}
            className="flex items-center gap-3 group"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-1 shadow-xs transition-transform duration-150 group-hover:scale-105">
              <Image
                src="/brand/syntax-slayer-logo.png"
                alt="SYNTAX SLAYER"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                SYNTAX SLAYER
              </span>
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 tracking-wide">
                SMK TI • Smart Learning
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 dark:hover:bg-zinc-800 dark:hover:text-stone-100 lg:hidden transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categorized Navigation */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {Object.entries(groupedItems).map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {groupTitle}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== `/${role}` && pathname.startsWith(item.href));

                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium min-h-[44px] transition-all duration-150 active:scale-[0.98]",
                          isActive
                            ? "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 font-semibold border-l-2 border-orange-600 dark:border-orange-500 shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-100"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-orange-600 dark:text-orange-400" : "text-stone-400 dark:text-stone-500"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Account Card */}
        <div className="border-t border-stone-200 dark:border-white/10 p-3.5 bg-[#F7F5F0] dark:bg-[#121110]">
          <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-2.5 shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400">
              {getInitials(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                {userName}
              </p>
              <p className="truncate text-[11px] font-mono text-stone-500 dark:text-stone-400">
                {userEmail}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-500/10 hover:text-red-600 transition-colors active:scale-[0.98]"
              title="Keluar"
              aria-label="Keluar dari akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
