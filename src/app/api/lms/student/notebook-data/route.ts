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

    // Jika tidak ada rawNodes manual di DB untuk materi ini, generate graf dinamis dari material & chapters
    let finalNodes = formattedNodes;
    let finalEdges = formattedEdges;

    if (finalNodes.length === 0) {
      const generatedNodes: any[] = [];
      const generatedEdges: any[] = [];

      // 1. Root Node: Judul Materi Utama
      const rootId = `node-root-${material.id}`;
      generatedNodes.push({
        id: rootId,
        label: material.title.length > 26 ? material.title.slice(0, 23) + "..." : material.title,
        category: "chapter",
        mastery: 85,
        masteryScore: 85,
        page: 1,
        referencePage: 1,
        difficultyLevel: 1,
        connectionsCount: 0,
        summary: material.ai_summary || material.description || `Pondasi materi dan silabus ${material.title}`,
        criticalZone: false,
        coordinates: { x: 380, y: 150 },
        x: 380,
        y: 150,
      });

      // 2. Buat nodes dari formattedChapters
      if (formattedChapters.length > 0) {
        const positions = [
          { x: 160, y: 270 },
          { x: 380, y: 310 },
          { x: 600, y: 270 },
          { x: 240, y: 430 },
          { x: 520, y: 430 },
          { x: 380, y: 510 },
        ];

        formattedChapters.slice(0, 6).forEach((ch: any, idx: number) => {
          const chNodeId = `node-ch-${ch.id || idx}`;
          const pos = positions[idx] || { x: 160 + (idx % 3) * 220, y: 270 + Math.floor(idx / 3) * 150 };
          const categoryType: "chapter" | "concept" | "formula" | "methodology" = ch.isCriticalZone
            ? "formula"
            : idx % 2 === 0
            ? "concept"
            : "methodology";

          generatedNodes.push({
            id: chNodeId,
            label: ch.title.length > 25 ? ch.title.slice(0, 22) + "..." : ch.title,
            category: categoryType,
            mastery: ch.isCriticalZone ? 52 : (75 + (idx * 5) % 20),
            masteryScore: ch.isCriticalZone ? 52 : (75 + (idx * 5) % 20),
            page: ch.pageStart || (idx * 4 + 1),
            referencePage: ch.pageStart || (idx * 4 + 1),
            difficultyLevel: Math.min(5, idx + 2),
            connectionsCount: 0,
            summary: ch.summary || ch.contentSnippet || `Intisari pembahasan ${ch.title}`,
            criticalZone: !!ch.isCriticalZone,
            coordinates: pos,
            x: pos.x,
            y: pos.y,
          });

          // Edge dari root ke chapter
          generatedEdges.push({
            id: `edge-root-${idx}`,
            source: rootId,
            target: chNodeId,
            label: "Bagian Dari",
            relationType: "part_of",
            strength: 1.0,
          });

          // Edge sekuensial antar chapter jika ada
          if (idx > 0) {
            const prevChNodeId = `node-ch-${formattedChapters[idx - 1].id || idx - 1}`;
            generatedEdges.push({
              id: `edge-seq-${idx}`,
              source: prevChNodeId,
              target: chNodeId,
              label: "Prasyarat",
              relationType: "prerequisite_of",
              strength: 0.8,
            });
          }
        });
      } else {
        // Fallback 3 pilar topik langsung dari judul modul aktif
        const fallbackConcepts = [
          {
            title: "Konsep Dasar",
            cat: "concept" as const,
            pos: { x: 180, y: 300 },
            summary: `Konsep dasar dan terminologi fundamental dari ${material.title}`,
          },
          {
            title: "Penerapan & Metode",
            cat: "methodology" as const,
            pos: { x: 380, y: 340 },
            summary: `Metode teknis dan implementasi terapan dari ${material.title}`,
          },
          {
            title: "Analisis & Evaluasi",
            cat: "formula" as const,
            pos: { x: 580, y: 300 },
            summary: `Analisis mendalam dan studi evaluasi pemahaman ${material.title}`,
          },
        ];

        fallbackConcepts.forEach((fc, fIdx) => {
          const fcId = `node-fb-${fIdx}`;
          generatedNodes.push({
            id: fcId,
            label: fc.title,
            category: fc.cat,
            mastery: 75 + fIdx * 5,
            masteryScore: 75 + fIdx * 5,
            page: fIdx * 5 + 1,
            referencePage: fIdx * 5 + 1,
            difficultyLevel: fIdx + 2,
            connectionsCount: 1,
            summary: fc.summary,
            criticalZone: false,
            coordinates: fc.pos,
            x: fc.pos.x,
            y: fc.pos.y,
          });

          generatedEdges.push({
            id: `edge-root-fb-${fIdx}`,
            source: rootId,
            target: fcId,
            label: "Bagian Dari",
            relationType: "part_of",
            strength: 0.9,
          });
        });
      }

      // Hitung koneksi
      const connCounts: Record<string, number> = {};
      generatedEdges.forEach((e) => {
        connCounts[e.source] = (connCounts[e.source] || 0) + 1;
        connCounts[e.target] = (connCounts[e.target] || 0) + 1;
      });
      generatedNodes.forEach((n) => {
        n.connectionsCount = connCounts[n.id] || 1;
      });

      finalNodes = generatedNodes;
      finalEdges = generatedEdges;
    }

    // Format axes untuk Exam Readiness Radar
    const formattedAxes = finalNodes.map((n) => {
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
    } else if (formattedChapters && formattedChapters.length > 0) {
      // Dynamic conceptual questions derived adaptively from active chapter concepts
      quizQuestions = formattedChapters.slice(0, 3).map((ch: any, idx: number) => {
        const concepts = Array.isArray(ch.keyTakeaways) && ch.keyTakeaways.length > 0
          ? ch.keyTakeaways
          : [ch.title, "Penerapan terapan", "Analisis sistem"];
        
        const mainConcept = concepts[0] || ch.title;
        const secondConcept = concepts[1] || "Implementasi praktis";
        const thirdConcept = concepts[2] || "Optimasi & evaluasi";

        const questionsPool = [
          {
            q: `Dalam pembahasan "${ch.title}", apa peranan mendasar dari konsep "${mainConcept}"?`,
            correct: `Sebagai landasan konseptual dalam memahami prinsip kerja ${ch.title}`,
            distractors: [
              `Menggantikan seluruh dependensi infrastruktur dasar secara permanen`,
              `Menghapus proses verifikasi data untuk mempercepat siklus kerja`,
              `Hanya digunakan sebagai protokol cadangan saat terjadi kegagalan jaringan`,
            ],
            explanation: `Konsep "${mainConcept}" merupakan elemen inti pada bab "${ch.title}" untuk menjamin pemahaman prinsip dan alur kerja yang benar.`,
          },
          {
            q: `Bagaimana keterkaitan fungsional antara "${mainConcept}" dan "${secondConcept}" dalam materi ini?`,
            correct: `Keduanya saling melengkapi dalam membentuk arsitektur dan metodologi solusi yang kokoh`,
            distractors: [
              `Kedua konsep bersifat mutually exclusive dan tidak dapat diterapkan bersamaan`,
              `"${secondConcept}" meniadakan kebutuhan akan pemahaman "${mainConcept}"`,
              `Hanya berlaku pada sistem monolitik generasi lama`,
            ],
            explanation: `Penerapan "${mainConcept}" dan "${secondConcept}" dirancang terintegrasi guna memberikan pemahaman sistematis.`,
          },
          {
            q: `Faktor kunci apa yang harus diperhatikan saat menguji implementasi "${thirdConcept}" pada bab ini?`,
            correct: `Kesesuaian parameter masukan, ketepatan logika komputasi, dan efisiensi keluaran sistem`,
            distractors: [
              `Jumlah baris komentar dalam berkas konfigurasi`,
              `Penggunaan memori acak tanpa batasan kuota prosesor`,
              `Menonaktifkan seluruh mekanisme logging keamanan`,
            ],
            explanation: `Validasi implementasi pada "${thirdConcept}" menitikberatkan pada ketepatan kalkulasi, parameter terstandar, dan performa keluaran.`,
          },
        ];

        const template = questionsPool[idx % questionsPool.length];
        const correctTargetIndex = (idx * 2 + 1) % 4; // Variasi posisi jawaban (1, 3, 1) tidak selalu D
        
        const options = [...template.distractors];
        options.splice(correctTargetIndex, 0, template.correct);

        return {
          id: idx + 1,
          question: template.q,
          options,
          correctIndex: correctTargetIndex,
          explanation: template.explanation,
        };
      });
    } else {
      quizQuestions = [
        {
          id: 1,
          question: `Apa sasaran pemahaman utama dari modul "${material.title}"?`,
          options: [
            `Penguasaan konsep fundamental dan kemampuan analisis terapan`,
            `Menghafal istilah tanpa memahami alur implementasi`,
            `Mengabaikan silabus kurikulum resmi`,
            `Hanya mencatat ringkasan tanpa latihan mandiri`,
          ],
          correctIndex: 0,
          explanation: `Modul "${material.title}" bertujuan membangun kompetensi konseptual dan keterampilan praktis siswa.`,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        subjects: formattedSubjects,
        material: {
          id: material.id,
          title: material.title,
          description: material.description,
          aiSummary: material.ai_summary || material.description,
          fileUrl: material.file_url,
          fileName: material.file_name,
          pageCount: material.page_count || 32,
          subjectId: material.subject_id,
          subjectName: material.subjects?.name || "Modul Pembelajaran",
        },
        chapters: formattedChapters,
        conceptGraph: {
          nodes: finalNodes,
          edges: finalEdges,
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
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
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
