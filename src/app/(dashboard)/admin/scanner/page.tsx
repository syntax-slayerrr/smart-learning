import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminScannerPageClient } from "./scanner-client";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";

export const metadata: Metadata = {
  title: "Scanner Presensi Kartu Siswa | Admin Smart Learning",
};

export const dynamic = "force-dynamic";

export default async function AdminScannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verifikasi role admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="dashboard-container max-w-xl mx-auto space-y-4 pb-28 pt-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="apple-press inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-500" />
              Scanner Presensi Siswa
            </h1>
            <p className="text-xs text-slate-500">Pindai kartu identitas QR siswa</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Container */}
      <AdminScannerPageClient />
    </div>
  );
}