import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AttendanceStatus } from "@/types/domain";

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const adminClient = createAdminClient();

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
    }

    // Authorization guard: Only teacher or admin can approve attendance drafts
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" && profile?.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Only teachers or admins can approve attendance drafts", success: false },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { records } = body as {
      records: Array<{
        student_id: string;
        status?: AttendanceStatus;
        notes?: string;
      }>;
    };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No student records provided to approve", success: false },
        { status: 400 }
      );
    }

    const isDemoSession = sessionId === "00000000-0000-0000-0000-000000000001";

    if (isDemoSession) {
      return NextResponse.json({
        success: true,
        approved_count: records.length,
        message: `Berhasil menyetujui presensi ${records.length} siswa (Demo Mode).`,
      });
    }

    // Prepare rows for upsert into attendance_records
    const nowIso = new Date().toISOString();
    const rowsToInsert = records.map((rec) => ({
      session_id: sessionId,
      student_id: rec.student_id,
      status: rec.status || "present",
      scanned_at: nowIso,
      notes: rec.notes || "Diverifikasi AI Vision (Dwell time stabil + Multi-frame consensus)",
      recorded_by: user.id,
    }));

    // Perform upsert based on session_id and student_id
    const { data: inserted, error: upsertError } = await adminClient
      .from("attendance_records")
      .upsert(rowsToInsert, { onConflict: "session_id,student_id" })
      .select("id");

    if (upsertError) {
      console.error("[Approve Draft DB Error]:", upsertError);
      return NextResponse.json(
        { error: "Failed to save attendance records", details: upsertError.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approved_count: records.length,
      saved_records_count: inserted?.length || records.length,
      message: `Presensi ${records.length} siswa berhasil disetujui dan dicatat resmi.`,
    });
  } catch (error: any) {
    console.error("[Approve Draft Error]:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message, success: false },
      { status: 500 }
    );
  }
}
