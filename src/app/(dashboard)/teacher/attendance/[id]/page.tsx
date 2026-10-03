import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SessionDetailClient } from "./session-detail-client";
import { SessionDynamicsPanel } from "@/components/dashboard/session-dynamics-panel";
import { TeacherMobilityMap } from "@/components/dashboard/teacher-mobility-map";
import { getSessionDynamics } from "@/services/student-analytics";
import { ArrowLeft, Sparkles, MapPin } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Detail Sesi Absensi" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionRes, dynamics] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select(`
        *,
        classes ( id, name, grade ),
        teachers ( id, profiles ( full_name ) ),
        subjects ( name )
      `)
      .eq("id", id)
      .single(),
    getSessionDynamics(id),
  ]);

  const session = sessionRes.data;
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

  // Extract zones from telemetry timeline for mobility heatmap
  const zoneCounts: Record<string, number> = {};
  if (dynamics?.timeline) {
    dynamics.timeline.forEach((t) => {
      if (t.teacher_zone) {
        zoneCounts[t.teacher_zone] = (zoneCounts[t.teacher_zone] || 0) + 1;
      }
    });
  }
  const mobilityZones = Object.entries(zoneCounts).map(([zone, count]) => ({
    zone,
    count,
  }));

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

      {/* Attendance Scanning & Record Management */}
      <SessionDetailClient
        session={JSON.parse(JSON.stringify(session))}
        students={JSON.parse(JSON.stringify(classStudents || []))}
        records={JSON.parse(JSON.stringify(records || []))}
      />

      {/* AI Telemetry & Classroom Dynamics */}
      {dynamics && dynamics.timeline.length > 0 ? (
        <div className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-foreground">
              Analisis Dinamika & Telemetri Kelas (AI)
            </h3>
          </div>

          <SessionDynamicsPanel
            subjectName={dynamics.subject_name}
            className={dynamics.class_name}
            sessionDate={dynamics.session_date}
            timeline={dynamics.timeline}
            totals={dynamics.totals}
            insights={dynamics.insights}
          />

          {/* Teacher Mobility Heatmap */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-foreground">
                Peta Mobilitas Mengajar Guru
              </h4>
            </div>
            <TeacherMobilityMap zones={mobilityZones} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

