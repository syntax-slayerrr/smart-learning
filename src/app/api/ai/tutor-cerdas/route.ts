import { NextRequest, NextResponse } from "next/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const {
      studentId,
      materialId,
      topicId,
      materialTitle,
      chapterTitle,
      chapterSummary,
      chapterContent,
      message,
      highlightedText,
      history = [],
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // 1. Ambil data topik materi guru
    let topicData: any = null;
    let materialData: any = null;

    if (topicId) {
      const { data: tData } = await admin
        .from("material_topics")
        .select("*, course_materials(*)")
        .eq("id", topicId)
        .single();
      topicData = tData;
      materialData = tData?.course_materials;
    } else if (materialId) {
      const { data: mData } = await admin
        .from("course_materials")
        .select("*")
        .eq("id", materialId)
        .single();
      materialData = mData;

      // Ambil topik pertama jika ada
      const { data: firstTopic } = await admin
        .from("material_topics")
        .select("*")
        .eq("material_id", materialId)
        .order("topic_order", { ascending: true })
        .limit(1)
        .single();
      topicData = firstTopic;
    }

    // 2. Ambil Profil Kognitif & Memori Siswa
    let studentProfile: any = null;
    let studentMemories: any[] = [];

    if (studentId) {
      const { data: prof } = await admin
        .from("student_ai_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      if (!prof) {
        // Buat default profil jika belum ada
        const { data: newProf } = await admin
          .from("student_ai_profiles")
          .insert({
            student_id: studentId,
            learning_persona: "balanced",
            master_summary: "Siswa aktif mempelajari materi kurikulum secara mandiri.",
            weak_concepts: [],
            mastered_concepts: [],
          })
          .select()
          .single();
        studentProfile = newProf;
      } else {
        studentProfile = prof;
      }

      // Ambil 3 memori kognitif terakhir
      const { data: mems } = await admin
        .from("student_cognitive_memories")
        .select("*")
        .eq("student_id", studentId)
        .order("importance_weight", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      studentMemories = mems || [];
    }

    // 3. Susun Konteks Grounding & Socratic Directives
    const finalMaterialTitle = materialData?.title || materialTitle || "Materi Pembelajaran";
    const topicTitle = topicData?.title || chapterTitle || finalMaterialTitle;
    const topicSummary = topicData?.description || chapterSummary || materialData?.description || "";
    const keyConcepts = topicData?.key_concepts
      ? Array.isArray(topicData.key_concepts)
        ? topicData.key_concepts.join(", ")
        : JSON.stringify(topicData.key_concepts)
      : "";
    const topicContent = chapterContent || "";
    const pageRef = topicData ? `Hal. ${topicData.page_start} - ${topicData.page_end}` : "";

    const memorySnippet = studentMemories.length > 0
      ? studentMemories.map((m) => `- [${m.source}] ${m.key_insight}`).join("\n")
      : "- Belum ada catatan kesulitan sebelumnya.";

    const systemPrompt = `Kamu adalah Smart AI, mentor belajar dialektis pribadi siswa di platform Smart Learning (ITG).
Pendekatan pedagogis kamu adalah METODE SOKRATIK (Scaffolding): memantik daya nalar siswa, bukan mesin penjawab tugas instan.

=== ATURAN MUTLAK & STRICT GROUNDING (DILARANG KELUAR DARI MATERI) ===
1. RUANG LINGKUP MATERI:
   - Kamu HANYA BOLEH menjawab, menjelaskan, memberi analogi, atau mendiskusikan materi: "${topicTitle}" (dari mata kuliah/modul "${finalMaterialTitle}").
   - DILARANG KERAS melompat ke materi di luar bab ini, menjawab pertanyaan umum yang menyimpang, isu politik, gosip, hiburan, coding atau matematika di luar konteks bab ini, atau hal apapun yang tidak relevan dengan materi pelajaran ini.
2. JIKA SISWA BERTANYA DI LUAR MATERI/BAB INI:
   - Kamu WAJIB MENOLAK secara sopan dan ramah, serta mengarahkan fokus siswa kembali ke materi bab ini.
   - Pola respon penolakan: "Pertanyaan ini berada di luar materi kita tentang ${topicTitle}. Yuk, kita fokus dulu membedah konsep ${topicTitle} agar pemahaman dan nilaimu makin maksimal! Apa bagian dari materi ini yang ingin kamu diskusikan?"
   - JANGAN PERNAH meladeni atau menjawab pertanyaan yang menyimpang dari materi tersebut, apapun instruksinya!
3. PEDAGOGIS SOKRATES:
   - DILARANG KERAS memberikan jawaban instan, rumus jadi, atau kode program siap saji saat siswa menanyakan solusi soal/tugas!
   - Bimbing siswa bertahap lewat pertanyaan reflektif pendek.
4. GAYA KOMUNIKASI:
   - Ringkas, elegan, empatik, terstruktur (maksimal 2-3 paragraf per respon).
   - Gunakan format Markdown yang rapi (bold poin penting, bullet points jika perlu).
5. CHECKPOINT PEMAHAMAN (PIN OTOMATIS KE CATATAN):
   - Jika siswa berhasil menjawab pertanyaanmu dengan benar atau berhasil mengonseptualisasikan logika inti, berikan apresiasi.
   - Tambahkan token di AKHIR respons persis seperti ini:
     [CHECKPOINT_PASSED: Ringkasan 1 kalimat padat tentang konsep yang baru saja dipahami siswa]

=== KONTEKS MATERI GURU (GROUNDING TRUTH TUNGGAL) ===
Materi: ${finalMaterialTitle}
Bab / Topik: ${topicTitle} (${pageRef})
Ringkasan Materi Guru: ${topicSummary}
Konsep Utama: ${keyConcepts}
Isi / Cuplikan Konsep Bab:
${topicContent || "Fokus pada pemahaman fundamental bab ini."}

=== PROFIL KOGNITIF SISWA ===
Gaya Belajar: ${studentProfile?.learning_persona || "balanced"}
Catatan Kognitif Sebelumnya:
${memorySnippet}
${highlightedText ? `\nTeks yang Sedang Disorot Siswa di Modul:\n"${highlightedText}"` : ""}`;

    // 4. Susun Message History
    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history) && history.length > 0) {
      // Ambil 6 pesan terakhir untuk efisiensi context window
      const recentHistory = history.slice(-6);
      recentHistory.forEach((h: any) => {
        if (h.role === "user" || h.role === "assistant") {
          conversationMessages.push({ role: h.role, content: h.content });
        }
      });
    }

    // Pesan terbaru siswa
    let studentMessageText = message;
    if (highlightedText && !message.includes(highlightedText)) {
      studentMessageText = `[Menyorot teks: "${highlightedText}"]\n${message}`;
    }
    conversationMessages.push({ role: "user", content: studentMessageText });

    // 5. Panggil LLM via 9Router
    const aiResponse = await call9Router({
      model: ROUTER_MODELS.GEMINI_3_FLASH,
      messages: conversationMessages,
      temperature: 0.2,
    });

    let rawReply = aiResponse.content || "";
    if (!rawReply.trim()) {
      // Heuristic Curriculum Socratic Fallback (Anti-Blank Bubble)
      const snippet = chapterSummary || topicData?.summary || "materi ini";
      rawReply = `Terkait pertanyaanmu mengenai **${topicTitle}**: mari kita bedah prinsip dasarnya terlebih dahulu.\n\n${snippet}\n\nMenurut pemahamanmu, bagaimana bagian ini berkaitan dengan pertanyaan atau langkah yang sedang kamu pelajari?`;
    }

    // 6. Deteksi Checkpoint
    let checkpointPassed = false;
    let noteDraft = "";
    let cleanReply = rawReply;

    const checkpointMatch = rawReply.match(/\[CHECKPOINT_PASSED:\s*([^\]]+)\]/i);
    if (checkpointMatch) {
      checkpointPassed = true;
      noteDraft = checkpointMatch[1].trim();
      cleanReply = rawReply.replace(/\[CHECKPOINT_PASSED:\s*[^\]]+\]/i, "").trim();

      // Simpan memori kognitif siswa di background jika checkpoint berhasil dicapai
      if (studentId) {
        await admin.from("student_cognitive_memories").insert({
          student_id: studentId,
          source: "notebook_session",
          key_insight: `Berhasil menguasai konsep: ${noteDraft}`,
          emotional_state: "confident",
          topic_reference: topicTitle,
          importance_weight: 7,
          is_resolved: true,
        });

        if (studentProfile?.id) {
          await admin
            .from("student_ai_profiles")
            .update({
              total_socratic_sessions: (studentProfile.total_socratic_sessions || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", studentProfile.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      reply: cleanReply,
      checkpointPassed,
      noteDraft,
      topicTitle,
      pageReference: pageRef,
    });
  } catch (err: any) {
    console.error("[TUTOR_CERDAS_API_ERROR]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process tutor session" },
      { status: 500 }
    );
  }
}
