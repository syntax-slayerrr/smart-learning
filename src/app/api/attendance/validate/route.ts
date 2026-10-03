import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logAttendanceEvent } from "@/lib/audit";
import { sendWhatsAppMessage, buildAttendanceMessage } from "@/services/whatsapp";
import { sendPushNotification } from "@/lib/web-push";
import { waitUntil } from "@vercel/functions";

/**
 * Haversine formula — calculate distance between two GPS coordinates in meters
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`qr:${clientIp}`, RATE_LIMITS.QR_VALIDATE);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti.", success: false },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { token, classId, latitude, longitude, deviceId, verificationCode } = body;

    if (!token && !classId) {
      return NextResponse.json(
        { error: "Data QR tidak valid", success: false },
        { status: 400 }
      );
    }
    
    // ... (Auth and student check same as before)

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    // Fetch school settings globally since it's used by Device Binding, Geofencing, and WhatsApp
    const { data: schoolSettings } = await adminClient
      .from("school_settings")
      .select("*")
      .single();

    // Get student record
    const { data: student } = await supabase
      .from("students")
      .select("id, class_id, device_id, profiles(full_name)")
      .eq("profile_id", user.id)
      .maybeSingle();

    // Get teacher record
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id, profiles(full_name)")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student && !teacher) {
      return NextResponse.json(
        { error: "Data pengguna tidak ditemukan", success: false },
        { status: 404 }
      );
    }

    let session: any = null;
    
    // ====== TIMEZONE & SCHEDULE LOGIC ======
    // Vercel/Server is usually UTC. We must convert to WIB (UTC+7)
    const nowUtc = new Date();
    const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
    const now = nowWib;
    
    const dayOfWeek = nowWib.getUTCDay(); // 0-6
    const currentTime = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + 
                        nowWib.getUTCMinutes().toString().padStart(2, '0');
    const today = nowWib.toISOString().split('T')[0];

    // ====== HOLIDAY CHECK ======
    // 1. Check if it's Sunday (0)
    if (dayOfWeek === 0) {
      return NextResponse.json(
        { error: "Hari Minggu libur sekolah.", success: false },
        { status: 403 }
      );
    }

    // 2. Check if it's a registered holiday in DB
    const { data: holiday } = await adminClient
      .from("holidays")
      .select("description")
      .eq("holiday_date", today)
      .maybeSingle();

    if (holiday) {
      return NextResponse.json(
        { 
          error: "Hari ini adalah hari libur.", 
          message: holiday.description || "Libur Sekolah",
          success: false 
        },
        { status: 403 }
      );
    }

    if (token) {
      // Logic for Dynamic QR (Manual/Token based)
      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, class_id, subjects(name), qr_expires_at, status, subject_start_time, qr_token, created_at")
        .eq("qr_token", token)
        .single();
      session = data;
      
      if (!session) {
        return NextResponse.json(
          { error: "QR Code tidak valid atau tidak ditemukan", success: false },
          { status: 404 }
        );
      }

      // Check if QR has expired
      const expiresAt = new Date(session.qr_expires_at);
      if (nowUtc > expiresAt) {
        return NextResponse.json(
          { error: "QR Code sudah kadaluarsa", success: false },
          { status: 400 }
        );
      }
    } else if (classId) {
      // Logic for Static QR (Schedule based)
      // Find matching schedule for THIS class, THIS day, and THIS time
      const { data: schedule, error: scheduleErr } = await adminClient
        .from("schedules")
        .select(`
          id, class_id, teacher_id, subject_id, start_time, end_time,
          subjects ( name )
        `)
        .eq("class_id", classId)
        .eq("day_of_week", dayOfWeek)
        .lte("start_time", currentTime)
        .gte("end_time", currentTime)
        .maybeSingle();

      if (!schedule) {
        return NextResponse.json(
          { 
            error: "Tidak ada jam pelajaran aktif.", 
            message: `Saat ini (${currentTime}) tidak ditemukan jadwal aktif untuk kelas ini.`,
            success: false 
          },
          { status: 403 }
        );
      }

      const subjectName = Array.isArray(schedule.subjects) 
        ? schedule.subjects[0]?.name 
        : (schedule.subjects as any)?.name;

      const scheduleStartTime = schedule.start_time; // Keep for late check

      // 3. Find or create session for today + this schedule
      const { data: existingSession } = await adminClient
        .from("attendance_sessions")
        .select("id, class_id, subjects(name), status, qr_expires_at, subject_start_time, qr_token, created_at")
        .eq("class_id", classId)
        .eq("session_date", today)
        .eq("subject_id", schedule.subject_id)
        .eq("status", "active")
        .maybeSingle();

      if (existingSession) {
        session = existingSession;
      } else {
        // Create auto-session based on schedule
        // Generate a random 4-digit code for the whiteboard
        const autoToken = `auto-${schedule.id}-${today}`;
        const { data: newSession, error: createErr } = await adminClient
          .from("attendance_sessions")
          .insert({
            teacher_id: schedule.teacher_id,
            class_id: schedule.class_id,
            subject_id: schedule.subject_id,
            subject_start_time: schedule.start_time,
            session_date: today,
            qr_token: autoToken,
            qr_expires_at: `${today}T${schedule.end_time}+07:00`,
            status: "active"
          })
          .select("id, class_id, subjects(name), status, qr_expires_at, subject_start_time, qr_token, created_at")
          .single();

        if (createErr) {
          // If insert failed (likely unique constraint on qr_token due to race or existing record),
          // attempt to fetch the existing session by token and reuse it.
          const { data: existingByToken } = await adminClient
            .from("attendance_sessions")
            .select("id, class_id, subjects(name), status, qr_expires_at, subject_start_time, qr_token, created_at")
            .eq("qr_token", autoToken)
            .maybeSingle();

          if (existingByToken) {
            session = existingByToken;
          } else {
            throw createErr;
          }
        } else {
          session = newSession;
        }
      }
    }

    // Check if session is active
    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Sesi absensi sudah ditutup", success: false },
        { status: 400 }
      );
    }

    // Role-specific checks
    if (student) {
      // Check if student belongs to the class
      if (student.class_id !== session.class_id) {
        return NextResponse.json(
          { error: "Anda tidak terdaftar di kelas ini", success: false },
          { status: 403 }
        );
      }
    }

    if (teacher) {
      // Check if teacher is the owner of this session
      if (session.teacher_id !== teacher.id) {
        return NextResponse.json(
          { error: "Anda tidak memiliki jadwal mengajar di kelas ini saat ini.", success: false },
          { status: 403 }
        );
      }
    }
    
    if (student) {
      // ====== DEVICE BINDING CHECK ======
      const maxPerDevice = schoolSettings?.max_students_per_device || 1;

      if (!deviceId) {
         return NextResponse.json(
          { error: "ID Perangkat tidak terdeteksi. Gunakan browser standar.", success: false },
          { status: 400 }
        );
      }

      // Case 1: Student already has a bound device
      if (student.device_id && student.device_id !== deviceId) {
        return NextResponse.json(
          { error: "Akun Anda terikat pada perangkat lain. Silakan hubungi admin untuk reset perangkat.", success: false },
          { status: 403 }
        );
      }

      // Case 2: Student is not bound yet, check if the device is already "full"
      if (!student.device_id) {
        const { count: currentUsers } = await adminClient
          .from("students")
          .select("id", { count: 'exact', head: true })
          .eq("device_id", deviceId);

        if ((currentUsers || 0) >= maxPerDevice) {
          return NextResponse.json(
            { error: `Perangkat ini sudah digunakan oleh ${currentUsers} siswa lain. Titip absen tidak diperbolehkan.`, success: false },
            { status: 403 }
          );
        }

        // Bind the device to the student
        await adminClient
          .from("students")
          .update({ device_id: deviceId })
          .eq("id", student.id);
      }
    }
    // ====== END DEVICE BINDING ======

    // ====== GEOFENCING CHECK ======
    // Use the already fetched schoolSettings
    const settings = schoolSettings;

    // We do not strictly block if settings are missing entirely, to prevent first-day lockout.
    // However, if settings exist, we check them.
    if (settings && settings.latitude && settings.longitude) {
      const schoolLat = Number(settings.latitude);
      const schoolLon = Number(settings.longitude);
      const maxRadius = Number(settings.radius_meters) || 100;

      if (schoolLat !== 0 && schoolLon !== 0) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          return NextResponse.json(
            { error: "Lokasi GPS diperlukan. Aktifkan GPS Anda untuk melakukan absensi.", success: false },
            { status: 400 }
          );
        }

        const studentLat = Number(latitude);
        const studentLon = Number(longitude);

        // Validate that coordinates are valid numbers
        if (isNaN(studentLat) || isNaN(studentLon)) {
          return NextResponse.json(
            { error: "Data lokasi dari perangkat Anda tidak valid.", success: false },
            { status: 400 }
          );
        }

        const distance = haversineDistance(
          schoolLat, schoolLon,
          studentLat, studentLon
        );

        console.log(`[DEBUG GEOFENCING] Student: ${studentLat},${studentLon} | School: ${schoolLat},${schoolLon} | Distance: ${Math.round(distance)}m | Max: ${maxRadius}m`);

        if (isNaN(distance)) {
          return NextResponse.json(
            { error: "Gagal menghitung jarak lokasi. Coba lagi.", success: false },
            { status: 500 }
          );
        }

        if (distance > maxRadius) {
          return NextResponse.json(
            {
              error: `Anda berada di luar jangkauan sekolah.`,
              message: `Jarak Anda: ${Math.round(distance)} meter dari sekolah. Maksimal yang diizinkan adalah ${maxRadius} meter.`,
              success: false,
              data: { distance: Math.round(distance), maxRadius }
            },
            { status: 403 }
          );
        }
      }
    }
    // ====== END GEOFENCING ======

    if (student) {
      // Check for duplicate attendance
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", session.id)
        .eq("student_id", student.id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Anda sudah melakukan absensi untuk sesi ini", success: false },
          { status: 409 }
        );
      }

      // Tentukan status: HADIR atau TERLAMBAT
      // Toleransi keterlambatan dari pengaturan sekolah (default 15 menit)
      let isLate = false;
      const lateThresholdMinutes = schoolSettings?.late_tolerance_minutes ?? 15;

      // Prioritas: gunakan subject_start_time sebagai acuan jam mulai pelajaran
      // baik untuk QR Dinamis (guru buka manual) MAUPUN QR Statis (scan mandiri).
      // Jangan gunakan session.created_at karena guru mungkin baru membuka sesi
      // beberapa menit setelah jam pelajaran dimulai, sehingga siswa yang scan 
      // langsung akan dicap terlambat padahal masih dalam toleransi.
      const startTimeStr = session.subject_start_time; // format "HH:MM" atau "HH:MM:SS"
      
      if (startTimeStr) {
        const [startHour, startMin] = startTimeStr.split(':').map(Number);
        const currentHour = nowWib.getUTCHours();
        const currentMin = nowWib.getUTCMinutes();
        
        const currentTotalMins = currentHour * 60 + currentMin;
        const startTotalMins = startHour * 60 + startMin;
        
        isLate = (currentTotalMins - startTotalMins) > lateThresholdMinutes;
      } else {
        // Fallback: jika jam mulai tidak tersedia, pakai waktu sesi dibuat
        const sessionCreated = new Date(session.created_at);
        isLate = nowUtc.getTime() - sessionCreated.getTime() > (lateThresholdMinutes * 60 * 1000);
      }
      
      const status = isLate ? "late" : "present";

      // Insert attendance record
      const { data: record, error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          session_id: session.id,
          student_id: student.id,
          status,
          scanned_at: nowUtc.toISOString(),
          recorded_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Gagal menyimpan absensi. Coba lagi.", success: false },
          { status: 500 }
        );
      }

      const sessionSubject = (session.subjects as any)?.name || "Mata Pelajaran";

      // Trigger notification to parents asynchronously without blocking the response
      waitUntil(
        triggerParentNotification(student.id, record.id, sessionSubject, status, schoolSettings)
          .catch(console.error)
      );

      // Audit log asynchronously
      waitUntil(
        logAttendanceEvent(user.id, "attendance.recorded", record.id, {
          session_id: session.id,
          student_id: student.id,
          status,
        }, clientIp).catch(console.error)
      );

      return NextResponse.json({
        success: true,
        data: {
          status,
          subject: sessionSubject,
          scannedAt: nowUtc.toISOString(),
        },
      });
    }

    if (teacher) {
      // Check if teacher already scanned
      if (session.teacher_present_at) {
        return NextResponse.json(
          { error: "Anda sudah melakukan absensi untuk sesi ini", success: false },
          { status: 409 }
        );
      }

      // Update session with teacher_present_at
      const { error: updateErr } = await adminClient
        .from("attendance_sessions")
        .update({ teacher_present_at: nowUtc.toISOString() })
        .eq("id", session.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({
        success: true,
        message: "Absensi guru berhasil dicatat.",
        data: {
          subject: (session.subjects as any)?.name || "Mata Pelajaran",
          scannedAt: nowUtc.toISOString()
        }
      });
    }
  } catch (error) {
    console.error("[Attendance Validate] Server error:", error);
    return NextResponse.json(
      { error: "Gagal memproses absensi karena kendala sistem. Silakan coba lagi, atau lapor ke guru/petugas TU jika tetap gagal.", details: error instanceof Error ? error.message : String(error), success: false },
      { status: 500 }
    );
  }
}

// Fire-and-forget notification to parents
// Uses admin client (service role) to bypass RLS
async function triggerParentNotification(
  studentId: string,
  recordId: string,
  subject: string,
  status: string,
  settings: any
) {
  const adminClient = createAdminClient();

  // 1. Fetch all student/parent data
  const { data: links } = await adminClient
    .from("student_parents")
    .select(`
        relationship,
        parents (
          id,
          phone_wa,
          profiles ( push_subscription )
        ),
        students (
          profiles ( full_name ),
          classes ( name )
        )
      `)
      .eq("student_id", studentId);

  if (!settings?.wa_token || !links || links.length === 0) {
    console.warn("[WhatsApp] Missing settings or parent links. Skipping.");
    return;
  }

  // Extract student info from the first link
  const studentInfo = links[0].students as any;
  const studentName = studentInfo?.profiles?.full_name || "Siswa";
  const className = studentInfo?.classes?.name || "-";

  const message = buildAttendanceMessage({
    studentName,
    className,
    subject,
    status,
    time: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
  });

  // Helper function for artificial delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 2. Send messages sequentially with random delay for anti-spam (Free WA API protection)
  for (const link of links) {
    const parentPhone = (link as any).parents?.phone_wa;
    if (!parentPhone) continue;

    const pushSub = (link as any).parents?.profiles?.push_subscription;
    
    // 1. Send WhatsApp Message (hanya jika mode per_session)
    let result: { success: boolean; error?: string } = { success: false, error: "Notifikasi WA per sesi dinonaktifkan" };
    const isPerSession = settings?.wa_notify_mode === "per_session";

    if (isPerSession) {
      result = await sendWhatsAppMessage(
        { phone: parentPhone, message },
        { token: settings.wa_token, provider: settings.wa_provider }
      );
      
      // Save notification record only if we attempted to send WA
      await adminClient.from("notifications").insert({
        parent_id: (link as any).parents.id,
        student_id: studentId,
        attendance_record_id: recordId,
        message,
        status: result.success ? "sent" : "failed",
        error_message: result.error || null,
      });
      
      // Add a random delay for anti-spam (Free WA API protection)
      await sleep(2000 + Math.random() * 2000);
    }
    
    // 2. Send Push Notification (App-based) as backup/alternative
    if (pushSub) {
      const statusLabel = status === "present" ? "Hadir" : "Terlambat";
      const iconUrl = status === "present" ? "✅" : "⚠️";
      
      await sendPushNotification(pushSub, {
        title: `${iconUrl} Notifikasi Absensi`,
        body: `Ananda ${studentName} tercatat ${statusLabel} pada mata pelajaran ${subject}.\nWaktu: ${new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}`,
        url: "/parent",
      }).catch(console.error); // Fire and forget, don't block
    }

    if (!isPerSession) {
      // Small delay for Push processing if WA is off
      await sleep(200);
    }
  }
}
