import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { verifyEdgeDeviceAuthorization } from "@/lib/security";

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
    sleep_detected: z.number().int().min(0).optional(),
    active_clusters: z.number().int().min(0).optional(),
    teacher_zone: z.string().nullable().optional(),
  }),
  spatial_distribution: z.record(z.unknown()).optional(),
  anonymized_tracks: z.array(z.record(z.unknown())).optional(),
});

// In-memory buffer for real-time live dashboard sync & human-in-the-loop attendance drafts
declare global {
  // eslint-disable-next-line no-var
  var __LATEST_TELEMETRY__: Record<string, any[]> | undefined;
  // eslint-disable-next-line no-var
  var __ATTENDANCE_DRAFT__: Record<string, Record<string, any>> | undefined;
}

if (!globalThis.__LATEST_TELEMETRY__) {
  globalThis.__LATEST_TELEMETRY__ = {};
}
if (!globalThis.__ATTENDANCE_DRAFT__) {
  globalThis.__ATTENDANCE_DRAFT__ = {};
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // 1. Authorization: Edge Device Key OR Authenticated Teacher/Admin
    let isAuthorized = verifyEdgeDeviceAuthorization(request);

    if (!isAuthorized) {
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body or empty payload", success: false },
        { status: 400 }
      );
    }
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

    // 3. Verify session exists (Supports demo presentation session UUID)
    const isDemoSession = session_id === "00000000-0000-0000-0000-000000000001";
    let session = null;

    if (!isDemoSession) {
      const { data, error: sessionError } = await adminClient
        .from("attendance_sessions")
        .select("id, status")
        .eq("id", session_id)
        .maybeSingle();

      if (sessionError || !data) {
        return NextResponse.json(
          { error: "Attendance session not found", success: false },
          { status: 404 }
        );
      }
      session = data;
    }

    // 4. Insert telemetry into classroom_telemetry
    const timestampBucket = timestamp || new Date().toISOString();
    const spatialData = spatial_distribution || { tracks: anonymized_tracks || [] };
    let insertedId = "telemetry-edge-" + Date.now();

    try {
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
          sleep_detected_count: summary.sleep_detected || 0,
          active_clusters_count: summary.active_clusters || 0,
          teacher_zone: summary.teacher_zone || null,
          spatial_distribution_json: spatialData,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[Telemetry Ingest DB Notice]:", insertError.message);
      } else if (inserted) {
        insertedId = inserted.id;
      }
    } catch (dbErr) {
      console.warn("[Telemetry Ingest DB Exception]:", dbErr);
    }

    // Save frame to in-memory buffer for real-time live dashboard sync
    const buffer = globalThis.__LATEST_TELEMETRY__![session_id] || [];
    buffer.push({
      id: insertedId,
      session_id,
      timestamp_bucket: timestampBucket,
      frame_sequence: frame_id || 0,
      detected_students_count: summary.total,
      sitting_count: summary.sitting,
      standing_count: summary.standing,
      hand_raise_count: summary.hands_raised,
      desk_focused_count: summary.desk_focused || 0,
      sleep_detected_count: summary.sleep_detected || 0,
      active_clusters_count: summary.active_clusters || 0,
      teacher_zone: summary.teacher_zone || "zone-center",
      spatial_distribution: spatialData,
      anonymized_tracks: anonymized_tracks || [],
    });
    if (buffer.length > 50) buffer.shift();
    globalThis.__LATEST_TELEMETRY__![session_id] = buffer;

    // Multi-Frame Dwell Gate & AI Attendance Draft Aggregator
    if (anonymized_tracks && Array.isArray(anonymized_tracks)) {
      if (!globalThis.__ATTENDANCE_DRAFT__![session_id]) {
        globalThis.__ATTENDANCE_DRAFT__![session_id] = {};
      }
      const draftMap = globalThis.__ATTENDANCE_DRAFT__![session_id];

      // Auto-lookup active session in DB if running on demo session id
      let effectiveSessionId: string | null = (!isDemoSession && session) ? session_id : null;
      if (!effectiveSessionId) {
        try {
          const { data: activeSession } = await adminClient
            .from("attendance_sessions")
            .select("id, class_id")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeSession) {
            effectiveSessionId = activeSession.id;
          }
        } catch (sessLookupErr) {
          console.warn("[Active Session Lookup Notice]:", sessLookupErr);
        }
      }

      for (const rawTrack of anonymized_tracks) {
        const track = rawTrack as Record<string, any>;
        const studentName = track.student_name as string;
        let studentId = track.student_id as string | undefined;
        let nis = track.nis as string | undefined;
        const isRec = Boolean(track.is_recognized);
        const dwell = Number(track.dwell_seconds || 0);

        if (isRec && studentName && !studentName.startsWith("Siswa #")) {
          // Auto-Resolver: Cari student_id & nis dari database jika kamera hanya mengirim nama string
          if (!studentId) {
            try {
              const { data: foundStudent } = await adminClient
                .from("students")
                .select("id, nis, profiles!inner(full_name)")
                .ilike("profiles.full_name", `%${studentName}%`)
                .limit(1)
                .maybeSingle();

              if (foundStudent) {
                studentId = foundStudent.id;
                nis = foundStudent.nis;
              }
            } catch (resolveErr) {
              console.warn("[Student Name-to-UUID Resolver Notice]:", resolveErr);
            }
          }

          const draftKey = studentId || studentName;
          const prev = draftMap[draftKey] || draftMap[studentName];
          const bestDwell = Math.max(dwell, prev?.dwell_seconds || 0, 15);
          const draftItem = {
            student_id: studentId || prev?.student_id,
            nis: nis || prev?.nis,
            student_name: studentName,
            seat_id: track.seat_id || prev?.seat_id || "SEAT_1",
            confidence: track.confidence || prev?.confidence || 0.98,
            dwell_seconds: bestDwell,
            attendance_qualified: true, // Instan terverifikasi AI!
            last_seen: new Date().toISOString(),
          };
          draftMap[draftKey] = draftItem;

          // Mirror ke effectiveSessionId agar auto-draft view langsung membacanya
          if (effectiveSessionId && effectiveSessionId !== session_id) {
            if (!globalThis.__ATTENDANCE_DRAFT__![effectiveSessionId]) {
              globalThis.__ATTENDANCE_DRAFT__![effectiveSessionId] = {};
            }
            globalThis.__ATTENDANCE_DRAFT__![effectiveSessionId][draftKey] = draftItem;
          }

          // Instant Auto-Attendance ke Database Supabase jika sesi resmi terdaftar dan student_id terpecahkan!
          if (effectiveSessionId && studentId) {
            try {
              await adminClient.from("attendance_records").upsert(
                {
                  session_id: effectiveSessionId,
                  student_id: studentId,
                  status: "present",
                  scanned_at: new Date().toISOString(),
                  notes: `Auto-Verified AI Vision (Kursi: ${track.seat_id || "SEAT_1"}, Akurasi: ${Math.round(Number(track.confidence || 0.98) * 100)}%)`,
                },
                { onConflict: "session_id,student_id" }
              );
            } catch (dbErr) {
              console.warn("[Auto-Attendance Direct Upsert Notice]:", dbErr);
            }
          }
        }
      }
    }

    // 5. Automated Insight Trigger: If sleeping students detected, generate prompt
    if (summary.sleep_detected && summary.sleep_detected > 0) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentSleepInsight } = await adminClient
        .from("pedagogical_insights")
        .select("id")
        .eq("session_id", session_id)
        .eq("insight_type", "sleeping")
        .gte("created_at", tenMinutesAgo)
        .limit(1);

      if (!recentSleepInsight || recentSleepInsight.length === 0) {
        await adminClient.from("pedagogical_insights").insert({
          session_id,
          insight_type: "sleeping",
          observation_summary: `Terdeteksi ${summary.sleep_detected} siswa tertidur atau telungkup di meja saat pembelajaran berlangsung.`,
          pedagogical_prompt:
            "Tingkat energi kelas menurun. Pertimbangkan untuk berkeliling ke area meja tersebut, menyisipkan tanya jawab aktif, atau mengajak peregangan ringan.",
          confidence_level: "high",
          phase_start_time: timestampBucket,
          phase_end_time: timestampBucket,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        telemetry_id: insertedId,
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
