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

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        {state?.error && (
          <div className="rounded-lg border border-red-200/80 bg-red-50/80 px-3.5 py-2.5 text-xs font-medium text-red-700 animate-slide-up flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
            {state.error}
          </div>
        )}

        {/* Username Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Username
            </label>
            <div className="flex items-center gap-1">
              {["admin", "guru", "siswa", "ortu"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setUsername(r);
                    setPassword("password123");
                  }}
                  className="text-[10px] px-2 py-1 rounded-md font-mono bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-border/80 apple-press min-h-[32px] inline-flex items-center"
                  title={`Gunakan username ${r} (password123)`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin, guru, siswa, atau ortu"
              className="w-full min-h-[44px] rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Kata Sandi
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full min-h-[44px] rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending}
          className="apple-press group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 min-h-[44px] text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memverifikasi Otorisasi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
