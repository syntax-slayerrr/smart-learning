import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const materialIdParam = searchParams.get("materialId");
    const studentIdParam = searchParams.get("studentId");
    const validStudentId = (studentIdParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentIdParam))
      ? studentIdParam
      : "51d15a3b-f681-425d-81a9-ca177b8f77ce";

    // 1. Ambil materi aktif
    let material: any = null;
    if (materialIdParam) {
      const { data } = await admin
        .from("course_materials")
        .select("*, subjects(name, code)")
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
          .select("*, subjects(name, code)")
          .eq("id", targetId)
          .single();
        material = data;
      }
    }

    if (!material) {
      const { data } = await admin
        .from("course_materials")
        .select("*, subjects(name, code)")
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
        pageStart: t.page_start || 1,
        pageEnd: t.page_end || 10,
        pages: `Halaman ${t.page_start || 1} - ${t.page_end || 10}`,
        summary: t.description || "",
        contentSnippet: t.content_snippet || t.description || "",
        keyTakeaways: Array.isArray(t.key_concepts) ? t.key_concepts : [],
        isCriticalZone: isCritical,
        criticalZoneDrop: isCritical ? dropPct : undefined,
        confusionScore: dropPct,
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
    const formattedNodes = (rawNodes || []).map((n: any, idx: number) => {
      const mastery = masteryMap[n.id];
      const score = mastery ? Math.round(Number(mastery.mastery_score)) : 70;
      
      let categoryType: "chapter" | "concept" | "formula" | "methodology" = "concept";
      if (n.category === "critical_zone") categoryType = "formula";
      else if (n.category === "advanced") categoryType = "methodology";
      else if (n.category === "core") categoryType = "concept";

      // Default safe visual coordinates jika tidak ada hint
      const defaultX = n.coordinates_hint?.x ?? (180 + ((idx % 3) * 240));
      const defaultY = n.coordinates_hint?.y ?? (140 + Math.floor(idx / 3) * 160);

      return {
        id: n.id,
        label: n.label,
        category: categoryType,
        mastery: score,
        masteryScore: score,
        page: n.reference_page || 1,
        referencePage: n.reference_page || 1,
        difficultyLevel: n.difficulty_level || 3,
        connectionsCount: 0,
        summary: n.summary || "",
        criticalZone: n.category === "critical_zone",
        coordinates: { x: defaultX, y: defaultY },
        x: defaultX,
        y: defaultY,
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

      const isWeak = score < 75;
      const rec = mastery?.recommended_action
        ? `Perlu Penguatan: ${mastery.recommended_action}`
        : isWeak
        ? `Latih konsep "${n.label}" untuk meningkatkan akurasi ujian.`
        : "Pemahaman materi sudah stabil. Pertahankan untuk ujian.";

      return {
        id: n.id,
        label: n.label,
        subject: n.label,
        score,
        target: 75,
        benchmark: 75,
        category: n.category === "formula" ? "Kalkulasi" : n.category === "methodology" ? "Metodologi" : "Teori",
        isWeakSpot: isWeak,
        recommendation: rec,
        status,
        weaknessReason: isWeak ? rec : undefined,
      };
    });

    // Fetch all subjects and course materials for the student shelf
    const { data: allSubjects } = await admin
      .from("subjects")
      .select("id, name, code")
      .order("name");

    const { data: allMaterials } = await admin
      .from("course_materials")
      .select("id, title, description, subject_id, page_count, created_at")
      .order("created_at", { ascending: false });

    // Fetch all assignments from database
    const { data: dbAssignments } = await admin
      .from("assignments")
      .select("id, title, due_date, subject_id, max_score, submission_format, is_oral_defense_required, assignment_submissions(id, student_id, status, grade)")
      .order("due_date", { ascending: true });

    // Format subject shelf data
    const formattedSubjects = (allSubjects || []).map((sub: any) => {
      const subMaterials = (allMaterials || []).filter((m: any) => m.subject_id === sub.id);
      const subAssignments = (dbAssignments || [])
        .filter((a: any) => a.subject_id === sub.id)
        .map((a: any) => {
          const studentSub = (a.assignment_submissions || []).find((s: any) => s.student_id === validStudentId);
          const deadlineDate = a.due_date ? new Date(a.due_date) : null;
          const deadlineStr = deadlineDate
            ? deadlineDate.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " WIB"
            : "Sesuai Jadwal";
          return {
            id: a.id,
            title: a.title,
            deadline: deadlineStr,
            status: studentSub ? (studentSub.status === "graded" ? "graded" : "submitted") : "pending",
            score: studentSub?.grade ?? undefined,
            isDefenseRequired: a.is_oral_defense_required,
          };
        });

      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        materialsCount: subMaterials.length,
        materials: subMaterials.map((m: any, idx: number) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          pageCount: m.page_count || 24,
          readingTime: `${Math.max(10, (m.page_count || 24) * 2)} mnt`,
          status: idx === 0 ? "in_progress" : idx === 1 ? "completed" : "locked",
          topicsCount: idx === 0 ? (formattedChapters.length || 3) : 2,
        })),
        assignments: subAssignments.length > 0 ? subAssignments : [
          {
            id: `task-${sub.id}-1`,
            title: `Tugas Implementasi & Laporan ${sub.name}`,
            deadline: "Minggu ini",
            status: "pending",
          }
        ]
      };
    });

    // Generate real conceptual quiz questions tailored to the active material
    let quizQuestions: any[] = [];
    const matTitleLower = (material.title || "").toLowerCase();
    
    if (matTitleLower.includes("agroscope") || matTitleLower.includes("pertanian")) {
      quizQuestions = [
        {
          id: 1,
          question: "Apa fungsi utama indeks NDVI (Normalized Difference Vegetation Index) dalam arsitektur AgroScope?",
          options: [
            "Menghitung konsumsi bandwidth transmisi sensor IoT di lahan",
            "Mendeteksi tingkat klorofil dan anomali kesehatan vegetasi melalui citra multispektral",
            "Mengontrol durasi pengairan pompa air secara mekanis tanpa mikroprosesor",
            "Menyimpan cadangan log telemetri ke server penyimpanan dingin",
          ],
          correctIndex: 1,
          explanation: "NDVI memanfaatkan pantulan cahaya merah dan inframerah-dekat (NIR) untuk mengukur kerapatan biomassa dan tingkat kehijauan tanaman secara presisi.",
        },
        {
          id: 2,
          question: "Protokol transmisi apa yang paling optimal digunakan untuk pengiriman telemetri sensor kelembapan tanah AgroScope dengan daya rendah?",
          options: [
            "MQTT / LoRaWAN",
            "FTP over TLS",
            "BGP Anycast Routing",
            "SNMPv3 Trap Broadcast",
          ],
          correctIndex: 0,
          explanation: "LoRaWAN dan MQTT dirancang untuk konsumsi daya ultra-rendah dan payload data telemetri ringkas di lingkungan pertanian luar ruangan.",
        },
        {
          id: 3,
          question: "Bagaimana model prediktif AI AgroScope memanfaatkan data cuaca historis dan sensor kelembapan?",
          options: [
            "Mematikan seluruh sistem node saat terjadi perubahan suhu 1 derajat Celsius",
            "Mengestimasi kebutuhan irigasi dan rekomendasi waktu pemupukan presisi untuk mencegah pencucian nutrisi",
            "Mengganti seluruh firmware sensor secara otomatis tanpa izin pengguna",
            "Menghapus riwayat telemetri untuk menghemat kapasitas basis data",
          ],
          correctIndex: 1,
          explanation: "AI prediktif memadukan kelembapan tanah aktual dan forecast cuaca guna menentukan jadwal irigasi dan pupuk yang paling efektif bagi imbal hasil panen.",
        },
      ];
    } else if (matTitleLower.includes("himatif") || matTitleLower.includes("grafik") || matTitleLower.includes("grafika")) {
      quizQuestions = [
        {
          id: 1,
          question: "Mengapa Algoritma Bresenham jauh lebih efisien dibandingkan DDA dalam rasterisasi garis?",
          options: [
            "Hanya menggunakan aritmatika penjumlahan dan pengurangan integer tanpa operasi floating point",
            "Membutuhkan GPU khusus dengan dukungan shader presisi ganda",
            "Menghitung koordinat piksel secara acak (probabilistik)",
            "Mengabaikan kemiringan gradien garis (m)",
          ],
          correctIndex: 0,
          explanation: "Bresenham mengeliminasi pembagian dan perkalian pecahan dengan memanfaatkan variabel keputusan bilangan bulat inkremental.",
        },
        {
          id: 2,
          question: "Dalam transformasi geometri 2D, mengapa sistem koordinat homogen 3x3 digunakan?",
          options: [
            "Untuk mempercepat waktu kompilasi berkas OpenGL",
            "Memungkinkan operasi translasi, rotasi, dan penskalaan digabungkan dalam satu perkalian matriks terpadu",
            "Mengubah format piksel RGB menjadi format grayscale",
            "Membatasi resolusi kanvas grafis agar tidak overflow",
          ],
          correctIndex: 1,
          explanation: "Koordinat homogen menyatukan operasi translasi (yang aslinya penjumlahan vektor) menjadi perkalian matriks, sehingga seluruh transformasi dapat dikomposisikan.",
        },
        {
          id: 3,
          question: "Pada algoritma Cohen-Sutherland, bagaimana garis dapat langsung ditolak (trivial reject) tanpa perhitungan potong?",
          options: [
            "Jika hasil operasi bitwise AND antara outcode kedua titik ujung bernilai bukan nol (≠ 0000)",
            "Jika hasil operasi bitwise OR bernilai 1111",
            "Jika gradien garis bernilai negatif tak hingga",
            "Jika kedua titik berada tepat pada garis batas viewport",
          ],
          correctIndex: 0,
          explanation: "Jika bitwise AND outcode titik awal dan akhir ≠ 0, berarti kedua titik berada di sisi luar viewport yang sama (misal sama-sama di atas atau sama-sama di kiri), sehingga garis pasti berada di luar area pandang.",
        },
      ];
    } else {
      // Dynamic questions derived from active topics
      quizQuestions = (formattedChapters || []).slice(0, 3).map((ch: any, idx: number) => ({
        id: idx + 1,
        question: `Berdasarkan bab "${ch.title}", apa fokus utama analisis yang dipelajari?`,
        options: [
          `Pemahaman mendalam mengenai ${ch.summary || ch.title}`,
          `Penyelesaian kasus implementasi terapan pada bab ${ch.title}`,
          `Evaluasi kritis dan perbandingan metodologi`,
          `Semua poin analisis di atas tercakup dalam bab ini`,
        ],
        correctIndex: 3,
        explanation: `Bab "${ch.title}" membahas konsep fundamental hingga penerapan praktis sesuai silabus pembelajaran.`,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        subjects: formattedSubjects,
        material: {
          id: material.id,
          title: material.title,
          description: material.description,
          fileUrl: material.file_url,
          fileName: material.file_name,
          pageCount: material.page_count || 32,
          subjectId: material.subject_id,
          subjectName: material.subjects?.name || "Jaringan Komputer",
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
        quizQuestions,
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
