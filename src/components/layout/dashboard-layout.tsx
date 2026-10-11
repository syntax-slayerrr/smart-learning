"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { InstallPrompt } from "@/components/shared/install-prompt";
import { HermesCopilotWidget } from "@/components/ai/hermes-copilot-widget";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { UserRole } from "@/types/database";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
  userEmail: string;
}

export function DashboardLayout({
  children,
  role,
  userName,
  userEmail,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const isNotebook = pathname?.startsWith("/student/notebook");
  const isMobileAppRole = role === "teacher" || role === "student" || role === "parent";

  const handleLogout = () => {
    startTransition(() => {
      logoutAction();
    });
  };

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-transparent">
      {/* Sidebar navigation for admin only (teacher, student, parent are 100% mobile bottom-bar app style) */}
      {!isNotebook && !isMobileAppRole && (
        <Sidebar
          role={role}
          userName={userName}
          userEmail={userEmail}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Main App Canvas with Integrated Atmospheric Depth */}
      <div className="flex flex-1 h-full min-h-0 flex-col overflow-hidden relative bg-transparent">
        {!isNotebook && (
          <Header
            role={role}
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        <main
          className={
            isNotebook
              ? "flex-1 min-h-0 overflow-hidden p-0 focus:outline-none relative z-10 h-full w-full flex flex-col"
              : cn(
                  "flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 focus:outline-none relative z-10",
                  isMobileAppRole ? "pb-28 sm:pb-32" : "pb-28 sm:pb-32 lg:pb-8"
                )
          }
        >
          {children}
        </main>

        {/* Native Apple HIG Bottom Tab Bar (Visible on mobile for admin, persistent app dock for teacher/student/parent) */}
        {!isNotebook && (
          <MobileBottomNav role={role} onOpenMenu={() => setSidebarOpen(true)} />
        )}
      </div>

      <InstallPrompt />
      {role !== "student" && role !== "parent" && !isNotebook && <HermesCopilotWidget />}
    </div>
  );
}
