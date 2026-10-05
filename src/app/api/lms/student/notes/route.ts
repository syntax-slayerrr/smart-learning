import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/lms/student/notes?materialId=xxx&topicId=xxx&studentId=yyy
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId");
    const topicId = searchParams.get("topicId");
    const studentId = searchParams.get("studentId");

    let query = admin
      .from("student_study_notes")
      .select("*, material_topics(title)")
      .order("created_at", { ascending: false });

    if (studentId) query = query.eq("student_id", studentId);
    if (materialId) query = query.eq("material_id", materialId);
    if (topicId) query = query.eq("topic_id", topicId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, notes: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/lms/student/notes (Simpan catatan baru atau pin dari Smart AI)
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();
    const { studentId, materialId, topicId, noteContent, highlightedText, socraticContext } = body;

    if (!studentId || !noteContent) {
      return NextResponse.json(
        { success: false, error: "studentId and noteContent are required" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("student_study_notes")
      .insert({
        student_id: studentId,
        material_id: materialId || null,
        topic_id: topicId || null,
        note_content: noteContent,
        highlighted_text: highlightedText || null,
        socratic_context: socraticContext || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
