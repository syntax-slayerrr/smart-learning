import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAbsentParents } from "@/app/(dashboard)/teacher/attendance/actions";
import { sendPushNotification } from "@/lib/web-push";

export const maxDuration = 60; // Allow cron job to run up to 60 seconds

/**
 * CRON JOB ENDPOINT
 * This endpoint should be called periodically (e.g., every 30 minutes) 
 * to automatically close expired attendance sessions and notify parents.
 */
export async function GET(request: NextRequest) {
  // Security check: Verify a secret key to prevent unauthorized execution
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  
  // ====== HOLIDAY CHECK FOR CRON ======
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = nowWib.getUTCDay();
  const today = nowWib.toISOString().split('T')[0];
  const nowWibIso = nowWib.toISOString();

  // Skip if Sunday (0)
  if (dayOfWeek === 0) {
    return NextResponse.json({ message: "Skip cron: Today is Sunday." });
  }

  // Skip if registered Holiday
  const { data: holiday } = await adminClient
    .from("holidays")
    .select("id")
    .eq("holiday_date", today)
    .maybeSingle();

  if (holiday) {
    return NextResponse.json({ message: "Skip cron: Today is a registered holiday." });
  }
  // ===================================

  const now = nowWibIso;

  // 1. Find all active sessions that have expired
  const { data: expiredSessions, error: fetchError } = await adminClient
    .from("attendance_sessions")
    .select("id, subject, class_id")
    .eq("status", "active")
    .lt("qr_expires_at", now);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredSessions || expiredSessions.length === 0) {
    return NextResponse.json({ message: "No expired sessions to close." });
  }

  const results = [];

  for (const session of expiredSessions) {
    try {
      // 2. Mark students as absent for this session
      const { data: students } = await adminClient
        .from("students")
        .select("id")
        .eq("class_id", session.class_id);

      const { data: existingRecords } = await adminClient
        .from("attendance_records")
        .select("student_id")
        .eq("session_id", session.id);

      const attendedIds = new Set(existingRecords?.map(r => r.student_id) || []);

      const absentRecords = (students || [])
        .filter(s => !attendedIds.has(s.id))
        .map(s => ({
          session_id: session.id,
          student_id: s.id,
          status: "absent",
          scanned_at: now,
          notes: "Auto-closed by system",
        }));

      if (absentRecords.length > 0) {
        await adminClient.from("attendance_records").insert(absentRecords);
      }

      // 3. Close the session
      await adminClient
        .from("attendance_sessions")
        .update({ status: "closed" })
        .eq("id", session.id);

      // 4. Proses Notifikasi (Push EWS & WA per-sesi bila aktif)
      await notifyAbsentParents(session.id);

      results.push({ id: session.id, status: "closed_and_notified" });
    } catch (err) {
      console.error(`Failed to auto-close session ${session.id}:`, err);
    }
  }

  // ===================================
  // ====== GHOST SESSIONS (MISSED) ====
  // ===================================
  // Find schedules that have ended today, but no session was ever created (meaning everyone skipped).
  try {
    const currentTimeStrCheck = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + nowWib.getUTCMinutes().toString().padStart(2, '0') + ':00';
    
    const { data: pastSchedules } = await adminClient
      .from("schedules")
      .select("id, class_id, subject_id, teacher_id, start_time, end_time")
      .eq("day_of_week", dayOfWeek)
      .lt("end_time", currentTimeStrCheck); // Class has ended

    if (pastSchedules && pastSchedules.length > 0) {
      for (const schedule of pastSchedules) {
        // Check if session exists
        const { data: existingSession } = await adminClient
          .from("attendance_sessions")
          .select("id")
          .eq("class_id", schedule.class_id)
          .eq("subject_id", schedule.subject_id)
          .eq("session_date", today)
          .maybeSingle();

        if (!existingSession) {
          // Ghost session found! Create a closed session to mark teacher absent
            const { data: ghostSession, error: ghostErr } = await adminClient
            .from("attendance_sessions")
            .insert({
              teacher_id: schedule.teacher_id,
              class_id: schedule.class_id,
              subject_id: schedule.subject_id,
              subject_start_time: schedule.start_time,
              session_date: today,
              qr_token: `ghost-${schedule.id}-${today}`,
              qr_expires_at: `${today}T${schedule.end_time}+07:00`,
              status: "closed"
            })
            .select("id")
            .single();

          if (ghostSession) {
            // Mark all students as absent
            const { data: students } = await adminClient
              .from("students")
              .select("id")
              .eq("class_id", schedule.class_id);

            const absentRecords = (students || []).map(s => ({
              session_id: ghostSession.id,
              student_id: s.id,
              status: "absent",
              scanned_at: now,
              notes: "Ghost session (teacher and students absent)",
            }));

            if (absentRecords.length > 0) {
              await adminClient.from("attendance_records").insert(absentRecords);
            }
            
            // Only notify parents, don't spam if it's the whole school, but logic requires it
            await notifyAbsentParents(ghostSession.id).catch(console.error);
            results.push({ id: ghostSession.id, status: "ghost_created_and_notified" });
          } else {
            console.error("Failed to create ghost session:", ghostErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed processing ghost sessions:", err);
  }

  // ===================================
  // ====== PUSH NOTIFICATIONS ======
  // ===================================
  try {
    const futureWib = new Date(nowWib.getTime() + (35 * 60 * 1000)); // Next 35 mins
    const currentTimeStr = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + nowWib.getUTCMinutes().toString().padStart(2, '0') + ':00';
    const futureTimeStr = futureWib.getUTCHours().toString().padStart(2, '0') + ':' + futureWib.getUTCMinutes().toString().padStart(2, '0') + ':59';
    
    console.log(`[CRON] Push check: finding schedules between ${currentTimeStr} and ${futureTimeStr}`);

    // Find schedules starting in the next 30-ish minutes
    const { data: upcomingSchedules } = await adminClient
      .from("schedules")
      .select(`
        id, start_time, class_id,
        classes (name),
        subjects (name),
        teachers (
          profiles (push_subscription)
        )
      `)
      .eq("day_of_week", dayOfWeek)
      .gt("start_time", currentTimeStr)
      .lte("start_time", futureTimeStr);

    if (upcomingSchedules && upcomingSchedules.length > 0) {
      for (const schedule of upcomingSchedules) {
        const sub = (schedule.teachers as any)?.profiles?.push_subscription;
        if (sub) {
          const className = (schedule.classes as any)?.name || "Kelas";
          const subjectName = (schedule.subjects as any)?.name || "Mata Pelajaran";
          const startTime = schedule.start_time.substring(0, 5);
          
          // 1. Notify Teacher
          await sendPushNotification(sub, {
            title: "Tugas Mengajar Berikutnya ⏱",
            body: `Mata Pelajaran: ${subjectName}\nRuang Kelas: ${className}\nWaktu: ${startTime} WIB\n\nSistem presensi kelas telah diaktifkan secara otomatis.`,
            url: "/teacher",
          });

          // 2. Notify Students in the Class
          if (schedule.class_id) {
            const { data: students } = await adminClient
              .from("students")
              .select("profiles(push_subscription)")
              .eq("class_id", schedule.class_id);

            if (students) {
              // Create a batch of push promises so we don't block sequentially
              const pushPromises = students.map((student) => {
                const studentSub = (student.profiles as any)?.push_subscription;
                if (studentSub) {
                  return sendPushNotification(studentSub, {
                    title: "Persiapan Belajar ⏱",
                    body: `Mata Pelajaran: ${subjectName}\nRuang Kelas: ${className}\nWaktu: ${startTime} WIB\n\nSegera bersiap menuju kelas, absensi akan segera dibuka.`,
                    url: "/student",
                  });
                }
                return Promise.resolve();
              });
              
              await Promise.allSettled(pushPromises);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to send push notifications:", err);
  }


  return NextResponse.json({ 
    message: `Processed ${expiredSessions?.length || 0} sessions. Pushes triggered.`,
    results 
  });
}
