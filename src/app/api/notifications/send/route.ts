import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/services/whatsapp";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logNotificationEvent } from "@/lib/audit";

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`notif:${clientIp}`, RATE_LIMITS.NOTIFICATION);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }

    const supabase = await createClient();

    // Get pending notifications
    const { data: pending } = await supabase
      .from("notifications")
      .select(`
        id, message, retry_count,
        parents ( phone_wa )
      `)
      .eq("status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(10);

    if (!pending || pending.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const notification of pending) {
      const parent = notification.parents as unknown as Record<string, unknown> | null;
      const phone = parent?.phone_wa as string;

      if (!phone) {
        await supabase
          .from("notifications")
          .update({ status: "failed", error_message: "No phone number" })
          .eq("id", notification.id);

        // Audit log
        logNotificationEvent(notification.id, false, { reason: "No phone number" }).catch(console.error);
        failed++;
        continue;
      }

      const result = await sendWhatsAppMessage({
        phone,
        message: notification.message,
      });

      if (result.success) {
        await supabase
          .from("notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        // Audit log
        logNotificationEvent(notification.id, true, {
          phone_masked: phone.substring(0, 4) + "****",
          messageId: result.messageId,
        }).catch(console.error);
        sent++;
      } else {
        const newRetryCount = (notification.retry_count || 0) + 1;
        const isFinalFailure = newRetryCount >= MAX_RETRIES;

        await supabase
          .from("notifications")
          .update({
            status: isFinalFailure ? "failed" : "pending",
            retry_count: newRetryCount,
            error_message: result.error,
          })
          .eq("id", notification.id);

        // Audit log
        logNotificationEvent(notification.id, false, {
          error: result.error,
          retry_count: newRetryCount,
          is_final_failure: isFinalFailure,
        }).catch(console.error);
        failed++;
      }
    }

    return NextResponse.json({ processed: pending.length, sent, failed });
  } catch (error) {
    console.error("[Notifications Send] Error:", error);
    return NextResponse.json({ error: "Gagal memproses pengiriman notifikasi karena kendala sistem." }, { status: 500 });
  }
}
