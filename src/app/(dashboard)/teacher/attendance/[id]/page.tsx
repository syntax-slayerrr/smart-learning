import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/attendance/status-badge";
import { SessionDetailClient } from "./session-detail-client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Detail Sesi Absensi" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select(`
      *,
      classes ( id, name, grade ),
      teachers ( id, profiles ( full_name ) ),
      subjects ( name )
    `)
    .eq("id", id)
    .single();

  if (!session) notFound();

  // Get students in the class
  const { data: classStudents } = await supabase
    .from("students")
    .select("id, nis, profiles ( full_name )")
    .eq("class_id", session.class_id);

  // Get attendance records for this session
  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, student_id, status, scanned_at, notes")
    .eq("session_id", id);

  const classes = session.classes as Record<string, unknown> | null;

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title={(session.subjects as any)?.name || "Pelajaran"}
          description={`${(classes?.name as string) || "—"} • ${session.session_date}`}
        />
      </div>

      <SessionDetailClient
        session={JSON.parse(JSON.stringify(session))}
        students={JSON.parse(JSON.stringify(classStudents || []))}
        records={JSON.parse(JSON.stringify(records || []))}
      />
    </div>
  );
}
