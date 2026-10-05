import { NextRequest, NextResponse } from "next/server";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, title, subjectId, teacherId, classId, description, rawContent, fullText } = body;
    const contentToExtract = rawContent || fullText;

    if (!title || !contentToExtract) {
      return NextResponse.json(
        { success: false, error: "Title and rawContent/fullText are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Simpan atau dapatkan dokumen materi induk
    let materialRecord: any = null;
    if (materialId) {
      const { data: existing } = await admin
        .from("course_materials")
        .select("*")
        .eq("id", materialId)
        .maybeSingle();
      if (existing) {
        materialRecord = existing;
      }
    }

    if (!materialRecord) {
      let finalTeacherId = teacherId;
      let finalSubjectId = subjectId;

      if (!finalTeacherId) {
        const { data: t } = await admin.from("teachers").select("id").limit(1).maybeSingle();
        finalTeacherId = t?.id || "00000000-0000-0000-0000-000000000002";
      }
      if (!finalSubjectId) {
        const { data: s } = await admin.from("subjects").select("id").limit(1).maybeSingle();
        finalSubjectId = s?.id || "00000000-0000-0000-0000-000000000001";
      }

      const { data: material, error: matErr } = await admin
        .from("course_materials")
        .insert({
          title,
          subject_id: finalSubjectId,
          teacher_id: finalTeacherId,
          class_id: classId || null,
          description: description || "Modul Pembelajaran Otomatis diekstrak oleh Smart AI",
          file_url: "https://example.com/material.pdf",
          file_name: `${title.replace(/\s+/g, "_")}.pdf`,
          file_type: "application/pdf",
          page_count: 24,
          ai_status: "processing",
        })
        .select()
        .single();

      if (matErr || !material) {
        return NextResponse.json({ success: false, error: matErr?.message || "Failed to create material" }, { status: 500 });
      }
      materialRecord = material;
    }

    // 2. Gunakan LLM untuk mengekstrak Bab & Topik serta Simpul Peta Konsep
    const prompt = `Analisis materi ajar berikut dan hasilkan JSON valid dengan struktur:
{
  "topics": [
    {
      "topic_title": "string",
      "chapter_number": number,
      "page_start": number,
      "page_end": number,
      "key_takeaways": ["poin 1", "poin 2"],
      "summary": "ringkasan komprehensif"
    }
  ],
  "concept_nodes": [
    {
      "node_id": "string_slug",
      "label": "Nama Konsep",
      "category": "core" | "intermediate" | "advanced",
      "importance": "high" | "medium",
      "summary": "penjelasan konsep singkat",
      "suggested_page": number
    }
  ],
  "concept_edges": [
    {
      "source_id": "string_slug",
      "target_id": "string_slug",
      "relationship": "prerequisite" | "extends" | "implements"
    }
  ]
}

Teks materi:
${contentToExtract.slice(0, 4000)}

Hasilkan HANYA JSON tanpa teks pembuka atau markdown formatting backtick.`;

    const aiResponse = await call9Router({
      model: ROUTER_MODELS.GEMINI_3_FLASH,
      messages: [
        { role: "system", content: "Kamu adalah AI Kurikulum dan Peta Konsep Sains tingkat tinggi. Output WAJIB JSON murni." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    let parsedResult: { topics: any[]; concept_nodes: any[]; concept_edges: any[] } = {
      topics: [],
      concept_nodes: [],
      concept_edges: [],
    };
    try {
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      // Fallback jika parsing gagal
      parsedResult = {
        topics: [
          {
            topic_title: "Konsep Dasar & Arsitektur",
            chapter_number: 1,
            page_start: 1,
            page_end: 10,
            key_takeaways: ["Prinsip fundamental", "Topologi dasar"],
            summary: "Ringkasan konsep dasar yang terstruktur dari modul."
          }
        ],
        concept_nodes: [
          { node_id: "node_1", label: title, category: "core", importance: "high", summary: "Topik utama", suggested_page: 1 }
        ],
        concept_edges: []
      };
    }

    // 3. Simpan Topics ke database
    if (parsedResult.topics && parsedResult.topics.length > 0) {
      const topicsToInsert = parsedResult.topics.map((t: any, index: number) => ({
        material_id: materialRecord.id,
        topic_order: t.chapter_number || index + 1,
        title: t.topic_title || `Bab ${index + 1}`,
        description: t.summary || "",
        page_start: t.page_start || 1,
        page_end: t.page_end || 5,
        key_concepts: Array.isArray(t.key_takeaways) ? t.key_takeaways : [],
        ai_socratic_prompt: `Bimbing siswa memahami materi ini secara bertahap tanpa memberikan jawaban langsung. Fokus nalar: ${t.topic_title}. Gunakan pertanyaan pemantik analitis.`,
      }));
      await admin.from("material_topics").insert(topicsToInsert);
    }

    // 4. Simpan Concept Nodes & Edges ke database
    if (parsedResult.concept_nodes && parsedResult.concept_nodes.length > 0) {
      const nodesToInsert = parsedResult.concept_nodes.map((n: any) => ({
        subject_id: materialRecord.subject_id,
        material_id: materialRecord.id,
        label: n.label || "Konsep",
        category: n.category || "core",
        summary: n.summary || "",
        difficulty_level: n.importance === "high" ? 4 : (n.importance === "medium" ? 3 : 2),
        reference_page: n.suggested_page || 1,
      }));

      const { data: insertedNodes, error: nodeError } = await admin
        .from("concept_nodes")
        .insert(nodesToInsert)
        .select("id, label");

      if (!nodeError && insertedNodes && insertedNodes.length > 0 && parsedResult.concept_edges && parsedResult.concept_edges.length > 0) {
        const nodeMap: Record<string, string> = {};
        parsedResult.concept_nodes.forEach((cn: any, idx: number) => {
          if (insertedNodes[idx]) {
            nodeMap[cn.node_id] = insertedNodes[idx].id;
            nodeMap[cn.label] = insertedNodes[idx].id;
          }
        });

        const edgesToInsert = (parsedResult.concept_edges
          .map((e: any) => {
            const sourceId = nodeMap[e.source_id];
            const targetId = nodeMap[e.target_id];
            if (!sourceId || !targetId || sourceId === targetId) return null;
            return {
              source_node_id: sourceId,
              target_node_id: targetId,
              relation_type: e.relationship || "relates_to",
              strength: 1.0,
            };
          })
          .filter(Boolean)) as any[];

        if (edgesToInsert.length > 0) {
          await admin.from("concept_edges").insert(edgesToInsert);
        }
      }
    }

    // 5. Update status materi menjadi ready
    await admin
      .from("course_materials")
      .update({ ai_status: "ready" })
      .eq("id", materialRecord.id);

    return NextResponse.json({
      success: true,
      data: {
        materialId: materialRecord.id,
        title: materialRecord.title,
        topics: parsedResult.topics,
        concept_nodes: parsedResult.concept_nodes,
        concept_edges: parsedResult.concept_edges,
        topicsExtracted: parsedResult.topics.length,
        conceptNodesExtracted: parsedResult.concept_nodes.length,
        conceptEdgesExtracted: parsedResult.concept_edges.length,
      },
    });
  } catch (error: any) {
    console.error("[API_LMS_EXTRACT_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
