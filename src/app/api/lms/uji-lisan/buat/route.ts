import { NextRequest, NextResponse } from "next/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, studentId, assignmentTitle, submissionSnippet } = body;

    if (!submissionSnippet) {
      return NextResponse.json(
        { success: false, error: "submissionSnippet is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Generate 2 personalized critical reasoning questions
    const prompt = `Kamu adalah Penguji Akademik AI (Micro-Oral Defense).
Siswa telah mengumpulkan tugas dengan judul: "${assignmentTitle || "Tugas Mandiri"}".
Ringkasan jawaban/laporan siswa:
"""
${submissionSnippet.slice(0, 2000)}
"""

Buat 2 pertanyaan penalaran lisan/tertulis yang mendalam untuk menguji apakah siswa benar-benar memahami konsep di balik pekerjaannya, bukan sekadar copy-paste atau mencontek.

Hasilkan JSON persis dengan struktur:
{
  "questions": [
    {
      "id": 1,
      "question": "pertanyaan 1 mengenai alasan atau metodologi",
      "expected_aspects": ["kriteria aspek yang harus ada di jawaban"]
    },
    {
      "id": 2,
      "question": "pertanyaan 2 mengenai skenario kasus atau konsekuensi jika variabel diubah",
      "expected_aspects": ["kriteria aspek yang harus ada di jawaban"]
    }
  ]
}

HANYA JSON tanpa markdown backticks.`;

    const aiResponse = await call9Router({
      model: ROUTER_MODELS.GEMINI_3_FLASH,
      messages: [
        { role: "system", content: "Kamu adalah AI Oral Defense Evaluator. Output WAJIB JSON murni." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
    });

    let result = {
      questions: [
        {
          id: 1,
          question: "Mengapa kamu memilih pendekatan tersebut untuk menyelesaikan studi kasus ini?",
          expected_aspects: ["Alasan pemilihan metode", "Efisiensi solusi"]
        },
        {
          id: 2,
          question: "Apa kendala terbesar saat melakukan implementasi dan bagaimana cara kamu memvalidasi hasilnya?",
          expected_aspects: ["Pemahaman praktis", "Langkah troubleshooting"]
        }
      ]
    };

    try {
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleanJson);
    } catch {
      // Use fallback questions
    }

    // Rekam sesi uji lisan ke database Supabase
    const { data: defenseRecord } = await admin
      .from("oral_defense_sessions")
      .insert({
        submission_id: submissionId || null,
        student_id: studentId || null,
        defense_questions: result.questions,
        status: "in_progress",
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      defenseId: defenseRecord?.id || "def-temp-id",
      questions: result.questions,
    });
  } catch (error: any) {
    console.error("[API_UJI_LISAN_BUAT_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
