import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const telemetryIngestSchema = z.object({
  session_id: z.string().uuid("Invalid session UUID"),
  timestamp: z.string().optional(),
  frame_id: z.number().int().optional(),
  summary: z.object({
    total: z.number().int().min(0),
    sitting: z.number().int().min(0),
    standing: z.number().int().min(0),
    hands_raised: z.number().int().min(0),
    desk_focused: z.number().int().min(0).optional(),
    active_clusters: z.number().int().min(0).optional(),
    teacher_zone: z.string().nullable().optional(),
  }),
  spatial_distribution: z.record(z.unknown()).optional(),
  anonymized_tracks: z.array(z.record(z.unknown())).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const edgeSecretHeader = request.headers.get("x-edge-device-key");
    const adminClient = createAdminClient();

    // 1. Authorization: Edge Device Key OR Authenticated Teacher/Admin
    let isAuthorized = false;
    const envSecret = process.env.EDGE_DEVICE_SECRET || "dev-edge-secret-key-2026";

    if (edgeSecretHeader && edgeSecretHeader === envSecret) {
      isAuthorized = true;
    } else {
      // Check user session
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile && (profile.role === "teacher" || profile.role === "admin")) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid edge device key or user session", success: false },
        { status: 401 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json();
    const parseResult = telemetryIngestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid telemetry payload",
          details: parseResult.error.errors,
          success: false,
        },
        { status: 400 }
      );
    }

    const { session_id, timestamp, frame_id, summary, spatial_distribution, anonymized_tracks } =
      parseResult.data;

    // 3. Verify session exists
    const { data: session, error: sessionError } = await adminClient
      .from("attendance_sessions")
      .select("id, status")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Attendance session not found", success: false },
        { status: 404 }
      );
    }

    // 4. Insert telemetry into classroom_telemetry
    const timestampBucket = timestamp || new Date().toISOString();
    const spatialData = spatial_distribution || { tracks: anonymized_tracks || [] };

    const { data: inserted, error: insertError } = await adminClient
      .from("classroom_telemetry")
      .insert({
        session_id,
        timestamp_bucket: timestampBucket,
        frame_sequence: frame_id || 0,
        detected_students_count: summary.total,
        sitting_count: summary.sitting,
        standing_count: summary.standing,
        hand_raise_count: summary.hands_raised,
        desk_focused_count: summary.desk_focused || 0,
        active_clusters_count: summary.active_clusters || 0,
        teacher_zone: summary.teacher_zone || null,
        spatial_distribution_json: spatialData,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Telemetry Ingest Error]:", insertError);
      return NextResponse.json(
        { error: "Failed to store telemetry record", details: insertError.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        telemetry_id: inserted.id,
        timestamp: timestampBucket,
        message: "Classroom telemetry ingested successfully",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Telemetry Unexpected Error]:", err);
    return NextResponse.json(
      { error: "Internal server error processing telemetry", success: false },
      { status: 500 }
    );
  }
}
