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
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-2xs">
        <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-slate-900 tracking-tight">
          <User className="h-4 w-4 text-[#007AFF]" />
          Informasi Akun
        </h3>
        
        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Nama Lengkap</span>
            <span className="font-semibold text-slate-900">{cleanFullName}</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Alamat Email</span>
            <span className="font-mono text-slate-800">{userProfile.email}</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-slate-500 font-medium">Peran Pengguna</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium text-xs capitalize border border-slate-200/60">
              {userProfile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Card: Ubah Kata Sandi */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-2xs">
        <h3 className="text-sm font-semibold mb-3.5 flex items-center gap-2 text-slate-900 tracking-tight">
          <Key className="h-4 w-4 text-[#007AFF]" />
          Ubah Kata Sandi
        </h3>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200/80">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200/80">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Kata sandi berhasil diperbarui!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="new-password" 
                aria-label="Kata Sandi Baru" 
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-[#007AFF]/15 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Konfirmasi Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                id="confirm-new-password" 
                aria-label="Konfirmasi Kata Sandi Baru" 
                placeholder="Ulangi kata sandi baru"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-[#007AFF]/15 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-[#007AFF] hover:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
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
    </div>
  );
}
