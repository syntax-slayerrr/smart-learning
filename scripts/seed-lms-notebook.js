const { Client } = require("pg");

const config = {
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.wfkdwiiuuhfzirurspvr",
  password: "fTawF6pCrL6QTzy7",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
};

async function seedLMS() {
  const client = new Client(config);
  await client.connect();
  console.log("[*] Terhubung ke Supabase PostgreSQL...");

  try {
    // 1. Dapatkan Class, Teacher, Subject, Student
    let subRes = await client.query("SELECT id FROM subjects WHERE code = 'TKJ' OR name ILIKE '%Jaringan%' LIMIT 1");
    let subjectId;
    if (subRes.rows.length === 0) {
      const insSub = await client.query(`
        INSERT INTO subjects (name, code)
        VALUES ('Jaringan Komputer & Subnetting', 'TKJ')
        RETURNING id;
      `);
      subjectId = insSub.rows[0].id;
      console.log("[+] Subject dibuat: Jaringan Komputer & Subnetting (TKJ)");
    } else {
      subjectId = subRes.rows[0].id;
    }

    const classRes = await client.query("SELECT id FROM classes LIMIT 1");
    const teacherRes = await client.query("SELECT id FROM teachers LIMIT 1");
    const studentRes = await client.query("SELECT id FROM students LIMIT 1");

    const classId = classRes.rows[0]?.id;
    const teacherId = teacherRes.rows[0]?.id;
    const studentId = studentRes.rows[0]?.id;

    console.log(`[*] Menggunakan Class ID: ${classId}, Teacher ID: ${teacherId}, Student ID: ${studentId}`);

    // 2. Insert Course Material
    const matCheck = await client.query("SELECT id FROM course_materials WHERE title ILIKE '%Subnetting%' LIMIT 1");
    let materialId;
    if (matCheck.rows.length === 0) {
      const matIns = await client.query(`
        INSERT INTO course_materials (
          subject_id, teacher_id, class_id, title, description,
          file_url, file_name, file_type, file_size_bytes, page_count,
          ai_summary, ai_status
        ) VALUES (
          $1, $2, $3,
          'Modul Praktis Subnetting IPv4 & VLSM Jaringan Komputer',
          'Panduan komprehensif penghitungan subnet mask, prefix CIDR /24 hingga /30, dan desain segmentasi jaringan kampus.',
          'https://itg.ac.id/materials/Modul_Subnetting_IPv4.pdf',
          'Modul_Subnetting_IPv4.pdf',
          'application/pdf',
          2457600,
          32,
          'Modul ini mencakup arsitektur pengalamatan IPv4, kelas IP, konsep dasar subnet mask, algoritma penghitungan blok subnet, host valid, broadcast address, serta studi kasus implementasi VLSM pada topologi bertingkat.',
          'ready'
        ) RETURNING id;
      `, [subjectId, teacherId, classId]);
      materialId = matIns.rows[0].id;
      console.log(`[+] Modul Materi dibuat: ID ${materialId}`);
    } else {
      materialId = matCheck.rows[0].id;
      console.log(`[*] Modul Materi sudah ada: ID ${materialId}`);
    }

    // 3. Insert Material Topics (Bab 1, Bab 2 (Critical Zone), Bab 3)
    await client.query("DELETE FROM material_topics WHERE material_id = $1", [materialId]);
    
    const topic1 = await client.query(`
      INSERT INTO material_topics (
        material_id, topic_order, title, description, page_start, page_end,
        key_concepts, avg_confusion_score, inattention_event_count, is_critical_zone, ai_socratic_prompt
      ) VALUES (
        $1, 1,
        'Pengantar Pengalamatan IPv4 & Struktur Biner',
        'Struktur 32-bit alamat IP, oktet desimal titik, konversi biner ke desimal, dan pembagian kelas (Class A, B, C).',
        1, 8,
        $2::jsonb,
        12.4, 3, false,
        'Bila siswa bertanya tentang biner, ajak mereka memvisualisasikan 8 bit sebagai saklar lampu bernilai 128, 64, 32, 16, 8, 4, 2, 1.'
      ) RETURNING id;
    `, [materialId, JSON.stringify(['32-bit Address', 'IPv4 Classes', 'Binary Conversion', 'Default Mask'])]);

    const topic2 = await client.query(`
      INSERT INTO material_topics (
        material_id, topic_order, title, description, page_start, page_end,
        key_concepts, avg_confusion_score, inattention_event_count, is_critical_zone, ai_socratic_prompt
      ) VALUES (
        $1, 2,
        'Teknik Subnetting CIDR /25 s/d /30 & Penentuan Blok',
        'Peminjaman bit host, penghitungan jumlah subnet (2^x), jumlah host per subnet (2^y - 2), dan penentuan Network & Broadcast address.',
        9, 20,
        $2::jsonb,
        42.8, 14, true,
        '⚠️ ZONA KRITIS KELAS: Kamera AI mendeteksi 42% siswa bingung pada rumus 2^y - 2 dan penentuan alamat broadcast. Bimbing bertahap dengan analogi kavling perumahan.'
      ) RETURNING id;
    `, [materialId, JSON.stringify(['CIDR Notation', 'Magic Number 256', 'Subnet Mask Borrowing', 'Broadcast ID', 'Usable Hosts'])]);

    const topic3 = await client.query(`
      INSERT INTO material_topics (
        material_id, topic_order, title, description, page_start, page_end,
        key_concepts, avg_confusion_score, inattention_event_count, is_critical_zone, ai_socratic_prompt
      ) VALUES (
        $1, 3,
        'Implementasi VLSM pada Topologi Router Bertingkat',
        'Alokasi subnet dengan kebutuhan host berbeda-beda dari kebutuhan terbesar ke terkecil untuk efisiensi IP address.',
        21, 32,
        $2::jsonb,
        28.5, 7, false,
        'Tantang siswa mengurutkan kebutuhan host dari yang terbesar terlebih dahulu sebelum memotong subnet.'
      ) RETURNING id;
    `, [materialId, JSON.stringify(['VLSM Hierarchy', 'Router Point-to-Point /30', 'Prefix Optimization', 'Route Summarization'])]);

    console.log("[+] 3 Topics dibuat (Bab 2 ditandai sebagai ZONA KRITIS)");

    // 4. Hubungkan Telemetry Correlation Link
    await client.query("DELETE FROM material_telemetry_links WHERE topic_id = $1", [topic2.rows[0].id]);
    await client.query(`
      INSERT INTO material_telemetry_links (
        session_id, topic_id, observed_drop_percentage, ai_correlation_notes
      ) VALUES (
        '00000000-0000-0000-0000-000000000001', $1, 42.8,
        'Closed-Loop CV Intelligence: Kamera mendeteksi penurunan atensi 42.8% dan ekspresi kebingungan siswa serentak pada menit 24-38 saat penjelasan peminjaman bit subnet mask.'
      );
    `, [topic2.rows[0].id]);
    console.log("[+] Telemetry Correlation Link di-link ke Bab 2");

    // 5. Concept Nodes & Edges (Peta Konsep)
    await client.query("DELETE FROM concept_edges WHERE source_node_id IN (SELECT id FROM concept_nodes WHERE material_id = $1)", [materialId]);
    await client.query("DELETE FROM concept_nodes WHERE material_id = $1", [materialId]);

    const nodesData = [
      { label: "IPv4 Addressing", cat: "core", sum: "Pondasi pengalamatan logis 32-bit.", diff: 1, page: 2, coord: '{"x": 100, "y": 200}' },
      { label: "CIDR Prefix", cat: "core", sum: "Notasi garis miring (slash notation) pengganti classful.", diff: 2, page: 10, coord: '{"x": 260, "y": 140}' },
      { label: "Subnet Mask", cat: "core", sum: "Penanda pemisah porsi network dan host.", diff: 2, page: 12, coord: '{"x": 260, "y": 260}' },
      { label: "Magic Number (256-Mask)", cat: "critical_zone", sum: "Kunci interval blok subnet untuk menentukan lompatan network ID.", diff: 3, page: 15, coord: '{"x": 440, "y": 140}' },
      { label: "Broadcast & Usable Host", cat: "critical_zone", sum: "Penghitungan 2^y - 2 host yang dapat dipasang ke perangkat.", diff: 3, page: 17, coord: '{"x": 440, "y": 260}' },
      { label: "VLSM Hierarchy", cat: "advanced", sum: "Segmentasi adaptif multi-ukuran menghindari pemborosan alokasi IP.", diff: 4, page: 23, coord: '{"x": 620, "y": 200}' }
    ];

    const nodeIds = [];
    for (const nd of nodesData) {
      const insN = await client.query(`
        INSERT INTO concept_nodes (
          subject_id, material_id, label, category, summary, difficulty_level, reference_page, coordinates_hint
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id;
      `, [subjectId, materialId, nd.label, nd.cat, nd.sum, nd.diff, nd.page, nd.coord]);
      nodeIds.push(insN.rows[0].id);
    }

    // Connect Edges
    const edges = [
      { src: nodeIds[0], tgt: nodeIds[1], rel: "prerequisite_of" },
      { src: nodeIds[0], tgt: nodeIds[2], rel: "prerequisite_of" },
      { src: nodeIds[1], tgt: nodeIds[3], rel: "part_of" },
      { src: nodeIds[2], tgt: nodeIds[4], rel: "applies_to" },
      { src: nodeIds[3], tgt: nodeIds[4], rel: "relates_to" },
      { src: nodeIds[4], tgt: nodeIds[5], rel: "applies_to" },
    ];

    for (const ed of edges) {
      await client.query(`
        INSERT INTO concept_edges (source_node_id, target_node_id, relation_type, strength)
        VALUES ($1, $2, $3, 1.0);
      `, [ed.src, ed.tgt, ed.rel]);
    }
    console.log(`[+] 6 Concept Nodes dan ${edges.length} Edges terbentuk.`);

    // 6. Student Concept Mastery (Radar Kesiapan Ujian)
    if (studentId) {
      await client.query("DELETE FROM student_concept_mastery WHERE student_id = $1", [studentId]);
      const masteryData = [
        { cId: nodeIds[0], score: 92, needRem: false, act: "Siap Ujian" },
        { cId: nodeIds[1], score: 85, needRem: false, act: "Latihan Ringan" },
        { cId: nodeIds[2], score: 78, needRem: false, act: "Review Bab 2" },
        { cId: nodeIds[3], score: 48, needRem: true, act: "Latih Rumus Magic Number" },
        { cId: nodeIds[4], score: 55, needRem: true, act: "Review Formula Broadcast Host" },
        { cId: nodeIds[5], score: 62, needRem: false, act: "Review Studi Kasus VLSM" },
      ];

      for (const m of masteryData) {
        await client.query(`
          INSERT INTO student_concept_mastery (
            student_id, concept_id, mastery_score, practice_count, needs_remediation, recommended_action
          ) VALUES ($1, $2, $3, 3, $4, $5);
        `, [studentId, m.cId, m.score, m.needRem, m.act]);
      }
      console.log("[+] Data Student Concept Mastery (Radar Kesiapan Ujian) terisi.");
    }

    // 7. Assignment & Submissions dengan Oral Defense
    const assignCheck = await client.query("SELECT id FROM assignments WHERE title ILIKE '%Subnetting%' LIMIT 1");
    let assignId;
    if (assignCheck.rows.length === 0) {
      const insA = await client.query(`
        INSERT INTO assignments (
          subject_id, teacher_id, class_id, material_id, title,
          instructions, due_date, max_score, submission_format, is_oral_defense_required
        ) VALUES (
          $1, $2, $3, $4,
          'Studi Kasus: Perancangan Subnetting & Alokasi IP Lab Komputer',
          'Hitung alokasi IP prefix /27 dan /28 untuk 3 ruangan laboratorium. Buat tabel subnet yang mencakup Network ID, First Host, Last Host, dan Broadcast ID. Lengkapi laporan analisis singkat.',
          NOW() + INTERVAL '3 days',
          100, 'pdf', true
        ) RETURNING id;
      `, [subjectId, teacherId, classId, materialId]);
      assignId = insA.rows[0].id;
      console.log(`[+] Assignment dibuat: ID ${assignId}`);
    } else {
      assignId = assignCheck.rows[0].id;
    }

    console.log("\n=================================================");
    console.log("[SUCCESS] SEED DATA SMART AI LMS SELESAI 100%!");
    console.log("=================================================");
  } catch (err) {
    console.error("[FATAL SEED ERROR]", err);
  } finally {
    await client.end();
  }
}

seedLMS();
