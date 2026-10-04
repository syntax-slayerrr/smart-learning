"use client";

import { useState, useTransition } from "react";
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

  const handleLogout = () => {
    startTransition(() => {
      logoutAction();
    });
  };

  return (
    <div className="flex min-h-dvh h-dvh overflow-hidden bg-background">
      {/* Sidebar navigation for desktop and slide drawer for mobile menu */}
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main App Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header role={role} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 focus:outline-none">
          {children}
        </main>

        {/* Native Apple HIG Bottom Tab Bar for Mobile */}
        <MobileBottomNav role={role} onOpenMenu={() => setSidebarOpen(true)} />
      </div>

      <InstallPrompt />
      <HermesCopilotWidget />
    </div>
  );
}
