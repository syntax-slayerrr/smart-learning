import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { LiveCameraMonitor } from "@/components/dashboard/live-camera-monitor";
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
  QrCode,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Classroom Vision & Live Monitor — Guru | Smart Learning",
  description: "Pemantauan visual kelas real-time berbasis sesi mengajar aktif demi privasi dan fokus pembelajaran.",
};

export default async function TeacherCameraMonitorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil data profil guru
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profile_id, profiles(full_name)")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!teacher) {
    redirect("/teacher");
  }

  const teacherId = teacher.id;
  const teacherProfile = (teacher.profiles as unknown) as Record<string, unknown> | null;
  const teacherName = (teacherProfile?.full_name as string) || "Bapak/Ibu Guru";

  // 2. Dapatkan waktu saat ini dalam WIB
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = nowWib.getUTCDay();
  const currentTime =
    nowWib.getUTCHours().toString().padStart(2, "0") +
    ":" +
    nowWib.getUTCMinutes().toString().padStart(2, "0");
  const timeDisplay = nowWib.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  // 3. Query sesi presensi aktif & jadwal hari ini secara paralel
  const [activeSessionRes, currentScheduleRes, todaySchedulesRes] = await Promise.all([
    // Prioritas 1: Sesi presensi yang sedang berlangsung (status = 'active')
    supabase
      .from("attendance_sessions")
      .select(`
        id, class_id, subject_id, status, title,
        classes ( id, name ),
        subjects ( id, name )
      `)
      .eq("teacher_id", teacherId)
      .eq("status", "active")
      .maybeSingle(),

    // Prioritas 2: Jadwal resmi di jam saat ini
    supabase
      .from("schedules")
      .select(`
        id, class_id, subject_id, start_time, end_time,
        classes ( id, name ),
        subjects ( id, name )
      `)
      .eq("teacher_id", teacherId)
      .eq("day_of_week", dayOfWeek)
      .lte("start_time", currentTime)
      .gte("end_time", currentTime)
      .maybeSingle(),

    // Seluruh jadwal mengajar guru hari ini (untuk informasi saat standby)
    supabase
      .from("schedules")
      .select(`
        id, class_id, subject_id, start_time, end_time,
        classes ( id, name ),
        subjects ( id, name )
      `)
      .eq("teacher_id", teacherId)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true }),
  ]);

  const activeSession = activeSessionRes.data;
  const currentSchedule = currentScheduleRes.data;
  const todaySchedules = todaySchedulesRes.data || [];

  // 4. Tentukan konteks kelas & mata pelajaran yang aktif
  let activeClass: { id: string; name: string } | null = null;
  let activeSubject: { id: string; name: string } | null = null;
  let activeSourceInfo = "";

  if (activeSession && activeSession.classes && activeSession.subjects) {
    const cls = Array.isArray(activeSession.classes) ? activeSession.classes[0] : activeSession.classes;
    const sbj = Array.isArray(activeSession.subjects) ? activeSession.subjects[0] : activeSession.subjects;
    activeClass = cls as { id: string; name: string };
    activeSubject = sbj as { id: string; name: string };
    activeSourceInfo = `Sesi Presensi Aktif • ${activeSession.title || "Kelas Sedang Berlangsung"}`;
  } else if (currentSchedule && currentSchedule.classes && currentSchedule.subjects) {
    const cls = Array.isArray(currentSchedule.classes) ? currentSchedule.classes[0] : currentSchedule.classes;
    const sbj = Array.isArray(currentSchedule.subjects) ? currentSchedule.subjects[0] : currentSchedule.subjects;
    activeClass = cls as { id: string; name: string };
    activeSubject = sbj as { id: string; name: string };
    const startStr = String(currentSchedule.start_time).slice(0, 5);
    const endStr = String(currentSchedule.end_time).slice(0, 5);
    activeSourceInfo = `Jadwal Pelajaran (${startStr} - ${endStr} WIB)`;
  }

  // 5. KONDISI A: TIDAK ADA SESI ATAU JADWAL AKTIF (Akses Dibatasi Demi Privasi Kelas)
  if (!activeClass) {
    return (
      <div className="dashboard-container max-w-xl mx-auto space-y-4 animate-fade-in pb-28 pt-2 sm:pt-6">
        <div className="card-3d-ceramic p-6 sm:p-7 text-center flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-4 shadow-sm">
            <ShieldAlert className="h-7 w-7 stroke-[2]" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2.5">
            AKSES TERBATAS JADWAL
          </span>

          <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
            Tidak Ada Kelas Aktif
          </h2>

          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            Kamera AI hanya aktif saat jam mengajar Anda berlangsung demi menjaga privasi kelas.
          </p>

          <div className="w-full mt-5 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Jadwal Mengajar Hari Ini
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {timeDisplay} WIB
              </span>
            </div>

            {todaySchedules.length > 0 ? (
              <div className="space-y-2 text-left">
                {todaySchedules.map((sched: any) => {
                  const cls = Array.isArray(sched.classes) ? sched.classes[0] : sched.classes;
                  const sbj = Array.isArray(sched.subjects) ? sched.subjects[0] : sched.subjects;
                  const startStr = String(sched.start_time).slice(0, 5);
                  const endStr = String(sched.end_time).slice(0, 5);

                  return (
                    <div
                      key={sched.id}
                      className="rounded-xl border border-border/70 bg-muted/30 p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-foreground truncate">
                          {sbj?.name || "Mata Pelajaran"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Kelas {cls?.name || "-"}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-primary bg-background px-2 py-1 rounded-lg border border-border shrink-0">
                        {startStr} - {endStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Tidak ada jadwal mata pelajaran hari ini.
                </p>
              </div>
            )}
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-2 mt-5">
            <Link
              href="/teacher/scan"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-primary/90 transition-all min-h-[42px]"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan Presensi Siswa</span>
            </Link>
            <Link
              href="/teacher"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground px-4 py-2.5 text-xs font-semibold shadow-xs transition-all min-h-[42px]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 6. KONDISI B: SESI / JADWAL AKTIF BERJALAN (Kamera Terkunci Khusus Kelas Ini)
  return (
    <div className="dashboard-container max-w-7xl space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="KAMERA TERKUNCI KELAS ANDA"
        title="AI Classroom Vision & Live Monitor"
        description="Pemantauan telemetri fokus, interaksi, dan kehadiran siswa khusus pada sesi mengajar aktif Anda."
      />

      {/* Verified Schedule Lock Banner */}
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xs sm:text-sm">
                {activeSubject?.name || "Mata Pelajaran"} — Kelas {activeClass.name}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                TERVERIFIKASI
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {activeSourceInfo} • Akses kamera dibatasi hanya pada kelas ini demi privasi sekolah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/teacher/history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-all"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>Riwayat Sesi</span>
          </Link>
        </div>
      </div>

      {/* Main AI Live Monitoring Command Center Terkunci ke Kelas Aktif Guru */}
      <LiveCameraMonitor
        role="teacher"
        teacherId={teacherId}
        lockedClassId={activeClass.id}
        lockedClassName={activeClass.name}
        lockedSubjectName={activeSubject?.name}
      />
    </div>
  );
}
