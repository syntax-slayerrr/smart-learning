const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

const SUPABASE_URL = "https://wfkdwiiuuhfzirurspvr.supabase.co";
const SERVICE_ROLE_KEY = "sb_secret_wwdRf-sqJTaF0r3a2xXRZQ_aPAV6wWE";
const DB_PASS = "fTawF6pCrL6QTzy7";
const PROJECT_REF = "wfkdwiiuuhfzirurspvr";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pgClient = new Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 6543,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASS,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const SEED_USERS = [
  {
    email: "admin@absensmk.test",
    password: "password123",
    role: "admin",
    full_name: "Administrator Utama",
  },
  {
    email: "guru.matematika@absensmk.test",
    password: "password123",
    role: "teacher",
    full_name: "Budi Santoso, S.Pd",
    nip: "198501012010011001",
  },
  {
    email: "guru.bahasa@absensmk.test",
    password: "password123",
    role: "teacher",
    full_name: "Siti Rahayu, M.Pd",
    nip: "199002152015022001",
  },
  {
    email: "siswa.andi@absensmk.test",
    password: "password123",
    role: "student",
    full_name: "Andi Pratama",
    nis: "20250001",
    className: "X RPL 1",
  },
  {
    email: "siswa.budi@absensmk.test",
    password: "password123",
    role: "student",
    full_name: "Budi Setiawan",
    nis: "20250002",
    className: "X RPL 1",
  },
  {
    email: "siswa.citra@absensmk.test",
    password: "password123",
    role: "student",
    full_name: "Citra Dewi",
    nis: "20250003",
    className: "XI RPL 1",
  },
  {
    email: "ortu.andi@absensmk.test",
    password: "password123",
    role: "parent",
    full_name: "Bapak Pratama",
    phone_wa: "6281234567890",
    studentEmail: "siswa.andi@absensmk.test",
    relationship: "ayah",
  },
  {
    email: "ortu.budi@absensmk.test",
    password: "password123",
    role: "parent",
    full_name: "Ibu Setiawan",
    phone_wa: "6281234567891",
    studentEmail: "siswa.budi@absensmk.test",
    relationship: "ibu",
  },
];

async function seed() {
  console.log("=================================================");
  console.log("[*] SEEDING COMPLETE MULTI-ROLE TEST ACCOUNTS");
  console.log("=================================================");

  const createdAuthUsers = {};

  // 1. Create auth users via Supabase Admin API
  for (const u of SEED_USERS) {
    console.log(`[+] Creating auth user: ${u.email} (${u.role})...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        full_name: u.full_name,
        role: u.role,
      },
    });

    if (error) {
      if (error.message.includes("already registered") || error.code === "email_exists") {
        console.log(`    (!) User already exists, fetching user ID...`);
        const { data: list } = await supabase.auth.admin.listUsers();
        const found = list.users.find((x) => x.email === u.email);
        if (found) createdAuthUsers[u.email] = found.id;
      } else {
        console.error(`    (-) Error creating ${u.email}:`, error.message);
      }
    } else {
      console.log(`    (✓) Created successfully. ID: ${data.user.id}`);
      createdAuthUsers[u.email] = data.user.id;
    }
  }

  // 2. Connect to Postgres to populate relational role tables
  console.log("\n[*] Connecting to PostgreSQL pooler to seed relational records...");
  await pgClient.connect();

  // Ensure profiles have proper role and full_name
  for (const u of SEED_USERS) {
    const userId = createdAuthUsers[u.email];
    if (userId) {
      await pgClient.query(
        `INSERT INTO profiles (id, email, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET full_name = $3, role = $4;`,
        [userId, u.email, u.full_name, u.role]
      );
    }
  }

  // 3. Subjects
  console.log("[+] Seeding subjects...");
  await pgClient.query(`
    INSERT INTO subjects (id, name, code)
    VALUES 
      (gen_random_uuid(), 'Matematika', 'MAT'),
      (gen_random_uuid(), 'Bahasa Indonesia', 'BIN'),
      (gen_random_uuid(), 'Pemrograman Web (RPL)', 'RPL')
    ON CONFLICT (code) DO NOTHING;
  `);

  const matRes = await pgClient.query(`SELECT id FROM subjects WHERE code = 'MAT' LIMIT 1;`);
  const binRes = await pgClient.query(`SELECT id FROM subjects WHERE code = 'BIN' LIMIT 1;`);
  const matSubjectId = matRes.rows[0]?.id;
  const binSubjectId = binRes.rows[0]?.id;

  // 4. Teachers
  console.log("[+] Seeding teachers...");
  const guruMatId = createdAuthUsers["guru.matematika@absensmk.test"];
  const guruBahasaId = createdAuthUsers["guru.bahasa@absensmk.test"];

  let teacherMatRecordId = null;
  let teacherBahasaRecordId = null;

  if (guruMatId) {
    const res = await pgClient.query(
      `INSERT INTO teachers (id, profile_id, nip)
       VALUES (gen_random_uuid(), $1, '198501012010011001')
       ON CONFLICT (nip) DO UPDATE SET profile_id = $1
       RETURNING id;`,
      [guruMatId]
    );
    teacherMatRecordId = res.rows[0]?.id;
  }

  if (guruBahasaId) {
    const res = await pgClient.query(
      `INSERT INTO teachers (id, profile_id, nip)
       VALUES (gen_random_uuid(), $1, '199002152015022001')
       ON CONFLICT (nip) DO UPDATE SET profile_id = $1
       RETURNING id;`,
      [guruBahasaId]
    );
    teacherBahasaRecordId = res.rows[0]?.id;
  }

  // Teacher Subjects
  if (teacherMatRecordId && matSubjectId) {
    await pgClient.query(`
      INSERT INTO teacher_subjects (teacher_id, subject_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [teacherMatRecordId, matSubjectId]);
  }

  if (teacherBahasaRecordId && binSubjectId) {
    await pgClient.query(`
      INSERT INTO teacher_subjects (teacher_id, subject_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [teacherBahasaRecordId, binSubjectId]);
  }

  // 5. Classes
  console.log("[+] Seeding classes...");
  const class1Res = await pgClient.query(`
    INSERT INTO classes (id, name, grade, academic_year, homeroom_teacher_id)
    VALUES (gen_random_uuid(), 'X RPL 1', '10', '2025/2026', $1)
    RETURNING id;
  `, [teacherMatRecordId]);
  const class1Id = class1Res.rows[0]?.id;

  const class2Res = await pgClient.query(`
    INSERT INTO classes (id, name, grade, academic_year, homeroom_teacher_id)
    VALUES (gen_random_uuid(), 'XI RPL 1', '11', '2025/2026', $1)
    RETURNING id;
  `, [teacherBahasaRecordId]);
  const class2Id = class2Res.rows[0]?.id;

  // 6. Students
  console.log("[+] Seeding students...");
  const studentMap = {};

  const andiUserId = createdAuthUsers["siswa.andi@absensmk.test"];
  if (andiUserId) {
    const s = await pgClient.query(`
      INSERT INTO students (id, profile_id, nis, class_id)
      VALUES (gen_random_uuid(), $1, '20250001', $2)
      ON CONFLICT (nis) DO UPDATE SET class_id = $2
      RETURNING id;
    `, [andiUserId, class1Id]);
    studentMap["siswa.andi@absensmk.test"] = s.rows[0]?.id;
  }

  const budiUserId = createdAuthUsers["siswa.budi@absensmk.test"];
  if (budiUserId) {
    const s = await pgClient.query(`
      INSERT INTO students (id, profile_id, nis, class_id)
      VALUES (gen_random_uuid(), $1, '20250002', $2)
      ON CONFLICT (nis) DO UPDATE SET class_id = $2
      RETURNING id;
    `, [budiUserId, class1Id]);
    studentMap["siswa.budi@absensmk.test"] = s.rows[0]?.id;
  }

  const citraUserId = createdAuthUsers["siswa.citra@absensmk.test"];
  if (citraUserId) {
    const s = await pgClient.query(`
      INSERT INTO students (id, profile_id, nis, class_id)
      VALUES (gen_random_uuid(), $1, '20250003', $2)
      ON CONFLICT (nis) DO UPDATE SET class_id = $2
      RETURNING id;
    `, [citraUserId, class2Id]);
    studentMap["siswa.citra@absensmk.test"] = s.rows[0]?.id;
  }

  // 7. Parents & Student-Parents links
  console.log("[+] Seeding parents and links...");
  const ortuAndiUserId = createdAuthUsers["ortu.andi@absensmk.test"];
  if (ortuAndiUserId && studentMap["siswa.andi@absensmk.test"]) {
    const p = await pgClient.query(`
      INSERT INTO parents (id, profile_id, phone_wa)
      VALUES (gen_random_uuid(), $1, '6281234567890')
      RETURNING id;
    `, [ortuAndiUserId]);
    const parentId = p.rows[0]?.id;
    if (parentId) {
      await pgClient.query(`
        INSERT INTO student_parents (student_id, parent_id, relationship)
        VALUES ($1, $2, 'ayah')
        ON CONFLICT DO NOTHING;
      `, [studentMap["siswa.andi@absensmk.test"], parentId]);
    }
  }

  const ortuBudiUserId = createdAuthUsers["ortu.budi@absensmk.test"];
  if (ortuBudiUserId && studentMap["siswa.budi@absensmk.test"]) {
    const p = await pgClient.query(`
      INSERT INTO parents (id, profile_id, phone_wa)
      VALUES (gen_random_uuid(), $1, '6281234567891')
      RETURNING id;
    `, [ortuBudiUserId]);
    const parentId = p.rows[0]?.id;
    if (parentId) {
      await pgClient.query(`
        INSERT INTO student_parents (student_id, parent_id, relationship)
        VALUES ($1, $2, 'ibu')
        ON CONFLICT DO NOTHING;
      `, [studentMap["siswa.budi@absensmk.test"], parentId]);
    }
  }

  // 8. School settings
  console.log("[+] Updating school_settings...");
  await pgClient.query(`
    UPDATE school_settings
    SET school_name = 'SMK TI Smart Learning',
        address = 'Jl. Mayor Syamsu No. 1, Tarogong Kidul, Garut',
        phone = '0262-123456';
  `);

  await pgClient.end();
  console.log("\n=================================================");
  console.log("✓ ALL ROLES & TEST ACCOUNTS SEEDED SUCCESSFULLY!");
  console.log("=================================================");
}

seed().catch((err) => {
  console.error("FATAL SEED ERROR:", err);
  process.exit(1);
});
