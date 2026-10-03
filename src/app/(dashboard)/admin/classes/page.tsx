import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ClassesClient } from "./classes-client";

export const metadata: Metadata = { title: "Kelola Kelas" };

export default async function ClassesPage() {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, grade, academic_year, is_active, homeroom_teacher_id, teachers ( profiles ( full_name ) )")
    .order("grade")
    .order("name");

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, profiles ( full_name )")
    .order("created_at");

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader title="Kelola Kelas" description="Atur kelas dan wali kelas" />
      <ClassesClient
        classes={JSON.parse(JSON.stringify(classes || []))}
        teachers={JSON.parse(JSON.stringify(teachers || []))}
      />
    </div>
  );
}
