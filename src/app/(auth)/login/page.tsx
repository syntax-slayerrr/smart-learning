import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Sparkles, User, Radio, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Smart Learning",
  description: "Gerbang Masuk Ekosistem Smart Learning & Telemetri Berbasis AI — SYNTAX SLAYER",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-8 sm:py-12 selection:bg-blue-600/20 selection:text-blue-700 overflow-x-hidden">
      <div className="relative z-10 w-full max-w-md animate-fade-in space-y-6">
        {/* Brand & Team Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center pt-2">
            <Image
              src="/brand/syntax-slayer-logo.png"
              alt="SYNTAX SLAYER"
              width={220}
              height={56}
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-xs"
              priority
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-xs">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span>Sistem Akademik Terpadu</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 pt-1">
              Smart Learning
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto">
              Presensi Digital & Portal Pembelajaran
            </p>
          </div>
        </div>

        {/* 3D Elevated Authentication Card */}
        <div className="rounded-[26px] bg-white p-6 sm:p-7 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.09),0_2px_6px_rgba(15,23,42,0.04)] border border-slate-200/80">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Masuk ke Akun
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Masukkan identitas akun untuk melanjutkan
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Aktif
            </span>
          </div>

          <LoginForm />
        </div>

        {/* 3-Column Value Proposition Chips */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">AI Vision</span>
            <span className="text-[9px] text-slate-500 font-medium">Auto Telemetri</span>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Anti-Spoofing</span>
            <span className="text-[9px] text-slate-500 font-medium">GPS Geofence</span>
          </div>

          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Real-Time</span>
            <span className="text-[9px] text-slate-500 font-medium">Zero Latency</span>
          </div>
        </div>

        {/* Divider with Sparkle Accent */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full border-t border-slate-300/60" />
          <div className="absolute bg-[#F8FAFC]/90 backdrop-blur-xs px-2.5 text-blue-500">
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
