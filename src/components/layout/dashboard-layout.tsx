"use client";

import { useState, useTransition } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileTopNav } from "./mobile-top-nav";
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} onMenuClick={() => setSidebarOpen(true)} />
        <MobileTopNav role={role} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <InstallPrompt />
      <HermesCopilotWidget />
    </div>
  );
}
