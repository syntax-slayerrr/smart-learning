import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") || "00000000-0000-0000-0000-000000000001";

    // 1. Check in-memory buffer first (fastest, sub-1ms)
    const memBuffer = globalThis.__LATEST_TELEMETRY__?.[sessionId] || [];
    
    if (memBuffer.length > 0) {
      const latest = memBuffer[memBuffer.length - 1];
      return NextResponse.json({
        success: true,
        source: "memory-edge",
        latest,
        history: memBuffer.slice(-20),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fallback to Supabase database if session has stored rows
    try {
      const adminClient = createAdminClient();
      const { data: dbRows } = await adminClient
        .from("classroom_telemetry")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp_bucket", { ascending: false })
        .limit(20);

      if (dbRows && dbRows.length > 0) {
        const sorted = [...dbRows].reverse();
        return NextResponse.json({
          success: true,
          source: "database",
          latest: sorted[sorted.length - 1],
          history: sorted,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // In offline or mock mode, continue to default simulation state
    }

    // 3. Fallback default standby state
    const nowIso = new Date().toISOString();
    return NextResponse.json({
      success: true,
      source: "standby",
      latest: {
        id: "standby-0",
        session_id: sessionId,
        timestamp_bucket: nowIso,
        detected_students_count: 0,
        sitting_count: 0,
        standing_count: 0,
        hand_raise_count: 0,
        desk_focused_count: 0,
        sleep_detected_count: 0,
        active_clusters_count: 0,
        teacher_zone: "zone-front",
        spatial_distribution: {},
      },
      history: [],
      timestamp: nowIso,
    });
  } catch (error) {
    console.error("[Telemetry Latest Error]:", error);
    return NextResponse.json(
      { error: "Internal server error fetching latest telemetry", success: false },
      { status: 500 }
    );
  }
}
