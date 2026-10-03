"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { attendanceSessionSchema } from "@/lib/validations";
import { generateQRToken } from "@/lib/utils";
import { sendWhatsAppMessage } from "@/services/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/web-push";
import { waitUntil } from "@vercel/functions";

export interface CreateSessionState {
  error?: string;
  success?: boolean;
}

export async function createAttendanceSession(
  _prevState: CreateSessionState,
  formData: FormData
): Promise<CreateSessionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) return { error: "Data guru tidak ditemukan" };

  const raw = {
    class_id: formData.get("class_id") as string,
    subject_id: formData.get("subject_id") as string,
    duration_minutes: parseInt(formData.get("duration_minutes") as string) || 30,
  };

  const validated = attendanceSessionSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message || "Data tidak valid" };
  }

  const qrToken = generateQRToken();
  const expiresAt = new Date(Date.now() + validated.data.duration_minutes * 60 * 1000);

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      teacher_id: teacher.id,
      class_id: validated.data.class_id,
      subject_id: validated.data.subject_id,
      qr_token: qrToken,
      qr_expires_at: expiresAt.toISOString(),
      session_date: new Date().toISOString().split("T")[0],
      status: "active",
      teacher_present_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // try to recover if token already exists (rare race)
    const { data: existingByToken } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (existingByToken) {
      redirect(`/teacher/attendance/${existingByToken.id}`);
      return { success: true } as any;
    }

    return { error: "Gagal membuat sesi absensi. Coba lagi." };
  }

  redirect(`/teacher/attendance/${session.id}`);
}

export async function createAutomatedSession(scheduleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: schedule } = await supabase
    .from("schedules")
    .select(`
      id, teacher_id, class_id, subject_id, start_time, end_time,
      subjects ( name )
    `)
    .eq("id", scheduleId)
    .single();

  if (!schedule) return { error: "Jadwal tidak ditemukan" };

  const subjectName = (schedule.subjects as any)?.name;
  const today = new Date().toISOString().split("T")[0];
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Create session
  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .insert({
      teacher_id: schedule.teacher_id,
      class_id: schedule.class_id,
      subject_id: schedule.subject_id,
      subject_start_time: schedule.start_time,
      session_date: today,
      qr_token: `auto-${schedule.id}-${today}`,
      qr_expires_at: `${today}T${schedule.end_time}+07:00`,
      status: "active",
      teacher_present_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create automated session:", error);
    return { error: "Gagal mengaktifkan sesi absensi." };
  }

  redirect(`/teacher/attendance/${session.id}`);
}

export async function closeAttendanceSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get session info to find the class
  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("class_id")
    .eq("id", sessionId)
    .single();

  if (session) {
    // Get all students in the class
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", session.class_id);

    // Get students who already have records
    const { data: existingRecords } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("session_id", sessionId);

    const attendedIds = new Set(existingRecords?.map(r => r.student_id) || []);

    // Auto-mark absent for students who didn't scan
    const absentRecords = (students || [])
      .filter(s => !attendedIds.has(s.id))
      .map(s => ({
        session_id: sessionId,
        student_id: s.id,
        status: "absent",
        scanned_at: new Date().toISOString(),
        recorded_by: user?.id,
      }));

    if (absentRecords.length > 0) {
      await supabase.from("attendance_records").insert(absentRecords);
    }
  }

  // Close the session
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId);

  if (error) {
    return { error: "Gagal menutup sesi" };
  }

  // Trigger absent notifications in the background
  try {
    waitUntil(notifyAbsentParents(sessionId));
  } catch (e) {
    console.error("Failed to send absent notifications:", e);
  }

  return { success: true };
}

export async function notifyAbsentParents(sessionId: string) {
  const adminClient = createAdminClient();
  
  // 1. Get session details and school settings
  const [{ data: session }, { data: settings }] = await Promise.all([
    adminClient
      .from("attendance_sessions")
      .select("session_date, subjects(name)")
      .eq("id", sessionId)
      .single(),
    adminClient
      .from("school_settings")
      .select("wa_token, wa_provider, wa_notify_mode")
      .single()
  ]);

  if (!session) return { error: "Sesi tidak ditemukan" };

  // 2. Get absent records for this session with parent details
  // Note: We use any because the nested join structure can be complex for TS
  const { data: records } = await adminClient
    .from("attendance_records")
    .select(`
      student_id,
      students (
        profiles ( full_name ),
        student_parents (
          parents (
            phone_wa,
            profiles ( full_name, push_subscription )
          )
        )
      )
    `)
    .eq("session_id", sessionId)
    .eq("status", "absent");

  if (!records || records.length === 0) return { success: true, count: 0 };

  let successCount = 0;
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const record of (records as any[])) {
    const studentName = record.students?.profiles?.full_name;
    const parentLinks = record.students?.student_parents;

    if (!studentName || !parentLinks) continue;

    for (const link of parentLinks) {
      const phone = link.parents?.phone_wa;
      const parentName = link.parents?.profiles?.full_name || "Orang Tua";
      const pushSub = link.parents?.profiles?.push_subscription;
      
      if (phone) {
        const subjectName = (session.subjects as any)?.name || "Pelajaran";
        const currentTime = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
        const message = `Halo Bapak/Ibu ${parentName},\n\nKami menginfokan bahwa ananda *${studentName}* tercatat *TIDAK HADIR (ALPA)* pada mata pelajaran *${subjectName}* hari ini (${session.session_date}).\n\nMohon bantuannya untuk memantau keberadaan ananda. Terima kasih.\n\n_(Pesan otomatis dikirim pada: ${currentTime})_`;
        
        // 1. Send WhatsApp Message (hanya jika mode per_session)
        const isPerSession = settings?.wa_notify_mode === "per_session";
        if (isPerSession) {
          const res = await sendWhatsAppMessage(
            { phone, message },
            { token: settings?.wa_token, provider: settings?.wa_provider }
          );
          if (res.success) successCount++;
          
          // Save notification record
          await adminClient.from("notifications").insert({
            parent_id: link.parents?.id,
            student_id: record.student_id,
            attendance_record_id: null,
            message,
            status: res.success ? "sent" : "failed",
            error_message: res.error || null,
          });

          // Add random delay between 2 to 4 seconds
          await delay(2000 + Math.random() * 2000);
        }
      }

      // Early Warning System: Cek total hari alpa
      if (pushSub) {
        try {
          const { data: allAbsents } = await adminClient
            .from("attendance_records")
            .select("attendance_sessions(session_date)")
            .eq("student_id", record.student_id)
            .eq("status", "absent");
          
          if (allAbsents) {
            const uniqueDates = new Set(
              allAbsents.map(a => (a.attendance_sessions as any)?.session_date).filter(Boolean)
            );

            if (uniqueDates.size > 0 && uniqueDates.size % 3 === 0) {
              await sendPushNotification(pushSub, {
                title: "🚨 Peringatan Kehadiran (SP 1)",
                body: `Bapak/Ibu ${parentName}, ananda ${studentName} tercatat telah ALPA selama ${uniqueDates.size} hari berturut-turut/kumulatif. Ketuk untuk detail Surat Peringatan.`,
                url: "/parent",
                actions: [
                  { action: "open_dashboard", title: "Buka Detail Absensi" }
                ]
              });
            }
          }
        } catch (pushErr) {
          console.error("Failed to send push warning:", pushErr);
        }
      }
    }
  }

  return { success: true, count: successCount };
}

export async function updateAttendanceRecord(
  recordId: string,
  status: string,
  notes?: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance_records")
    .update({ status, notes: notes || null })
    .eq("id", recordId);

  if (error) {
    return { error: "Gagal mengupdate absensi" };
  }
  return { success: true };
}

export async function markStudentAttendance(
  sessionId: string,
  studentId: string,
  status: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        status,
        recorded_by: user?.id,
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" }
    );

  if (error) {
    return { error: "Gagal mencatat absensi" };
  }
  return { success: true };
}

export async function processStudentCardScan(studentId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Get current time in WIB
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = nowWib.getUTCDay();
  const currentTime = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + 
                      nowWib.getUTCMinutes().toString().padStart(2, '0');
  const today = nowWib.toISOString().split('T')[0];

  // 2. Fetch Student and Teacher's Schedule CONCURRENTLY to save network roundtrips
  const [studentRes, scheduleRes] = await Promise.all([
    adminClient
      .from("students")
      .select("id, class_id, profile:profiles(full_name)")
      .eq("id", studentId)
      .single(),
    supabase
      .from("schedules")
      .select("id, class_id, subject_id, start_time, end_time, teacher_id, teachers!inner(profile_id)")
      .eq("teachers.profile_id", user.id)
      .eq("day_of_week", dayOfWeek)
      .lte("start_time", currentTime)
      .gte("end_time", currentTime)
      .maybeSingle()
  ]);

  const student = studentRes.data;
  const currentSchedule = scheduleRes.data;

  if (!student) return { error: "Data Siswa tidak ditemukan di database" };
  if (!currentSchedule) return { error: "Tidak ada jadwal mengajar aktif untuk Anda di kelas ini pada jam ini." };

  // 2.5 VALIDASI KELAS
  if (student.class_id !== currentSchedule.class_id) {
    return { error: "Siswa ini tidak terdaftar di kelas yang sedang Anda ajar saat ini" };
  }

  const teacherId = currentSchedule.teacher_id;

  // 3. Find existing session
  let sessionId = null;
  let subjectName = "Mata Pelajaran";

  const { data: existingSession } = await supabase
    .from("attendance_sessions")
    .select("id, subjects(name), teacher_present_at")
    .eq("teacher_id", teacherId)
    .eq("class_id", currentSchedule.class_id)
    .eq("subject_id", currentSchedule.subject_id)
    .eq("session_date", today)
    .eq("status", "active")
    .maybeSingle();

  if (existingSession) {
    sessionId = existingSession.id;
    subjectName = (existingSession.subjects as any)?.name || subjectName;
    
    // Jika sesi dibuka oleh siswa dan guru baru scan kartu siswa ini
    if (!existingSession.teacher_present_at) {
      await adminClient
        .from("attendance_sessions")
        .update({ teacher_present_at: new Date().toISOString() })
        .eq("id", existingSession.id);
    }
  } else {
    // Jika tidak ada sesi aktif, buat sesi otomatis berdasarkan jadwal yang sudah ditemukan
    try {
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      const qrToken = `auto-${currentSchedule.id}-${today}-${Math.random().toString(36).substring(2,8)}`;

      const { data: newSession, error: createErr } = await adminClient
        .from("attendance_sessions")
        .insert({
          teacher_id: teacherId,
          class_id: currentSchedule.class_id,
          subject_id: currentSchedule.subject_id,
          subject_start_time: currentSchedule.start_time,
          session_date: today,
          qr_token: qrToken,
          qr_expires_at: `${today}T${currentSchedule.end_time}+07:00`,
          status: "active",
          teacher_present_at: new Date().toISOString(),
        })
        .select("id, subjects(name)")
        .single();

      if (createErr) {
        console.error("Failed to create session automatically:", createErr);
        return { error: "Sesi kelas belum dibuka. Silakan Tap-In (Scan) QR Kelas terlebih dahulu." };
      }

      sessionId = newSession.id;
      subjectName = (newSession.subjects as any)?.name || subjectName;
    } catch (e) {
      console.error("Auto-create session error:", e);
      return { error: "Sesi kelas belum dibuka. Silakan Tap-In (Scan) QR Kelas terlebih dahulu." };
    }
  }

  if (!sessionId) return { error: "Gagal memproses sesi absensi" };

  // 4. Mark as present
  const { error: upsertError } = await supabase
    .from("attendance_records")
    .upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        status: "present",
        recorded_by: user.id,
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" }
    );

  if (upsertError) {
    return { error: "Gagal mencatat kehadiran kartu" };
  }

  // 5. Fetch parent details and WA token to send WhatsApp
  const [{ data: studentData }, { data: settings }] = await Promise.all([
    adminClient
      .from("students")
      .select(`
        profiles (full_name),
        student_parents (
          parents (
            phone_wa,
            profiles ( push_subscription )
          )
        )
      `)
      .eq("id", studentId)
      .single(),
    adminClient
      .from("school_settings")
      .select("wa_token, wa_provider")
      .single()
  ]);

  const studentName = (studentData?.profiles as any)?.full_name || "Siswa";
  const parentLinks = studentData?.student_parents || [];

  waitUntil((async () => {
    for (const link of (parentLinks as any[])) {
      const phone = link.parents?.phone_wa;
      const pushSub = link.parents?.profiles?.push_subscription;
      const nowTime = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Jakarta" });
      
      if (phone) {
        const message = `Halo Bapak/Ibu,\n\nKami menginfokan bahwa ananda *${studentName}* telah *HADIR* pada kelas *${subjectName}* pada pukul ${nowTime} WIB.\n\nTerima kasih. (Kartu Absen Khusus Terverifikasi)`;
        
        // MATIKAN INSTANT WA (Diganti dengan Rekap Harian di Admin)
        // await sendWhatsAppMessage(
        //   { phone, message },
        //   { token: settings?.wa_token, provider: settings?.wa_provider }
        // );
      }
      
      if (pushSub) {
        await sendPushNotification(pushSub, {
          title: "✅ Notifikasi Kehadiran",
          body: `Ananda ${studentName} tercatat Hadir pada mata pelajaran ${subjectName}.\nWaktu: ${nowTime} WIB`,
          url: "/parent",
        }).catch(console.error);
      }
      
      if (phone) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      }
    }
  })());

  return { success: true, studentName };
}

export async function processClassScan(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) return { error: "Akses ditolak: Hanya guru yang dapat melakukan aksi ini." };

  // Fix timezone to WIB (Asia/Jakarta) by converting UTC time directly.
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);

  const year = nowWib.getUTCFullYear();
  const month = String(nowWib.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nowWib.getUTCDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const wibDayOfWeek = nowWib.getUTCDay(); // 0 (Sunday) to 6 (Saturday) in WIB
  const currentTime = `${String(nowWib.getUTCHours()).padStart(2, '0')}:${String(nowWib.getUTCMinutes()).padStart(2, '0')}`;

  // 1. Cek apakah ada sesi aktif untuk guru ini dan kelas ini hari ini
  const { data: existingSession } = await supabase
    .from("attendance_sessions")
    .select("id, teacher_present_at")
    .eq("teacher_id", teacher.id)
    .eq("class_id", classId)
    .eq("session_date", today)
    .eq("status", "active")
    .single();

  if (existingSession) {
    // Jika sesi sudah terbuka (mungkin siswa scan duluan), tapi guru belum tercatat hadir
    if (!existingSession.teacher_present_at) {
      await supabase
        .from("attendance_sessions")
        .update({ teacher_present_at: new Date().toISOString() })
        .eq("id", existingSession.id);
    }
    return { success: true, redirectUrl: `/teacher/attendance/${existingSession.id}` };
  }

  // 2. Cek apakah guru ini ada jadwal di kelas ini hari ini

  const { data: activeSchedules } = await supabase
    .from("schedules")
    .select("id, subject_id, subjects(name), start_time, end_time")
    .eq("teacher_id", teacher.id)
    .eq("class_id", classId)
    .eq("day_of_week", wibDayOfWeek)
    .lte("start_time", currentTime)
    .gte("end_time", currentTime);

  let schedule = activeSchedules?.[0];

  if (!schedule) {
    const { data: schedules } = await supabase
      .from("schedules")
      .select("id, subject_id, subjects(name), start_time, end_time")
      .eq("teacher_id", teacher.id)
      .eq("class_id", classId)
      .eq("day_of_week", wibDayOfWeek);

    if (schedules && schedules.length === 1) {
      schedule = schedules[0];
    } else if (schedules && schedules.length > 1) {
      // If multiple schedules exist, prefer the one closest to current time.
      const parseTime = (value: string) => {
        const [hour, minute] = String(value).split(":").map(Number);
        return Number.isFinite(hour) && Number.isFinite(minute)
          ? hour * 60 + minute
          : null;
      };

      const currentMinutes = parseTime(currentTime);
      const scored = schedules
        .map((s) => {
          const start = parseTime(s.start_time as string);
          const end = parseTime(s.end_time as string);
          if (start === null || end === null || currentMinutes === null) return null;
          const within = currentMinutes >= start && currentMinutes <= end;
          const distance = within
            ? 0
            : Math.min(Math.abs(currentMinutes - start), Math.abs(currentMinutes - end));
          return { schedule: s, within, distance };
        })
        .filter(Boolean) as Array<{ schedule: any; within: boolean; distance: number }>;

      scored.sort((a, b) => {
        if (a.within !== b.within) return a.within ? -1 : 1;
        return a.distance - b.distance;
      });

      schedule = scored[0]?.schedule || undefined;
    }
  }

  if (!schedule) {
    return { error: "Tidak ada jadwal mengajar aktif untuk Anda di kelas ini pada jam ini." };
  }

  const qrToken = `auto-${schedule.id}-${today}-${Math.random().toString(36).substring(2,8)}`;
    const { data: newSession, error: createError } = await supabase
      .from("attendance_sessions")
      .insert({
        teacher_id: teacher.id,
        class_id: classId,
        subject_id: schedule.subject_id,
        session_date: today,
        subject_start_time: schedule.start_time,
        qr_expires_at: `${today}T${schedule.end_time}+07:00`,
        qr_token: qrToken,
        status: "active",
        teacher_present_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Auto session creation failed:", createError);
      const { data: existingByDate } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("teacher_id", teacher.id)
        .eq("class_id", classId)
        .eq("session_date", today)
        .eq("status", "active")
        .maybeSingle();

      if (existingByDate) {
        return { success: true, redirectUrl: `/teacher/attendance/${existingByDate.id}` };
      }

      return { error: `Gagal membuat sesi otomatis: ${createError.message}` };
    }

    return { success: true, redirectUrl: `/teacher/attendance/${newSession.id}` };
}
