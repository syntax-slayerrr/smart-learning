import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginInteractiveContainer } from "./login-interactive-container";
import { HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk | Smart Learning",
  description: "Portal masuk Sistem Akademik Terpadu & Presensi Digital Smart Learning — SYNTAX SLAYER",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-8 sm:py-12 selection:bg-blue-600/20 selection:text-blue-700 overflow-x-hidden select-none">
      <div className="relative z-10 w-full max-w-md animate-fade-in space-y-5">
        {/* Brand & Team Header - Left Aligned */}
        <div className="space-y-3">
          {/* Logo Brand: Transparent SYNTAX SLAYER Logo */}
          <div className="flex items-center justify-start">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="SYNTAX SLAYER"
              width={260}
              height={70}
              className="h-11 sm:h-12 w-auto object-contain"
              priority
            />
          </div>
        </div>

        {/* 3D Floating Glassmorphic Authentication & Interactive Mascot */}
        <div className="relative">
          {/* Chromatic Caustic Bloom Elements behind Glass */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-400/20 blur-[50px] pointer-events-none" />
          <div className="absolute top-1/2 -right-12 w-56 h-56 rounded-full bg-indigo-300/25 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-8 left-12 w-48 h-48 rounded-full bg-sky-300/20 blur-[45px] pointer-events-none" />

          {/* Interactive Login Container (Mascot reacts to role, username, password & click cycles all 15 moods) */}
          <LoginInteractiveContainer />
        </div>

        {/* Clean Divider */}
        <div className="w-full border-t border-slate-300/40 my-3" />

        {/* Links: Panduan */}
        <div className="flex items-center justify-center pb-8 sm:pb-4">
          <Link
            href="/panduan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-white text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-2xs transition-all active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Panduan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
