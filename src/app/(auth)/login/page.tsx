import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke sistem Absensi SMK Muhammadiyah TarKid",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <span className="text-2xl font-black tracking-tight">SL</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
            Smart Learning
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Platform Pembelajaran & Manajemen Kampus Cerdas
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-primary/5">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Selamat Datang
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Silakan masuk untuk mengakses dashboard
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
          © 2026 Smart Learning Ecosystem <br />
          Empowering Next-Generation Education
        </p>
      </div>
    </div>
  );
}
