import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/telemetry/schedule-context?classId=<UUID>
 *
 * Mencocokkan jadwal pelajaran resmi (tabel `schedules`) dengan waktu server saat ini.
 * Mengembalikan konteks Jam Pelajaran: Mapel, Guru, Waktu Mulai/Selesai, dan nomor jam ke-N.
 *
 * Relasi: schedules → subjects (name) → teachers → profiles (full_name)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminClient = createAdminClient();
    let classId = searchParams.get("classId");

    // Jika classId tidak diberikan, ambil kelas pertama yang tersedia
    let selectedClassInfo: { id: string; name: string; grade: number } | null = null;
    if (!classId) {
      const { data: firstClass } = await adminClient
        .from("classes")
        .select("id, name, grade")
        .limit(1)
        .maybeSingle();
      if (firstClass) {
        classId = firstClass.id;
        selectedClassInfo = firstClass;
      }
    } else {
      const { data: cls } = await adminClient
        .from("classes")
        .select("id, name, grade")
        .eq("id", classId)
        .maybeSingle();
      if (cls) {
        selectedClassInfo = cls;
      }
    }

    if (!classId) {
      return NextResponse.json(
        { success: false, error: "Tidak ada kelas yang ditemukan di database" },
        { status: 404 }
      );
    }

    const adminClientInstance = adminClient;
    const now = new Date();
    // day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday (same as JS getDay())
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

    // Query semua jadwal hari ini untuk kelas ini, diurutkan start_time ASC
    const { data: todaySchedules, error: schedErr } = await adminClientInstance
      .from("schedules")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        subject:subjects ( id, name, code ),
        teacher:teachers ( id, nip, profile:profiles ( full_name ) )
      `)
      .eq("class_id", classId)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true });

    if (schedErr) {
      console.error("[Schedule Context DB Error]:", schedErr.message);
      return NextResponse.json(
        { success: false, error: "Failed to query schedules", detail: schedErr.message },
        { status: 500 }
      );
    }

    if (!todaySchedules || todaySchedules.length === 0) {
      return NextResponse.json({
        success: true,
        active: null,
        all_periods: [],
        message: "Tidak ada jadwal pelajaran hari ini untuk kelas ini.",
      });
    }

    // Temukan jadwal yang sedang aktif berdasarkan currentTime
    // Format time dari Postgres: "HH:mm:ss" atau "HH:mm:ss+TZ"
    let activePeriod = null;
    let activePeriodNumber = 0;

    const allPeriods = todaySchedules.map((sched: any, idx: number) => {
      const startStr = String(sched.start_time).slice(0, 5); // "HH:mm"
      const endStr = String(sched.end_time).slice(0, 5);
      const subjectData = sched.subject as any;
      const teacherData = sched.teacher as any;
      const profileData = teacherData?.profile as any;

      const period = {
        period_number: idx + 1,
        schedule_id: sched.id,
        start_time: startStr,
        end_time: endStr,
        subject_name: subjectData?.name || "—",
        subject_code: subjectData?.code || null,
        teacher_name: profileData?.full_name || "—",
        teacher_nip: teacherData?.nip || null,
        is_active: false,
      };

      // Bandingkan waktu (string comparison bekerja untuk "HH:mm:ss")
      const startFull = String(sched.start_time).slice(0, 8);
      const endFull = String(sched.end_time).slice(0, 8);
      if (currentTime >= startFull && currentTime < endFull) {
        period.is_active = true;
        activePeriod = period;
        activePeriodNumber = idx + 1;
      }

      return period;
    });

    return NextResponse.json({
      success: true,
      class_id: classId,
      class_name: selectedClassInfo?.name || "Kelas",
      active: activePeriod,
      active_period_number: activePeriodNumber,
      total_periods: allPeriods.length,
      all_periods: allPeriods,
      server_time: currentTime,
      day_of_week: dayOfWeek,
    });
  } catch (error) {
    console.error("[Schedule Context Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
