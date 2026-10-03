import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { CreateSessionForm } from "./create-session-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Buat Sesi Absensi" };

export default async function NewAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get teacher's classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, grade")
    .eq("is_active", true)
    .order("name");

  // Get teacher's assigned subjects
  const { data: teacherData } = await supabase
    .from("teachers")
    .select(`
      teacher_subjects (
        subjects ( id, name )
      )
    `)
    .eq("profile_id", user?.id)
    .single();

  const subjects = teacherData?.teacher_subjects
    ?.map((ts: any) => ts.subjects)
    .filter(Boolean) || [];

  return (
    <div className="dashboard-container max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader title="Buat Sesi Absensi" description="Pilih kelas dan mata pelajaran untuk memulai absensi" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <CreateSessionForm classes={classes || []} subjects={subjects || []} />
      </div>
    </div>
  );
}
