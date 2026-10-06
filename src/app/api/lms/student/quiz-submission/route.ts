import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const quizSubmissionSchema = z.object({
  studentId: z.string().min(1, "studentId wajib diisi"),
  materialId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  quizTitle: z.string().default("Kuis Mandiri Modul"),
  score: z.number().min(0).max(100),
  totalQuestions: z.number().int().positive(),
  correctCount: z.number().int().min(0),
  answers: z.record(z.string().or(z.number()), z.number()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const rawBody = await req.json();

    const normalizedBody = {
      studentId: rawBody.studentId || rawBody.student_id || "student-mock-zaldy",
      materialId: rawBody.materialId || rawBody.material_id || null,
      subjectId: rawBody.subjectId || rawBody.subject_id || null,
      quizTitle: rawBody.quizTitle || rawBody.quiz_title || "Kuis Konseptual Subnetting & Jaringan",
      score: typeof rawBody.score === "number" ? rawBody.score : parseInt(rawBody.score, 10) || 0,
      totalQuestions: rawBody.totalQuestions || rawBody.total_questions || 3,
      correctCount: rawBody.correctCount || rawBody.correct_count || 0,
      answers: rawBody.answers || {},
    };

    const parseResult = quizSubmissionSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi pengumpulan kuis gagal",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { studentId, materialId, quizTitle, score, totalQuestions, correctCount } =
      parseResult.data;

    // Save summary checkpoint into student_study_notes
    const noteContent = `### 🏆 Hasil Kuis: ${quizTitle}\n\n- **Skor**: ${score}/100\n- **Jawaban Benar**: ${correctCount} dari ${totalQuestions} soal\n- **Status**: ${score >= 75 ? "Lulus Kompetensi (Sangat Baik)" : "Perlu Penguatan Konsep"}\n\n*Dicatat otomatis oleh Smart Learning Engine pada ${new Date().toLocaleDateString("id-ID")}*`;

    const { data: noteRecord, error: noteError } = await admin
      .from("student_study_notes")
      .insert({
        student_id: studentId,
        material_id: materialId || null,
        note_content: noteContent,
        socratic_context: {
          type: "quiz_evaluation",
          score,
          correctCount,
          totalQuestions,
          evaluated_at: new Date().toISOString(),
        },
      })
      .select()
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        score,
        correctCount,
        totalQuestions,
        passed: score >= 75,
        noteId: noteRecord?.id || null,
        message: score >= 75 ? "Selamat! Anda lulus kuis pemahaman modul ini." : "Kuis tercatat. Disarankan mengulang topik yang belum dipahami.",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
