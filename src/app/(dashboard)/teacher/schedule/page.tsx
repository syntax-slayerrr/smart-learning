import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import {
  CalendarDays,
  Clock,
  BookOpen,
  ChevronLeft,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Jadwal Mengajar Guru",
};

const DAY_NAMES: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export default async function TeacherSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get teacher ID
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profiles(full_name)")
    .eq("profile_id", user.id)
    .single();

  const teacherName =
    ((teacher?.profiles as unknown as Record<string, unknown>)?.full_name as string) ||
    "Guru";

  // Fetch all schedules for this teacher
  const { data: schedules } = await supabase
    .from("schedules")
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      classes ( id, name ),
      subjects ( id, name )
    `)
    .eq("teacher_id", teacher?.id || "")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const schedulesByDay = (schedules || []).reduce(
    (acc: Record<number, Array<Record<string, unknown>>>, item: Record<string, unknown>) => {
      const day = item.day_of_week as number;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    },
    {}
  );

  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-2 pt-1">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      <PageHeader
        eyebrow="JADWAL MENGAJAR"
        title="Jadwal Pelajaran Mingguan"
        description={`${teacherName} • Agenda mengajar tetap berdasarkan kalender akademik`}
      />

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((dayNum) => {
          const daySchedules = schedulesByDay[dayNum] || [];
          const isToday = currentDayOfWeek === dayNum;

          return (
            <div
              key={dayNum}
              className={`rounded-xl border transition-all overflow-hidden ${
                isToday
                  ? "border-primary/40 bg-card shadow-xs ring-1 ring-primary/20"
                  : "border-border bg-card/60 shadow-2xs"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/70 ${
                  isToday ? "bg-primary/5" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays
                    className={`h-4 w-4 ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <h3
                    className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {DAY_NAMES[dayNum]}
                  </h3>
                  {isToday && (
                    <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[9px] font-mono font-bold text-primary">
                      HARI INI
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {daySchedules.length} Sesi
                </span>
              </div>

              {daySchedules.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {daySchedules.map((sched: Record<string, unknown>) => {
                    const sub = sched.subjects as Record<string, unknown> | null;
                    const cls = sched.classes as Record<string, unknown> | null;

                    return (
                      <div
                        key={sched.id as string}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 sm:py-3.5 gap-2 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {(sub?.name as string) || "Mata Pelajaran"}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                              <Users className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                Kelas: {(cls?.name as string) || "—"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {sched.start_time as string} - {sched.end_time as string} WIB
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground italic">
                  Tidak ada jadwal mengajar pada hari {DAY_NAMES[dayNum]}.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
