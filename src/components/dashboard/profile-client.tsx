"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logoutAction } from "@/app/(auth)/login/actions";
import { User, Lock, Key, Check, Loader2, AlertCircle, LogOut } from "lucide-react";

export default function ProfileClient({ 
  userProfile 
}: { 
  userProfile: { full_name: string; email: string; role: string } 
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Bersihkan anotasi dummy seperti "(Siswa Slayer)" agar nama bersih & layak produksi
  const cleanFullName = userProfile.full_name.replace(/\s*\([^)]*slayer[^)]*\)/gi, "").trim();

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Grouped Card: Informasi Akun dengan Cover Banner (Opsi 2) */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {/* Banner Cover Artwork */}
        <div className="relative h-28 sm:h-36 w-full bg-slate-900 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/brand/header-banner.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          <div className="absolute bottom-2.5 right-3 text-right">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/50 text-[10px] font-mono text-cyan-300 font-semibold backdrop-blur-md border border-cyan-400/30">
              SYNTAX SLAYER
            </span>
          </div>
        </div>

        {/* Profile Card Body with Overlapping Avatar */}
        <div className="p-5 sm:p-6 pt-0 relative">
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3.5">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-900 border-4 border-card flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md relative z-10">
              {cleanFullName.slice(0, 2).toUpperCase()}
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs capitalize border border-primary/20 mb-1">
              {userProfile.role}
            </span>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {cleanFullName}
            </h2>
            <p className="text-xs font-mono text-muted-foreground tabular-nums">
              {userProfile.email}
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-border/60 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">ID Akses</span>
              <span className="font-semibold text-foreground font-mono">AKTIF • TERCATAT</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Mode Enkripsi</span>
              <span className="font-semibold text-foreground font-mono">SUPABASE SSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Card: Ubah Kata Sandi */}
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
        <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-foreground tracking-tight">
          <Key className="h-4 w-4 text-primary" />
          Ubah Kata Sandi
        </h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Kata sandi berhasil diperbarui!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="new-password" 
                aria-label="Kata Sandi Baru" 
                placeholder="Minimal 6 karakter"
                className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-xs font-medium text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Konfirmasi Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                id="confirm-new-password" 
                aria-label="Konfirmasi Kata Sandi Baru" 
                placeholder="Ulangi kata sandi baru"
                className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-xs font-medium text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 min-h-[36px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                "Simpan Kata Sandi"
              )}
            </button>

            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logoutAction();
              }}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors self-start sm:self-center cursor-pointer disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{loggingOut ? "Keluar..." : "Keluar Sesi"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
