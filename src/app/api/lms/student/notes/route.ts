import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Zod Schema for Note Creation
const createNoteSchema = z.object({
  studentId: z.string().min(1, "studentId wajib diisi"),
  materialId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  noteContent: z.string().min(1, "noteContent tidak boleh kosong").max(10000, "Catatan melebihi batas maksimal 10.000 karakter"),
  highlightedText: z.string().optional().nullable(),
  socraticContext: z.record(z.any()).optional().nullable(),
});

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
    const rawBody = await req.json();

    // Map flexible payload (support snake_case from offline sync and camelCase)
    const normalizedBody = {
      studentId: rawBody.studentId || rawBody.student_id || "student-mock-zaldy",
      materialId: rawBody.materialId || rawBody.material_id || null,
      topicId: rawBody.topicId || rawBody.topic_id || rawBody.chapter_id || null,
      noteContent: rawBody.noteContent || rawBody.note_content || rawBody.my_note,
      highlightedText: rawBody.highlightedText || rawBody.highlighted_text || rawBody.quote || null,
      socraticContext: rawBody.socraticContext || rawBody.socratic_context || {},
    };

    const parseResult = createNoteSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi gagal",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { studentId, materialId, topicId, noteContent, highlightedText, socraticContext } =
      parseResult.data;

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
