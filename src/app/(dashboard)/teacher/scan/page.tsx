import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ScannerClient } from "./scanner-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Scan Kartu Siswa",
};

export const dynamic = "force-dynamic";

export default async function TeacherScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) {
    return <div>Data guru tidak ditemukan</div>;
  }

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Scan Kartu Siswa"
        description="Pindai Kartu Siswa menggunakan kamera untuk mencatat kehadiran"
      />
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ScannerClient />
      </div>
    </div>
  );
}
