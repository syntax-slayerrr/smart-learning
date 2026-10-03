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
  const navItems = NAV_ITEMS[role];

  interface NavItem {
    label: string;
    href: string;
    icon: string;
    group?: string;
  }

  // Group nav items by their semantic group field
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E7E2DA] bg-[#FBF9F5] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[#E7E2DA] px-4 py-3 bg-[#FBF9F5]">
          <Link
            href={`/${role}`}
            className="flex items-center gap-3 apple-press group"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E7E2DA] bg-white p-1 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/brand/syntax-slayer-logo.png"
                alt="SYNTAX SLAYER"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-stone-900 leading-tight">
                SYNTAX SLAYER
              </span>
              <span className="text-[11px] font-semibold text-[#EA580C] tracking-wide">
                Smart Learning
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-[#F5F2EB] hover:text-stone-900 lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categorized Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {Object.entries(groupedItems).map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                {groupTitle}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== `/${role}` &&
                      pathname.startsWith(item.href));

                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 apple-press",
                          isActive
                            ? "bg-[#EA580C] text-white shadow-xs font-semibold"
                            : "text-stone-700 hover:bg-[#F5F2EB] hover:text-stone-900"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-white" : "text-stone-500"
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

        {/* User Section (Refined Warm Stone Card) */}
        <div className="border-t border-[#E7E2DA] p-3 bg-[#FBF9F5]">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E7E2DA] bg-white p-2.5 shadow-2xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EA580C]/10 text-xs font-bold text-[#EA580C]">
              {getInitials(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-stone-900 leading-tight">
                {userName}
              </p>
              <p className="truncate text-[10px] text-stone-500 font-mono">
                {userEmail}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors apple-press"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
