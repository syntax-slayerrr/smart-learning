import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { User, GraduationCap, HelpCircle } from "lucide-react";
import { Mascot } from "@/components/Mascot";

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

          {/* Header Info & Right Slogan Stack */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="space-y-1.5 text-left flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/80 backdrop-blur-md px-3 py-1 text-xs font-semibold text-blue-700 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                <span>Sistem Akademik Terpadu</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                Smart Learning
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Presensi Digital & Portal Pembelajaran
              </p>
            </div>

            {/* Mascot: Tampil selalu di mobile dan desktop */}
            <div className="flex items-center shrink-0">
              <Mascot mood="semangat" size={64} say="Semangat Belajar!" follow={true} />
            </div>
          </div>
        </div>

        {/* 3D Floating Glassmorphic Authentication Card Container */}
        <div className="relative">
          {/* Chromatic Caustic Bloom Elements behind Glass */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-400/20 blur-[50px] pointer-events-none" />
          <div className="absolute top-1/2 -right-12 w-56 h-56 rounded-full bg-indigo-300/25 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-8 left-12 w-48 h-48 rounded-full bg-sky-300/20 blur-[45px] pointer-events-none" />

          {/* Frosted Glassmorphism Card */}
          <div className="relative overflow-hidden rounded-[28px] bg-white/75 backdrop-blur-[24px] saturate-[180%] p-6 sm:p-7 border border-white/80 ring-1 ring-black/5 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.14),0_10px_24px_-6px_rgba(15,23,42,0.06),inset_0_1px_2px_rgba(255,255,255,0.95)] before:absolute before:inset-x-0 before:top-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100/80 pb-3">
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

        {/* Clean Divider */}
        <div className="w-full border-t border-slate-300/40 my-3" />

        {/* Link Panduan Pengguna & Bantuan */}
        <div className="flex items-center justify-center">
          <Link
            href="/panduan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-white text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-2xs transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Panduan Pengguna</span>
          </Link>
        </div>

        {/* Motivational Quote & Signature */}
        <div className="text-center space-y-1 pb-10 sm:pb-4">
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
