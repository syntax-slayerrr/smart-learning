import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required", success: false },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Verify session and teacher authorization
    const { data: session, error: sessionErr } = await adminClient
      .from("attendance_sessions")
      .select("id, teacher_id, session_date, status, subjects(name), classes(name)")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json(
        { error: "Session not found", success: false },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "60", 10)));

    // Fetch telemetry time-series slices
    const { data: telemetry, error: telemetryErr } = await adminClient
      .from("classroom_telemetry")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp_bucket", { ascending: false })
      .limit(limit);

    if (telemetryErr) {
      return NextResponse.json(
        { error: "Failed to fetch telemetry", details: telemetryErr.message, success: false },
        { status: 500 }
      );
    }

    // Sort ascending for chronological chart plotting
    const chronologicalTelemetry = (telemetry || []).reverse();

    // Fetch pedagogical insights
    const { data: insights } = await adminClient
      .from("pedagogical_insights")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    // Aggregate summary statistics
    const totalSlices = chronologicalTelemetry.length;
    let avgStudents = 0;
    let totalHandRaises = 0;
    let avgSitting = 0;
    let avgStanding = 0;

    if (totalSlices > 0) {
      const sumStudents = chronologicalTelemetry.reduce((acc, t) => acc + (t.detected_students_count || 0), 0);
      const sumSitting = chronologicalTelemetry.reduce((acc, t) => acc + (t.sitting_count || 0), 0);
      const sumStanding = chronologicalTelemetry.reduce((acc, t) => acc + (t.standing_count || 0), 0);
      totalHandRaises = chronologicalTelemetry.reduce((acc, t) => acc + (t.hand_raise_count || 0), 0);

      avgStudents = Math.round(sumStudents / totalSlices);
      avgSitting = Math.round(sumSitting / totalSlices);
      avgStanding = Math.round(sumStanding / totalSlices);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        subject: Array.isArray(session.subjects) ? session.subjects[0]?.name : (session.subjects as any)?.name,
        class: Array.isArray(session.classes) ? session.classes[0]?.name : (session.classes as any)?.name,
        date: session.session_date,
        status: session.status,
      },
      summary: {
        total_slices: totalSlices,
        avg_students: avgStudents,
        avg_sitting: avgSitting,
        avg_standing: avgStanding,
        total_hand_raises: totalHandRaises,
      },
      telemetry: chronologicalTelemetry,
      insights: insights || [],
    });
  } catch (err) {
    console.error("[Session Telemetry Fetch Error]:", err);
    return NextResponse.json(
      { error: "Internal server error fetching session telemetry", success: false },
      { status: 500 }
    );
  }
}
