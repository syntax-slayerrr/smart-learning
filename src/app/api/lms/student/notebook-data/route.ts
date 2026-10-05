import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const materialIdParam = searchParams.get("materialId");
    const studentIdParam = searchParams.get("studentId");

    // 1. Dapatkan Material (spesifik atau yang terbaru)
    let materialQuery = admin.from("course_materials").select("*");
    if (materialIdParam) {
      materialQuery = materialQuery.eq("id", materialIdParam);
    } else {
      materialQuery = materialQuery.order("created_at", { ascending: false }).limit(1);
    }

    const { data: materials, error: matErr } = await materialQuery;
    const material = materials && materials.length > 0 ? materials[0] : null;

    if (!material) {
      return NextResponse.json({ success: true, empty: true, message: "Belum ada materi aktif" });
    }

    // 2. Dapatkan Bab / Topik beserta tautan telemetri (Critical Zone)
    const { data: topics } = await admin
      .from("material_topics")
      .select(`
        id,
        topic_title,
        chapter_number,
        page_start,
        page_end,
        summary,
        key_takeaways,
        material_telemetry_links (
          id,
          observed_drop_percentage,
          ai_correlation_notes,
          recorded_at
        )
      `)
      .eq("material_id", material.id)
      .order("chapter_number", { ascending: true });

    // Format topics to DocumentChapter[]
    const formattedChapters = (topics || []).map((t: any) => {
      const telemetry = t.material_telemetry_links && t.material_telemetry_links.length > 0
        ? t.material_telemetry_links[0]
        : null;
      
      const isCritical = Boolean(telemetry && Number(telemetry.observed_drop_percentage) > 30);

      return {
        id: t.id,
        title: `Bab ${t.chapter_number}: ${t.topic_title}`,
        pageStart: t.page_start || 1,
        pageEnd: t.page_end || 10,
        isCriticalZone: isCritical,
        confusionScore: telemetry ? Math.round(Number(telemetry.observed_drop_percentage)) : undefined,
        detectedTimestamp: telemetry ? "Tadi Siang, Sesi Kelas Fisik" : undefined,
        contentSnippet: t.summary || "Rangkuman bab pembelajaran yang diekstrak oleh Smart AI.",
      };
    });

    // 3. Dapatkan Simpul Konsep (Concept Nodes) & Relasi (Concept Edges)
    let nodesQuery = admin.from("concept_nodes").select("*");
    if (material.id) {
      nodesQuery = nodesQuery.eq("material_id", material.id);
    }
    const { data: rawNodes } = await nodesQuery;

    // Dapatkan data mastery siswa jika ada student_id
    let studentId = studentIdParam;
    if (!studentId) {
      const { data: s } = await admin.from("students").select("id").limit(1).maybeSingle();
      studentId = s?.id || null;
    }

    let masteryMap: Record<string, any> = {};
    if (studentId) {
      const { data: masteryRecords } = await admin
        .from("student_concept_mastery")
        .select("*")
        .eq("student_id", studentId);

      if (masteryRecords) {
        masteryRecords.forEach((m: any) => {
          masteryMap[m.concept_id] = m;
        });
      }
    }

    const nodeIds = (rawNodes || []).map((n: any) => n.id);
    let rawEdges: any[] = [];
    if (nodeIds.length > 0) {
      const { data: edges } = await admin
        .from("concept_edges")
        .select("*")
        .in("source_node_id", nodeIds);
      rawEdges = edges || [];
    }

    // Default coordinates layout algorithm for dynamic nodes
    const formattedNodes = (rawNodes || []).map((n: any, idx: number) => {
      const m = masteryMap[n.id];
      const coords = n.coordinates_hint || {};
      
      const defaultX = coords.x || 160 + (idx % 3) * 220;
      const defaultY = coords.y || 120 + Math.floor(idx / 3) * 160;

      return {
        id: n.id,
        label: n.label,
        category: n.category || "concept",
        summary: n.summary || "Simpul konsep pembelajaran kurikulum.",
        difficultyLevel: n.difficulty_level || 1,
        referencePage: n.reference_page || 1,
        x: defaultX,
        y: defaultY,
        masteryScore: m ? Math.round(Number(m.mastery_score)) : 75,
      };
    });

    const formattedEdges = rawEdges.map((e: any) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      relationType: e.relation_type,
      strength: Number(e.strength) || 1.0,
    }));

    // 4. Hitung Sumbu Radar Kesiapan Ujian (Competency Axes)
    const axes = (rawNodes || []).slice(0, 6).map((n: any) => {
      const m = masteryMap[n.id];
      const score = m ? Math.round(Number(m.mastery_score)) : 70;
      const isWeak = score < 65;

      return {
        label: n.label,
        score,
        target: 75,
        category: n.category === "formula" ? "Kalkulasi" : n.category === "methodology" ? "Praktik" : "Teori",
        isWeakSpot: isWeak,
        recommendation: m?.recommended_action || (isWeak ? "Perlu pendalaman latihan soal & simulasi." : "Penguasaan konsep sudah solid."),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        material: {
          id: material.id,
          title: material.title,
          description: material.description,
          fileUrl: material.file_url,
          fileName: material.file_name,
          pageCount: material.page_count,
        },
        chapters: formattedChapters,
        conceptGraph: {
          nodes: formattedNodes,
          edges: formattedEdges,
        },
        examReadiness: {
          axes: axes.length > 0 ? axes : null,
        },
      },
    });
  } catch (error: any) {
    console.error("[API_LMS_STUDENT_NOTEBOOK_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
