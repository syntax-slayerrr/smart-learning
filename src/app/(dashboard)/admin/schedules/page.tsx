import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SchedulesClient } from "./schedules-client";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Master Jadwal" };

export default async function SchedulesPage() {
  const supabase = await createClient();

  // 1. Fetch schedules with joins
  const { data: schedules } = await supabase
    .from("schedules")
    .select(`
      *,
      classes ( name ),
      teachers ( profiles ( full_name ) ),
      subjects ( name )
    `)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  // 2. Fetch options for the form
  const [classesRes, teachersRes, subjectsRes] = await Promise.all([
    supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
    supabase.from("teachers").select("id, profiles ( full_name ), teacher_subjects(subject_id)").order("created_at", { ascending: false }),
    supabase.from("subjects").select("id, name").order("name"),
  ]);

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader 
        title="Jadwal Pelajaran" 
        description="Atur jadwal pelajaran tetap untuk sistem absensi otomatis" 
      />
      
      <SchedulesClient 
        schedules={schedules || []} 
        classes={classesRes.data || []}
        teachers={teachersRes.data || []}
        subjects={subjectsRes.data || []}
      />
    </div>
  );
}
