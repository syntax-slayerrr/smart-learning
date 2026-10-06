"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CRITICAL GLOBAL ERROR]:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/50 border border-slate-100 text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sistem Mengalami Kendala
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Aplikasi mengalami galat tak terduga. Sesi Anda tetap terlindungi, silakan coba muat ulang halaman.
          </p>

          {error.digest && (
            <div className="mt-3 inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-500">
              Ref: {error.digest}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => reset()}
              className="flex-1 rounded-2xl bg-[#007AFF] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0066D6] active:scale-[0.98] transition-all"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => (window.location.href = "/student/dashboard")}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              Ke Beranda
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
