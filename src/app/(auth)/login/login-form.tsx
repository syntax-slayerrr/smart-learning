"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Loader2, User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelect = (r: string) => {
    setSelectedRole(r);
    setUsername(r);
    setPassword("password123");
  };

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        {state?.error && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-3.5 py-2.5 text-xs font-medium text-rose-700 animate-slide-up flex items-center gap-2 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-ping" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Role Quick Selector (Tactile Segmented Pill) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pilih Role Akun
            </label>
            <span className="text-[10px] text-slate-400">Demo auto-fill</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-200/40 backdrop-blur-md border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(15,23,42,0.05)]">
            {[
              { id: "admin", label: "Admin" },
              { id: "guru", label: "Guru" },
              { id: "siswa", label: "Siswa" },
              { id: "ortu", label: "Ortu" },
            ].map((r) => {
              const active = selectedRole === r.id || username === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-center active:scale-[0.93] touch-manipulation select-none ${
                    active
                      ? "bg-white/95 backdrop-blur-md text-blue-600 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.12),0_1px_3px_rgba(15,23,42,0.08)] border border-white font-bold scale-[1.02]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Username Field with Debossed Inset */}
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
          >
            Username
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-white/80 border border-slate-200/60 flex items-center justify-center text-slate-500 shadow-xs">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSelectedRole(null);
              }}
              placeholder="admin, guru, siswa, atau ortu"
              className="w-full rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-md py-3 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 font-sans tracking-tight shadow-[inset_0_2px_4px_rgba(15,23,42,0.03)] focus:bg-white/95 focus:backdrop-blur-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>
        </div>

        {/* Password Field with Debossed Inset */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Kata Sandi
            </label>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-white/80 border border-slate-200/60 flex items-center justify-center text-slate-500 shadow-xs">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-md py-3 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 font-sans shadow-[inset_0_2px_4px_rgba(15,23,42,0.03)] focus:bg-white/95 focus:backdrop-blur-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 3D Elevated CTA Button with Taptic Spring Feedback */}
        <button
          type="submit"
          disabled={pending}
          className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(37,99,235,0.45),0_4px_12px_-2px_rgba(37,99,235,0.2)] border-t border-white/35 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-6px_rgba(37,99,235,0.55)] active:scale-[0.965] active:translate-y-0 active:shadow-[0_4px_10px_-2px_rgba(37,99,235,0.4)] disabled:opacity-50 cursor-pointer touch-manipulation select-none"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Memverifikasi Akses...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
