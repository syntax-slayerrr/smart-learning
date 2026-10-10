/**
 * ==============================================================================
 * SYNTAX SLAYER SMART LEARNING — DATABASE PURGE & CLEANUP ENGINE
 * ==============================================================================
 * Skrip ini membersihkan seluruh mock/test/seed data dari Supabase:
 * 1. Mengosongkan seluruh tabel relasional & transaksional publik secara dinamis
 *    (telemetri 171k baris, LMS, materi, siswa, guru, kelas, dll).
 * 2. Menghapus akun-akun auth mock (@slayer.test & @absensmk.test).
 * 3. Mempertahankan 1 akun Master Admin (admin@slayer.test / password123).
 * 4. Memperbarui identitas school_settings menjadi "SYNTAX SLAYER SMART LEARNING".
 * ==============================================================================
 */

const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

const SUPABASE_URL = "https://wfkdwiiuuhfzirurspvr.supabase.co";
const SERVICE_ROLE_KEY = "sb_secret_wwdRf-sqJTaF0r3a2xXRZQ_aPAV6wWE";
const DB_PASS = "fTawF6pCrL6QTzy7";
const PROJECT_REF = "wfkdwiiuuhfzirurspvr";

const ADMIN_EMAIL_TO_KEEP = "admin@slayer.test";
const DEFAULT_ADMIN_PASSWORD = "password123";

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

async function cleanMockData() {
  console.log("=================================================");
  console.log(" 🧹 SYNTAX SLAYER — PURGING MOCK DATA FROM SUPABASE");
  console.log("=================================================");

  // 1. Hubungkan ke PostgreSQL Pooler
  console.log("[1/6] Menghubungkan ke PostgreSQL pooler...");
  await pgClient.connect();
  console.log("    (✓) PostgreSQL Pooler terhubung.");

  // 2. Deteksi semua tabel yang ada di skema public
  console.log("\n[2/6] Memindai tabel di skema public...");
  const tableRes = await pgClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const allExistingTables = tableRes.rows.map((r) => r.table_name);
  console.log(`    (✓) Ditemukan ${allExistingTables.length} tabel: ${allExistingTables.join(", ")}`);

  // Filter tabel yang TIDAK boleh di-truncate
  const preservedTables = new Set(["profiles", "school_settings", "schema_migrations"]);
  const tablesToTruncate = allExistingTables.filter((t) => !preservedTables.has(t));

  // 3. Truncate tabel relasi & transaksi dengan CASCADE
  console.log(`\n[3/6] Mengosongkan ${tablesToTruncate.length} tabel dengan TRUNCATE ... CASCADE...`);
  if (tablesToTruncate.length > 0) {
    const truncateSql = `TRUNCATE TABLE ${tablesToTruncate.map((t) => `"${t}"`).join(", ")} CASCADE;`;
    await pgClient.query(truncateSql);
    console.log("    (✓) Seluruh tabel aktivitas, telemetri, dan entitas mock BERHASIL dikosongkan!");
  }

  // 4. Periksa dan siapkan Master Admin di auth.users
  console.log(`\n[4/6] Memeriksa akun Master Admin (${ADMIN_EMAIL_TO_KEEP})...`);
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    throw new Error(`Gagal membaca auth users: ${usersErr.message}`);
  }

  const allUsers = usersData?.users || [];
  let adminUser = allUsers.find((u) => u.email === ADMIN_EMAIL_TO_KEEP);

  if (!adminUser) {
    console.log(`    [+] Membuat akun baru: ${ADMIN_EMAIL_TO_KEEP}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL_TO_KEEP,
      password: DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Slayer Admin Utama",
        role: "admin",
      },
    });
    if (createErr) throw createErr;
    adminUser = created.user;
    console.log(`    (✓) Admin user dibuat. ID: ${adminUser.id}`);
  } else {
    console.log(`    (✓) Admin user ditemukan. ID: ${adminUser.id}`);
    await supabase.auth.admin.updateUserById(adminUser.id, {
      password: DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Slayer Admin Utama",
        role: "admin",
      },
    });
  }

  // 5. Hapus seluruh akun test mock lain dari auth.users
  const usersToDelete = allUsers.filter((u) => u.email !== ADMIN_EMAIL_TO_KEEP);
  console.log(`\n[5/6] Menghapus ${usersToDelete.length} akun auth test mock...`);
  for (const u of usersToDelete) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.warn(`    (-) Gagal hapus auth user ${u.email}: ${delErr.message}`);
    } else {
      console.log(`    (✓) Dihapus dari auth: ${u.email}`);
    }
  }

  // Bersihkan profiles non-admin dan pastikan profile admin valid
  await pgClient.query(`DELETE FROM profiles WHERE id != $1;`, [adminUser.id]);
  await pgClient.query(
    `INSERT INTO profiles (id, email, full_name, role, is_active)
     VALUES ($1, $2, 'Slayer Admin Utama', 'admin', true)
     ON CONFLICT (id) DO UPDATE 
     SET email = $2, full_name = 'Slayer Admin Utama', role = 'admin', is_active = true;`,
    [adminUser.id, ADMIN_EMAIL_TO_KEEP]
  );

  // Perbarui school_settings
  await pgClient.query(`
    UPDATE school_settings
    SET school_name = 'SYNTAX SLAYER SMART LEARNING',
        updated_at = NOW();
  `);
  console.log("    (✓) Master Admin profile aktif.");
  console.log("    (✓) Identitas sekolah diset ke 'SYNTAX SLAYER SMART LEARNING'.");

  // 6. Verifikasi & Rekapitulasi Akhir
  console.log("\n[6/6] Verifikasi Status Database Pasca-Pembersihan...");
  console.log("------------------------------------------------------------------");
  console.log(" HASIL AUDIT TABEL SUPABASE (CLEAN STATE):");
  console.log("------------------------------------------------------------------");
  for (const t of allExistingTables) {
    const countRes = await pgClient.query(`SELECT count(*)::int as count FROM "${t}";`);
    const count = countRes.rows[0].count;
    let label = `🟢 0 baris (BERSIH)`;
    if (t === "profiles" && count === 1) {
      label = `🔵 1 profil (Master Admin: ${ADMIN_EMAIL_TO_KEEP})`;
    } else if (t === "school_settings" && count === 1) {
      label = `🔵 1 konfigurasi (SYNTAX SLAYER SMART LEARNING)`;
    } else if (count > 0) {
      label = `🟡 ${count} baris`;
    }
    console.log(` • ${t.padEnd(28)} : ${label}`);
  }

  const { data: finalAuthList } = await supabase.auth.admin.listUsers();
  console.log("------------------------------------------------------------------");
  console.log(` • Total Auth Users Aktif    : ${finalAuthList.users.length} (${finalAuthList.users.map((u) => u.email).join(", ")})`);
  console.log(` • Email Login Admin         : ${ADMIN_EMAIL_TO_KEEP}`);
  console.log(` • Password Login Admin      : ${DEFAULT_ADMIN_PASSWORD}`);
  console.log("==================================================================");
  console.log("🎉 DATABASE SUPABASE TELAH BERSIH SEMPURNA SIAP DIGUNAKAN!");
  console.log("==================================================================");

  await pgClient.end();
}

cleanMockData().catch((err) => {
  console.error("\n❌ GAGAL:", err);
  process.exit(1);
});
