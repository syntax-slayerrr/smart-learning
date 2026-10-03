import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TeachersClient } from "./teachers-client";

export const metadata: Metadata = { title: "Kelola Guru" };

export default async function TeachersPage() {
  const supabase = await createClient();

  const [{ data: teachers }, { data: subjects }] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, nip, created_at, profiles ( full_name, email, phone ), teacher_subjects ( subject_id, subjects ( name, code ) )")
      .order("created_at", { ascending: false }),
    supabase
      .from("subjects")
      .select("id, name, code")
      .order("name"),
  ]);

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader title="Kelola Guru" description="Tambah, edit, dan hapus data guru" />
      <TeachersClient
        teachers={JSON.parse(JSON.stringify(teachers || []))}
        subjects={JSON.parse(JSON.stringify(subjects || []))}
      />
    </div>
  );
}
