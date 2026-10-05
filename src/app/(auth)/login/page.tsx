import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Cpu, Sparkles, Lock, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Smart Learning",
  description: "Gerbang Masuk Ekosistem Smart Learning & Telemetri Berbasis AI — SYNTAX SLAYER",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-transparent px-4 py-8 sm:py-12 selection:bg-blue-600/20 selection:text-blue-700 overflow-x-hidden">
      <div className="relative z-10 w-full max-w-md animate-fade-in space-y-6">
        {/* Brand & Team Header with 3D Tactile Pod */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-20 blur-md group-hover:opacity-30 transition-opacity" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200/80 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] p-2.5">
                <Image
                  src="/logo_square_192.png"
                  alt="Logo SMK Muhammadiyah"
                  width={52}
                  height={52}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/80 px-3 py-0.5 text-[11px] font-semibold text-blue-700 shadow-xs">
              <Sparkles className="h-3 w-3 text-blue-600" />
              <span>Sistem Akademik Terpadu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 pt-1">
              Smart Learning
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-xs mx-auto">
              Presensi Digital & Portal Pembelajaran
            </p>
          </div>
        </div>

        {/* 3D Ceramic Authentication Card */}
        <div className="card-3d-ceramic rounded-3xl p-6 sm:p-7 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.02),0_16px_32px_-4px_rgba(30,41,59,0.08),0_32px_64px_-12px_rgba(15,23,42,0.06)] border border-slate-200/80 border-t border-t-white/90">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                Masuk ke Akun
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Masukkan identitas akun untuk melanjutkan
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Aktif
            </span>
          </div>

          <LoginForm />
        </div>

        {/* 3-Column Value Proposition Chips (Proton Vault Reference Screen 1) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">AI Vision</span>
            <span className="text-[9px] text-slate-500 font-medium">Auto Telemetri</span>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Anti-Spoofing</span>
            <span className="text-[9px] text-slate-500 font-medium">GPS Geofence</span>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/70 p-2.5 text-center shadow-xs flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight">Real-Time</span>
            <span className="text-[9px] text-slate-500 font-medium">Zero Latency</span>
          </div>
        </div>

        {/* Footer info & Security Guarantee */}
        <div className="pt-2 pb-10 sm:pb-4 flex flex-col items-center gap-1.5 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Keamanan data & privasi terenkripsi standar institusi</span>
          </div>
          <p className="text-xs text-slate-400">
            © 2026 Smart Learning • Platform Pendidikan Digital Terintegrasi
          </p>
        </div>
      </div>
    </div>
  );
}
