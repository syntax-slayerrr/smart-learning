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

      {/* Main App Canvas with 3D Spatial Ambient Depth */}
      <div className="flex flex-1 flex-col overflow-hidden relative bg-[#F8FAFC]">
        {/* Ambient 3D Spatial Background Blooms (Subtle blur mesh, non-blocking) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-500/[0.07] blur-[120px]" />
          <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-slate-500/[0.05] blur-[100px]" />
          <div className="absolute -bottom-20 right-1/4 w-96 h-96 rounded-full bg-indigo-500/[0.04] blur-[130px]" />
        </div>

        <Header role={role} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-28 sm:pb-32 lg:pb-8 focus:outline-none relative z-10">
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
