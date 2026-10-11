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
      {/* Grouped Card: Informasi Akun */}
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
        <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-foreground tracking-tight">
          <User className="h-4 w-4 text-primary" />
          Informasi Akun
        </h3>
        
        <div className="divide-y divide-border/40 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground font-medium">Nama Lengkap</span>
            <span className="font-semibold text-foreground">{cleanFullName}</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground font-medium">Alamat Email</span>
            <span className="font-mono text-foreground tabular-nums">{userProfile.email}</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-muted-foreground font-medium">Peran Pengguna</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground font-medium text-xs capitalize border border-border">
              {userProfile.role}
            </span>
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
        </form>
      </div>

      {/* Grouped Card: Keluar Akun */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/[0.02] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 tracking-tight">
              <LogOut className="h-4 w-4" />
              Keluar Sesi
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keluar dari akun Anda di perangkat ini.
            </p>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              await logoutAction();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white px-4 py-2 text-xs font-bold shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 min-h-[36px]"
          >
            {loggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses Keluar...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Keluar Akun</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
