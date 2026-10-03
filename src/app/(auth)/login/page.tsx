import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Smart Learning",
  description: "Gerbang Masuk Ekosistem Smart Learning & Telemetri Berbasis AI — SYNTAX SLAYER",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand & Team Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-xs overflow-hidden p-2">
              <Image
                src="/brand/syntax-slayer-logo.png"
                alt="SYNTAX SLAYER Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary mb-2">
            <Cpu className="h-3 w-3" />
            <span>SYNTAX SLAYER • Core Engine v2.4</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Smart Learning
          </h1>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            AI-Powered Telemetry & Institutional Academic Intelligence
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">
              Otorisasi Akses
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Masukkan kredensial akun terdaftar untuk melanjutkan ke dashboard
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Footer info & Security Guarantee */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>End-to-End Cryptographic Attendance & AI Telemetry Security</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            © 2026 Tim SYNTAX SLAYER • Dirancang untuk Kejuaraan Web Dev Nasional
          </p>
        </div>
      </div>
    </div>
  );
}

