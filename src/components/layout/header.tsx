"use client";

import { Menu, Bell } from "lucide-react";
import { getRoleLabel } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";

interface HeaderProps {
  role: UserRole;
  onMenuClick: () => void;
}

export function Header({ role, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {getRoleLabel(role)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
