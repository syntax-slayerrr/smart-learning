import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
            reason: metadata.reason || "Keaktifan kelas via Hermes AI Copilot",
            student_name: metadata.studentName || "Siswa",
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
