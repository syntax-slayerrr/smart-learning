import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppBatch } from '@/services/whatsapp';
import { sendPushNotification } from '@/lib/web-push';
import { verifyCronAuthorization } from '@/lib/security';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronAuthorization(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const adminClient = createAdminClient();
    
    // Get current day of week in WIB (UTC+7)
    // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    const nowWIB = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const dayOfWeek = nowWIB.getUTCDay();

    // 1. Fetch today's schedules
    const { data: schedules, error } = await adminClient
      .from("schedules")
      .select(`
        id,
        start_time,
        end_time,
        teacher_id,
        teachers!inner(
          profile_id,
          profiles(full_name, phone)
        ),
        classes(name),
        subjects(name)
      `)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true });

    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ success: true, message: "No schedules found for today." });
    }

    // 2. Group schedules by teacher profile
    const teacherSchedules = new Map<string, { 
      profileId: string, 
      name: string, 
      phone: string | null,
      classes: any[] 
    }>();

    for (const schedule of schedules) {
      const teacher = Array.isArray(schedule.teachers) ? schedule.teachers[0] : schedule.teachers;
      if (!teacher || !teacher.profile_id) continue;
      
      const profileId = teacher.profile_id;
      const profileData = teacher.profiles;
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      const tName = profile?.full_name || "Guru";
      const tPhone = profile?.phone || null;

      if (!teacherSchedules.has(profileId)) {
        teacherSchedules.set(profileId, { profileId, name: tName, phone: tPhone, classes: [] });
      }

      teacherSchedules.get(profileId)!.classes.push({
        subject: (schedule.subjects as any)?.name || "Pelajaran",
        className: (schedule.classes as any)?.name || "Kelas",
        start: schedule.start_time.substring(0, 5)
      });
    }

    const teachersToNotify = Array.from(teacherSchedules.values());
    if (teachersToNotify.length === 0) {
      return NextResponse.json({ success: true, message: "No valid teacher profiles found." });
    }

    // 3. Fetch push subscriptions
    const profileIds = teachersToNotify.map(t => t.profileId);
    const { data: pushSubs } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .in("profile_id", profileIds);

    const subsByProfile = new Map<string, any[]>();
    if (pushSubs) {
      for (const sub of pushSubs) {
        if (!subsByProfile.has(sub.profile_id)) subsByProfile.set(sub.profile_id, []);
        subsByProfile.get(sub.profile_id)!.push(sub.subscription);
      }
    }

    // 4. Fetch School Settings
    const { data: settings } = await adminClient
      .from("school_settings")
      .select("wa_token, wa_provider")
      .single();

    // 5. Prepare targets
    const waTargets: { phone: string, message: string }[] = [];
    const pushPromises: Promise<any>[] = [];

    for (const teacher of teachersToNotify) {
      const classCount = teacher.classes.length;
      const firstClass = teacher.classes[0];

      // Prepare Push
      const tSubs = subsByProfile.get(teacher.profileId) || [];
      for (const sub of tSubs) {
        const payload = {
          title: "Jadwal Anda Hari Ini 📅",
          body: `Anda memiliki ${classCount} kelas hari ini (Mulai: ${firstClass.subject} jam ${firstClass.start}). Jangan lupa buka kelas!`,
          url: "/teacher",
          icon: "/icon.png"
        };
        pushPromises.push(sendPushNotification(sub, payload));
      }

      // Prepare WA
      if (teacher.phone) {
        let waMessage = `*ALARM MENGAJAR PAGI* ⏰\n\nSelamat pagi, Bapak/Ibu *${teacher.name}*!\nBerikut adalah jadwal mengajar Anda hari ini:\n\n`;
        teacher.classes.forEach(c => {
          waMessage += `- *${c.start}*: ${c.subject} (${c.className})\n`;
        });
        waMessage += `\nSemangat bertugas dan mohon jangan lupa untuk membuka sesi absensi di aplikasi!`;
        
        waTargets.push({ phone: teacher.phone, message: waMessage });
      }
    }

    // 6. Send Web Pushes
    await Promise.allSettled(pushPromises);

    // 7. Send WA Batch
    let batchResult = { success: false, error: "Token not configured" };
    if (settings?.wa_token && waTargets.length > 0) {
      batchResult = await sendWhatsAppBatch(
        waTargets.map(t => ({ phone: t.phone, message: t.message })),
        { token: settings.wa_token, provider: settings.wa_provider }
      ) as any;
    }

    return NextResponse.json({ 
      success: true, 
      notifiedTeachers: teachersToNotify.length,
      waSent: waTargets.length,
      pushSent: pushPromises.length,
      batchResult
    });

  } catch (error: any) {
    console.error("Cron Morning Alarm error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
