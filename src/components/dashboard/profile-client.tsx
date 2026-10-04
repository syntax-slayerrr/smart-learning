"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Lock, Key, Check, Loader2, AlertCircle } from "lucide-react";

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

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
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
    <div className="max-w-2xl space-y-6">
      {/* Profile Info */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
          <User className="h-4 w-4 text-primary" /> Informasi Akun & Otoritas
        </h3>
        <div className="grid gap-3 text-xs">
          <div className="flex justify-between items-center border-b border-border/80 pb-2.5">
            <span className="text-muted-foreground font-medium">Nama Lengkap</span>
            <span className="font-semibold text-foreground">{userProfile.full_name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/80 pb-2.5">
            <span className="text-muted-foreground font-medium">Email Akun</span>
            <span className="font-mono font-medium text-foreground">{userProfile.email}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/80 pb-2.5">
            <span className="text-muted-foreground font-medium">Role Sistem</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-xs capitalize border border-primary/20">
              {userProfile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Key className="h-4 w-4 text-primary" /> Pengaturan Keamanan Kata Sandi
        </h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50/80 p-3 text-xs font-medium text-red-700 border border-red-200/80 animate-slide-up">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 p-3 text-xs font-medium text-emerald-700 border border-emerald-200/80 animate-slide-up">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Kata sandi akun Anda berhasil diperbarui!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="new-password" aria-label="Kata Sandi Baru" placeholder="Minimal 6 karakter"
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasi Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                id="confirm-new-password" aria-label="Konfirmasi Kata Sandi Baru" placeholder="Ulangi kata sandi baru"
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apple-press inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Menyimpan Pembaharuan...</span>
              </>
            ) : (
              "Simpan Kata Sandi Baru"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
