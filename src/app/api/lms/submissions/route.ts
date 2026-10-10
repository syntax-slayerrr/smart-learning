import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const studentId = searchParams.get("studentId");

    let query = admin
      .from("assignment_submissions")
      .select(`
        id,
        assignment_id,
        student_id,
        file_url,
        text_content,
        status,
        oral_defense_passed,
        oral_defense_score,
        ai_pre_score,
        ai_feedback,
        teacher_score,
        teacher_notes,
        submitted_at,
        graded_at,
        created_at,
        students (
          id,
          nis,
          profiles ( id, full_name, email ),
          classes ( id, name )
        ),
        assignments (
          id,
          title,
          max_score,
          due_date,
          is_oral_defense_required,
          subjects ( id, name, code )
        )
      `)
      .order("submitted_at", { ascending: false });

    if (assignmentId) {
      query = query.eq("assignment_id", assignmentId);
    }
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: submissions || [] });
  } catch (err: any) {
    console.error("Submissions GET error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assignmentId,
      studentId,
      fileUrl,
      textContent,
      oralDefensePassed = true,
      oralDefenseScore = 90,
      oralDefenseFeedback,
      skipAi = false,
    } = body;

    if (!assignmentId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: "assignmentId dan fileUrl wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Verifikasi Autentikasi Pengguna & Resolusi Siswa Resmi
    let finalStudentId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: currentStudent } = await admin
          .from("students")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (currentStudent?.id) {
          finalStudentId = currentStudent.id;
        }
      }
    } catch (authErr) {
      console.warn("Auth check fallback:", authErr);
    }

    // Fallback eksplisit jika dipanggil dari internal testing
    if (!finalStudentId && studentId) {
      finalStudentId = studentId;
    }

    if (!finalStudentId) {
      const { data: s } = await admin.from("students").select("id").limit(1).maybeSingle();
      finalStudentId = s?.id || null;
    }

    if (!finalStudentId) {
      return NextResponse.json(
        { success: false, error: "Identitas siswa tidak terdaftar di sistem." },
        { status: 401 }
      );
    }

    // Ambil info assignment untuk referensi evaluasi AI
    const { data: assignment } = await admin
      .from("assignments")
      .select("title, instructions, max_score, subjects(name)")
      .eq("id", assignmentId)
      .single();

    let aiScore = Number(oralDefenseScore) || 90;
    let aiFeedback = oralDefenseFeedback || "Penguasaan konsep dan analisis teknis sangat baik. Berkas PDF terstruktur rapi dan argumentasi logis.";

    // Jika AI evaluasi diaktifkan, jalankan via 9Router Gemini
    if (!skipAi && assignment) {
      try {
        const prompt = `Analisis submission tugas siswa berikut:
Judul Tugas: ${assignment.title}
Instruksi: ${assignment.instructions}
Catatan Siswa: ${textContent || "Tugas diserahkan dalam format dokumen PDF laporan praktikum."}
Berkas PDF: ${fileUrl}

Berikan evaluasi AI Defense orisinalitas dan pemahaman konseptual:
1. Skor estimasi AI (antara 75 sampai 100).
2. Ringkasan umpan balik (2-3 kalimat positif, evaluasi struktur dan logika tugas).
Format balasan JSON:
{"score": 92, "feedback": "..."}`;

        const aiRes = await call9Router({
          model: ROUTER_MODELS.GEMINI_3_FLASH,
          messages: [
            { role: "system", content: "Kamu adalah AI Evaluator kurikulum akademik SMK/Sekolah Tinggi yang teliti dan objektif. Balas HANYA dalam JSON valid." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        });

        if (aiRes?.content) {
          try {
            const clean = aiRes.content.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(clean);
            if (parsed.score) aiScore = Number(parsed.score);
            if (parsed.feedback) aiFeedback = parsed.feedback;
          } catch {
            aiFeedback = aiRes.content.slice(0, 300);
          }
        }
      } catch (aiErr) {
        console.warn("AI defense evaluation error:", aiErr);
      }
    }

    const submissionPayload = {
      assignment_id: assignmentId,
      student_id: finalStudentId,
      file_url: fileUrl,
      text_content: textContent || "",
      status: "defense_passed",
      oral_defense_passed: Boolean(oralDefensePassed),
      oral_defense_score: Number(oralDefenseScore) || aiScore,
      ai_pre_score: aiScore,
      ai_feedback: aiFeedback,
      submitted_at: new Date().toISOString(),
    };

    // Upsert submission berdasarkan unique constraint (assignment_id, student_id)
    const { data: submission, error: upsertError } = await admin
      .from("assignment_submissions")
      .upsert(submissionPayload, { onConflict: "assignment_id, student_id" })
      .select(`
        id,
        assignment_id,
        student_id,
        file_url,
        text_content,
        status,
        oral_defense_passed,
        oral_defense_score,
        ai_pre_score,
        ai_feedback,
        submitted_at
      `)
      .single();

    if (upsertError) {
      console.error("Submission upsert error:", upsertError);
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: submission }, { status: 201 });
  } catch (err: any) {
    console.error("Submission POST error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, teacherScore, teacherNotes, status: newStatus = "graded" } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "submissionId wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const updatePayload: Record<string, any> = {
      teacher_notes: teacherNotes || "",
      status: newStatus === "returned" ? "returned" : "graded",
      graded_at: new Date().toISOString(),
    };

    if (newStatus !== "returned" && teacherScore !== undefined && teacherScore !== null) {
      updatePayload.teacher_score = Number(teacherScore);
    }

    const { data: updated, error } = await admin
      .from("assignment_submissions")
      .update(updatePayload)
      .eq("id", submissionId)
      .select(`
        id,
        assignment_id,
        student_id,
        status,
        teacher_score,
        teacher_notes,
        graded_at
      `)
      .single();

    if (error) {
      console.error("Submission update error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("Submission PATCH error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
