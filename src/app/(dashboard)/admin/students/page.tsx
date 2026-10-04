import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StudentsClient } from "./students-client";

export const metadata: Metadata = { title: "Kelola Siswa" };

export default async function StudentsPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, nis, class_id, device_id, created_at, profiles ( full_name, email, phone ), classes ( name )")
    .order("created_at", { ascending: false });

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, grade")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="DATA MASTER CIVITAS • SMK TI SYNTAX SLAYER"
        title="Direktori & Manajemen Siswa"
        description="Kelola data induk siswa, penugasan rombel kelas, kartu pintar QR, dan pengaturan kunci perangkat HP."
      />
      <StudentsClient
        students={JSON.parse(JSON.stringify(students || []))}
        classes={JSON.parse(JSON.stringify(classes || []))}
      />
    </div>
  );
}
