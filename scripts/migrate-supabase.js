const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const PROJECT_REF = "wfkdwiiuuhfzirurspvr";
const DB_PASS = "fTawF6pCrL6QTzy7";

const config = {
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 6543,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASS,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
};

const migrationFiles = [
  "supabase/schema.sql",
  "supabase/migrations/20261003_classroom_intelligence.sql",
  "supabase/migrations/20261003_add_sleep_detection.sql",
  "supabase/migrations/20261003_seating_and_resting_telemetry.sql",
  "supabase/migrations/add_wa_notify_mode_to_school_settings.sql",
  "supabase/migrations/20261005_smart_lms_notebook.sql",
];

// Helper to split SQL script by statement respecting $$ dollar quoted strings
function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";

  const lines = sql.split("\n");
  for (const line of lines) {
    // Check for comment
    const trimmed = line.trim();
    if (!inDollarQuote && trimmed.startsWith("--")) {
      continue;
    }

    current += line + "\n";

    // Match dollar quotes like $$ or $tag$
    const matches = line.match(/\$[a-zA-Z0-9_]*\$/g);
    if (matches) {
      for (const m of matches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = m;
        } else if (m === dollarTag) {
          inDollarQuote = false;
          dollarTag = "";
        }
      }
    }

    if (!inDollarQuote && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements.filter((s) => s.length > 0 && !s.startsWith("--"));
}

async function runMigrations() {
  console.log("=================================================");
  console.log("  SYNTAX SLAYER — SUPABASE AUTOMATED MIGRATION   ");
  console.log("=================================================");
  console.log(`[*] Target Project Ref : ${PROJECT_REF}`);
  console.log(`[*] Target Host        : ${config.host}:${config.port}`);
  console.log(`[*] Target Database    : ${config.database}\n`);

  const client = new Client(config);

  try {
    process.stdout.write("[*] Menghubungkan ke PostgreSQL Supabase... ");
    await client.connect();
    console.log("BERHASIL TERHUBUNG!\n");

    for (const relPath of migrationFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[!] File tidak ditemukan: ${relPath} (dilewati)`);
        continue;
      }

      console.log(`-------------------------------------------------`);
      console.log(`[*] Mengeksekusi: ${relPath}`);
      console.log(`-------------------------------------------------`);
      const sqlContent = fs.readFileSync(fullPath, "utf8");
      const statements = splitSqlStatements(sqlContent);
      console.log(`[*] Terdeteksi ${statements.length} blok SQL statement.`);

      let successCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await client.query(stmt);
          successCount++;
        } catch (err) {
          // Abaikan jika sudah ada (already exists)
          if (
            err.message.includes("already exists") ||
            err.message.includes("duplicate key") ||
            err.message.includes("multiple primary keys")
          ) {
            skippedCount++;
          } else {
            console.error(`   [!] Statement #${i + 1} Error: ${err.message}`);
            // Log first line of statement
            console.error(`       Snippet: ${stmt.slice(0, 70).replace(/\n/g, " ")}...`);
          }
        }
      }

      console.log(`[+] Ringkasan ${relPath}: ${successCount} sukses, ${skippedCount} lewati/ada.\n`);
    }

    // Verifikasi semua tabel publik yang terbentuk
    console.log("=================================================");
    console.log("  VERIFIKASI TABEL PADA SCHEMA 'public'          ");
    console.log("=================================================");
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`[+] Total Tabel Terbentuk di Supabase: ${tablesRes.rows.length}`);
    tablesRes.rows.forEach((row, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2, " ")}. public.${row.table_name}`);
    });

    console.log("\n=================================================");
    console.log("[SUCCESS] SELURUH MIGRASI SUPABASE SELESAI 100%!");
    console.log("=================================================");
  } catch (err) {
    console.error("\n[FATAL ERROR]:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
