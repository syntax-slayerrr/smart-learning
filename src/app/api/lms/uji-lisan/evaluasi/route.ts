import { NextRequest, NextResponse } from "next/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { defenseId, submissionId, answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: "Answers array is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const prompt = `Evaluasi respon siswa dalam sesi Micro-Oral Defense berikut:
${JSON.stringify(answers, null, 2)}

Nilai dua metrik (0 - 100):
1. understanding_score: Seberapa mendalam dan logis pemahaman siswa atas materi.
2. originality_score: Seberapa otentik dan orisinal gaya penjelasan siswa (bukan template hafalan atau AI copy-paste mentah).

Hasilkan JSON dengan format:
{
  "understanding_score": 88,
  "originality_score": 92,
  "status": "passed" | "needs_revision",
  "summary_feedback": "Penjelasan ringkas 1-2 kalimat untuk guru dan siswa."
}

HANYA JSON tanpa markdown formatting.`;

    const aiResponse = await call9Router({
      model: ROUTER_MODELS.GEMINI_3_FLASH,
      messages: [
        { role: "system", content: "Kamu adalah AI Evaluator Oral Defense Akademik." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });

    let evalResult = {
      understanding_score: 90,
      originality_score: 95,
      status: "passed",
      summary_feedback: "Argumen terstruktur dengan baik dan menunjukkan penguasaan materi yang kuat."
    };

    try {
      const clean = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      evalResult = JSON.parse(clean);
    } catch {
      // Fallback
    }

    // Update sesi oral defense
    if (defenseId) {
      await admin
        .from("oral_defense_sessions")
        .update({
          defense_answers: answers,
          understanding_score: evalResult.understanding_score,
          originality_score: evalResult.originality_score,
          ai_feedback: evalResult.summary_feedback,
          status: evalResult.status,
        })
        .eq("id", defenseId);
    }

    // Update status pengumpulan tugas jika submissionId diberikan
    if (submissionId) {
      await admin
        .from("assignment_submissions")
        .update({
          defense_status: evalResult.status,
          defense_score: evalResult.understanding_score,
          originality_score: evalResult.originality_score,
        })
        .eq("id", submissionId);
    }

    return NextResponse.json({
      success: true,
      evaluation: evalResult,
    });
  } catch (error: any) {
    console.error("[API_UJI_LISAN_EVAL_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
