import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const materialIdParam = searchParams.get("materialId");

    // 1. Ambil materi aktif
    let material: any = null;
    if (materialIdParam) {
      const { data } = await admin
        .from("course_materials")
        .select("*")
        .eq("id", materialIdParam)
        .single();
      material = data;
    }

    if (!material) {
      // Prioritaskan materi yang memiliki topik dan graf konsep
      const { data: materialsWithTopics } = await admin
        .from("material_topics")
        .select("material_id")
        .limit(1);

      if (materialsWithTopics && materialsWithTopics.length > 0) {
        const targetId = materialsWithTopics[0].material_id;
        const { data } = await admin
          .from("course_materials")
          .select("*")
          .eq("id", targetId)
          .single();
        material = data;
      }
    }

    // Fallback jika belum ada yang bertopik, ambil materi terakhir
    if (!material) {
      const { data } = await admin
        .from("course_materials")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      material = data && data.length > 0 ? data[0] : null;
    }

    if (!material) {
      return NextResponse.json({
        success: true,
        empty: true,
        message: "Belum ada modul aktif.",
      });
    }

    // 2. Ambil topik materi (material_topics)
    const { data: topics } = await admin
      .from("material_topics")
      .select("*")
      .eq("material_id", material.id)
      .order("topic_order", { ascending: true });

    const formattedChapters = (topics || []).map((t: any) => {
      const isCritical = Boolean(t.is_critical_zone);
      const dropPct = t.avg_confusion_score ? Math.round(Number(t.avg_confusion_score)) : 42;
      return {
        id: t.id,
        chapterNumber: t.topic_order || 1,
        title: t.title || "Topik Pembelajaran",
        pages: `Halaman ${t.page_start || 1} - ${t.page_end || 10}`,
        summary: t.description || "",
        keyTakeaways: Array.isArray(t.key_concepts) ? t.key_concepts : [],
        criticalZoneDrop: isCritical ? dropPct : undefined,
        criticalZoneLabel: isCritical
          ? `⚠️ ZONA KRITIS KELAS: Kamera AI mendeteksi ${dropPct}% siswa kebingungan di topik ini.`
          : undefined,
      };
    });

    // 3. Ambil graf konsep (concept_nodes)
    const { data: rawNodes } = await admin
      .from("concept_nodes")
      .select("*")
      .eq("material_id", material.id)
      .order("difficulty_level", { ascending: true });

    const nodeIds = (rawNodes || []).map((n: any) => n.id);

    // 4. Ambil edges
    let rawEdges: any[] = [];
    if (nodeIds.length > 0) {
      const { data: edges } = await admin
        .from("concept_edges")
        .select("*")
        .in("source_node_id", nodeIds);
      rawEdges = edges || [];
    }

    // 5. Ambil student concept mastery
    let masteryMap: Record<string, any> = {};
    if (nodeIds.length > 0) {
      const { data: masteryRecords } = await admin
        .from("student_concept_mastery")
        .select("*")
        .in("concept_id", nodeIds);

      if (masteryRecords) {
        masteryRecords.forEach((m: any) => {
          masteryMap[m.concept_id] = m;
        });
      }
    }

    // Format nodes untuk Dynamic Interactive Concept Graph
    const formattedNodes = (rawNodes || []).map((n: any) => {
      const mastery = masteryMap[n.id];
      const score = mastery ? Math.round(Number(mastery.mastery_score)) : 70;
      
      let categoryType: "chapter" | "concept" | "formula" | "methodology" = "concept";
      if (n.category === "critical_zone") categoryType = "formula";
      else if (n.category === "advanced") categoryType = "methodology";
      else if (n.category === "core") categoryType = "concept";

      return {
        id: n.id,
        label: n.label,
        category: categoryType,
        mastery: score,
        page: n.reference_page || 1,
        connectionsCount: 0,
        summary: n.summary || "",
        criticalZone: n.category === "critical_zone",
        coordinates: n.coordinates_hint || undefined,
      };
    });

    // Hitung jumlah koneksi per node
    const connectionCounts: Record<string, number> = {};
    rawEdges.forEach((e: any) => {
      connectionCounts[e.source_node_id] = (connectionCounts[e.source_node_id] || 0) + 1;
      connectionCounts[e.target_node_id] = (connectionCounts[e.target_node_id] || 0) + 1;
    });

    formattedNodes.forEach((node) => {
      node.connectionsCount = connectionCounts[node.id] || 1;
    });

    // Format edges
    const formattedEdges = rawEdges.map((e: any) => {
      let label = "Terkait";
      if (e.relation_type === "prerequisite_of") label = "Prasyarat";
      else if (e.relation_type === "part_of") label = "Bagian Dari";
      else if (e.relation_type === "applies_to") label = "Diterapkan Di";
      else if (e.relation_type === "relates_to") label = "Korelasi";

      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label,
        relationType: e.relation_type,
        strength: Number(e.strength) || 1,
      };
    });

    // Format axes untuk Exam Readiness Radar
    const formattedAxes = formattedNodes.map((n) => {
      const score = n.mastery;
      const mastery = masteryMap[n.id];
      let status: "mastered" | "needs_practice" | "critical_review" = "mastered";
      if (score < 60) status = "critical_review";
      else if (score < 80) status = "needs_practice";

      return {
        subject: n.label,
        score,
        benchmark: 75,
        status,
        weaknessReason: mastery?.needs_remediation
          ? `Perlu Perbaikan: ${mastery.recommended_action || "Latihan soal terarah"}`
          : undefined,
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
          pageCount: material.page_count || 32,
        },
        chapters: formattedChapters,
        conceptGraph: {
          nodes: formattedNodes,
          edges: formattedEdges,
        },
        examReadiness: {
          axes: formattedAxes,
          averageScore: formattedAxes.length
            ? Math.round(
                formattedAxes.reduce((acc, curr) => acc + curr.score, 0) /
                  formattedAxes.length
              )
            : 70,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/lms/student/notebook-data error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data notebook mahasiswa",
      },
      { status: 500 }
    );
  }
}
