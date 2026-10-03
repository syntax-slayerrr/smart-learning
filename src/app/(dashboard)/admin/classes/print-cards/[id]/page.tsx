import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintClassClient } from "./print-class-client";

export default async function PrintClassCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch class details
  const { data: classData } = await supabase
    .from("classes")
    .select("name, grade, academic_year")
    .eq("id", id)
    .single();

  if (!classData) {
    return notFound();
  }

  // Fetch all students in this class
  const { data: students } = await supabase
    .from("students")
    .select(`
      id, nis,
      profiles ( full_name )
    `)
    .eq("class_id", id)
    .order("nis", { ascending: true });

  return (
    <PrintClassClient 
      classData={classData} 
      students={(students as any) || []} 
    />
  );
}
