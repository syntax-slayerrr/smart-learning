import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, topicId, materialId, confusionScore, peakTimestamp } = body;

    const admin = createAdminClient();

    const isCritical = (confusionScore ?? 0) >= 35;

    const { data, error } = await admin
      .from("material_telemetry_links")
      .insert({
        telemetry_session_id: sessionId || null,
        material_id: materialId || null,
        topic_id: topicId || null,
        avg_confusion_score: confusionScore || 42,
        is_critical_zone: isCritical,
        peak_timestamp: peakTimestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: isCritical
        ? "⚠️ Zona Kritis aktif: Terhubung ke Smart Notebook siswa untuk bimbingan malam hari."
        : "Log korelasi telemetri berhasil direkam.",
    });
  } catch (error: any) {
    console.error("[API_DIGEST_CRITICAL_ZONE_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
