import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Sparkles, User, Radio, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk | Smart Learning",
  description: "Portal masuk Sistem Akademik Terpadu & Presensi Digital Smart Learning — SYNTAX SLAYER",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-8 sm:py-12 selection:bg-blue-600/20 selection:text-blue-700 overflow-x-hidden select-none">
      <div className="relative z-10 w-full max-w-md animate-fade-in space-y-5">
        {/* Brand & Team Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center pt-2">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="SYNTAX SLAYER"
              width={220}
              height={56}
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
              priority
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/60 backdrop-blur-xl px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span>Sistem Akademik Terpadu</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 pt-1">
              Smart Learning
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xs mx-auto drop-shadow-2xs">
              Presensi Digital & Portal Pembelajaran
            </p>
          </div>
        </div>

        {/* 3D Floating Glassmorphic Authentication Card Container */}
        <div className="relative">
          {/* Chromatic Caustic Bloom Elements behind Glass for Light Refraction */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-400/25 blur-[50px] pointer-events-none" />
          <div className="absolute top-1/2 -right-12 w-56 h-56 rounded-full bg-indigo-300/30 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-8 left-12 w-48 h-48 rounded-full bg-sky-300/25 blur-[45px] pointer-events-none" />

          {/* Genuine Frosted Glassmorphism Card */}
          <div className="relative overflow-hidden rounded-[28px] bg-white/68 backdrop-blur-[24px] saturate-[180%] p-6 sm:p-7 border border-white/80 ring-1 ring-white/50 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18),0_10px_24px_-6px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(255,255,255,0.95)] before:absolute before:inset-x-0 before:top-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent">
            <div className="mb-5 flex items-center justify-between border-b border-white/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  Masuk ke Akun
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  Masukkan identitas akun untuk melanjutkan
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50/80 backdrop-blur-md text-emerald-700 border border-emerald-200/70 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Aktif
              </span>
            </div>

            <LoginForm />
          </div>
        </div>

        {/* 3-Column Glassmorphic Value Proposition Chips */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="rounded-2xl bg-white/65 backdrop-blur-[20px] saturate-[180%] border border-white/80 ring-1 ring-white/40 p-2.5 text-center shadow-[0_10px_25px_-6px_rgba(15,23,42,0.1),0_2px_6px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/80">
            <div className="w-7 h-7 rounded-xl bg-blue-50/90 backdrop-blur-sm border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">AI Vision</span>
            <span className="text-[9px] text-slate-500 font-medium">Auto Telemetri</span>
          </div>

          <div className="rounded-2xl bg-white/65 backdrop-blur-[20px] saturate-[180%] border border-white/80 ring-1 ring-white/40 p-2.5 text-center shadow-[0_10px_25px_-6px_rgba(15,23,42,0.1),0_2px_6px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-50/90 backdrop-blur-sm border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Anti-Spoofing</span>
            <span className="text-[9px] text-slate-500 font-medium">GPS Geofence</span>
          </div>

          <div className="rounded-2xl bg-white/65 backdrop-blur-[20px] saturate-[180%] border border-white/80 ring-1 ring-white/40 p-2.5 text-center shadow-[0_10px_25px_-6px_rgba(15,23,42,0.1),0_2px_6px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white/80">
            <div className="w-7 h-7 rounded-xl bg-indigo-50/90 backdrop-blur-sm border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Real-Time</span>
            <span className="text-[9px] text-slate-500 font-medium">Zero Latency</span>
          </div>
        </div>

        {/* Subtle Divider with Sparkle Accent */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full border-t border-slate-300/40" />
          <div className="absolute bg-white/70 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/80 text-blue-500 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 fill-blue-500/20" />
          </div>
        </div>

        {/* Motivational Quote & Signature */}
        <div className="text-center space-y-1 pb-12 sm:pb-6">
          <p className="text-xs italic text-slate-600 font-medium">
            “Ilmu adalah senjata terbaik untuk masa depan.”
          </p>
          <p className="text-[10px] tracking-widest font-bold uppercase text-slate-400">
            SYNTAX SLAYER
          </p>
        </div>
      </div>
    </div>
  );
}