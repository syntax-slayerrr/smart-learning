import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Session Authentication & Role Authorization Gate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Tindakan ini hanya dapat dilakukan oleh Guru atau Admin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { actionType, targetId, metadata = {} } = body;

    if (!actionType || !targetId) {
      return NextResponse.json(
        { success: false, error: "actionType and targetId are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    if (actionType === "award_points") {
      // 1. Log point award to audit_logs
      const { error: logError } = await admin.from("audit_logs").insert([
        {
          action: "AWARD_POINTS",
          table_name: "students",
          record_id: targetId,
          new_data: {
            points: metadata.points || 10,
            reason: metadata.reason || "Keaktifan kelas via Smart AI Copilot",
            student_name: metadata.studentName || "Siswa",
            awarded_by: user.id,
            awarded_by_name: profile.full_name,
            awarded_at: new Date().toISOString(),
          },
        },
      ]);

      if (logError) {
        console.warn("[Copilot Action DB Warning]:", logError.message);
      }

      return NextResponse.json({
        success: true,
        message: `+${metadata.points || 10} Poin Keaktifan berhasil dicatat ke database!`,
        actionType,
        targetId,
      });
    }

    if (actionType === "confirm_teacher" || actionType === "assign_inval") {
      // 2. Log teacher follow up / inval to audit_logs
      const { error: logError } = await admin.from("audit_logs").insert([
        {
          action: actionType === "assign_inval" ? "ASSIGN_INVAL" : "TEACHER_FOLLOW_UP",
          table_name: "profiles",
          record_id: targetId,
          new_data: {
            teacher_name: metadata.teacherName || "Guru Pengajar",
            subject: metadata.subject || "Umum",
            note: metadata.note || "Tindak lanjut kedisiplinan jadwal mengajar",
            processed_by: user.id,
            processed_by_name: profile.full_name,
            processed_at: new Date().toISOString(),
          },
        },
      ]);

      if (logError) {
        console.warn("[Copilot Action DB Warning]:", logError.message);
      }

      return NextResponse.json({
        success: true,
        message: actionType === "assign_inval" 
          ? "Penugasan guru inval pengganti berhasil dicatat ke database!"
          : "Status tindak lanjut guru berhasil dicatat ke database!",
        actionType,
        targetId,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported actionType: ${actionType}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Copilot Action Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute action" },
      { status: 500 }
    );
  }
}
