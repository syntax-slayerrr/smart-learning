import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppBatch } from '@/services/whatsapp';
import { sendPushNotification } from '@/lib/web-push';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const adminClient = createAdminClient();
    
    // Get start and end of current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const firstDay = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0).toISOString();

    // 1. Fetch absences this month
    const { data: records, error } = await adminClient
      .from("attendance_records")
      .select(`
        student_id,
        students (
          id,
          profile_id,
          profiles (full_name),
          student_parents (
            parents ( id, phone_wa )
          )
        ),
        attendance_sessions!inner(session_date)
      `)
      .eq("status", "absent")
      .gte("attendance_sessions.session_date", firstDay)
      .lte("attendance_sessions.session_date", lastDay);

    if (error) throw error;
    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, message: "No absences found this month." });
    }

    // 2. Count absences per student and filter > 3
    const absenceCount = new Map<string, { count: number, studentData: any }>();
    
    for (const record of records) {
      const studentId = record.student_id;
      if (!studentId) continue;
      
      if (!absenceCount.has(studentId)) {
        absenceCount.set(studentId, { count: 0, studentData: record.students });
      }
      absenceCount.get(studentId)!.count++;
    }

    const studentsToWarn = Array.from(absenceCount.values()).filter(s => s.count >= 3);

    if (studentsToWarn.length === 0) {
      return NextResponse.json({ success: true, message: "No students reached the SP1 threshold." });
    }

    // 3. Fetch School Settings for WA token
    const { data: settings } = await adminClient
      .from("school_settings")
      .select("school_name, wa_token, wa_provider")
      .single();

    // 4. Prepare targets
    const waTargets: { phone: string, message: string, studentId: string, parentId: string }[] = [];
    const pushPromises: Promise<any>[] = [];

    // Pre-fetch push subscriptions for students who need warning
    const studentProfileIds = studentsToWarn.map(s => s.studentData.profile_id);
    const { data: pushSubs } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .in("profile_id", studentProfileIds);

    const subsByProfile = new Map<string, any[]>();
    if (pushSubs) {
      for (const sub of pushSubs) {
        if (!subsByProfile.has(sub.profile_id)) subsByProfile.set(sub.profile_id, []);
        subsByProfile.get(sub.profile_id)!.push(sub.subscription);
      }
    }

    for (const { count, studentData } of studentsToWarn) {
      const studentName = studentData.profiles?.full_name || "Siswa";
      
      // WhatsApp for Parents
      const parentLinks = studentData.student_parents || [];
      const waMessage = `*SURAT PERINGATAN (SP 1)* 🚨\n🏫 ${settings?.school_name || "Sekolah"}\n\nBapak/Ibu Yth,\n\nKami menginformasikan bahwa ananda *${studentName}* telah tercatat *TIDAK HADIR (Alpa)* sebanyak *${count} kali* pada bulan ini.\n\nMohon kerjasamanya untuk mengingatkan dan memantau kehadiran ananda. Jika absen berlanjut, pihak sekolah akan melakukan pemanggilan resmi.\n\nTerima kasih.`;
      
      for (const link of parentLinks) {
        const phone = link.parents?.phone_wa;
        const parentId = link.parents?.id;
        if (phone && parentId) {
          waTargets.push({ phone, message: waMessage, studentId: studentData.id, parentId });
        }
      }

      // Web Push for Students
      const studentSubs = subsByProfile.get(studentData.profile_id) || [];
      for (const sub of studentSubs) {
        const payload = {
          title: "Peringatan Absensi (SP 1) ⚠️",
          body: `Anda telah Alpa sebanyak ${count} kali bulan ini. Segera perbaiki kehadiran Anda!`,
          url: "/student",
          icon: "/icon.png"
        };
        pushPromises.push(sendPushNotification(sub, payload));
      }
    }

    // 5. Send Web Pushes
    await Promise.allSettled(pushPromises);

    // 6. Send WA Batch
    let batchResult = { success: false, error: "Token not configured" };
    if (settings?.wa_token && waTargets.length > 0) {
      batchResult = await sendWhatsAppBatch(
        waTargets.map(t => ({ phone: t.phone, message: t.message })),
        { token: settings.wa_token, provider: settings.wa_provider }
      ) as any;
    }

    // 7. Log Notifications
    if (waTargets.length > 0) {
      const logs = waTargets.map(t => ({
        parent_id: t.parentId,
        student_id: t.studentId,
        message: t.message,
        status: batchResult.success ? "sent" : "failed",
        error_message: batchResult.error || null,
      }));
      await adminClient.from("notifications").insert(logs);
    }

    return NextResponse.json({ 
      success: true, 
      warnedStudents: studentsToWarn.length,
      waSent: waTargets.length,
      pushSent: pushPromises.length,
      batchResult
    });

  } catch (error: any) {
    console.error("Cron SP1 Warning error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
