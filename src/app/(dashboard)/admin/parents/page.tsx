import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import ParentsClient from "./parents-client";

export const metadata: Metadata = { title: "Data Orang Tua" };

export default async function AdminParentsPage() {
  const supabase = await createClient();

  // Fetch parents with their profile and linked students
  const { data: parents } = await supabase
    .from("parents")
    .select(`
      id,
      phone_wa,
      profiles ( full_name, email ),
      student_parents (
        relationship,
        students (
          nis,
          profiles ( full_name )
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Fetch all students for the "Add Parent" form
  const { data: students } = await supabase
    .from("students")
    .select("id, profiles ( full_name ), nis")
    .order("nis");

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Data Orang Tua"
        description="Kelola akun orang tua dan hubungannya dengan siswa"
      />
      <ParentsClient initialParents={parents || []} students={students || []} />
    </div>
  );
}
