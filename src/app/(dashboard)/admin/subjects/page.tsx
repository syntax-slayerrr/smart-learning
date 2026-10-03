import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import SubjectsClient from "./subjects-client";

export const metadata: Metadata = { title: "Data Mata Pelajaran" };

export default async function AdminSubjectsPage() {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .order("name");

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Data Mata Pelajaran"
        description="Kelola daftar resmi mata pelajaran di sekolah"
      />
      <SubjectsClient initialSubjects={subjects || []} />
    </div>
  );
}
