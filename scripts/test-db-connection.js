const { Client } = require("pg");

const PROJECT_REF = "wfkdwiiuuhfzirurspvr";
const DB_PASS = "fTawF6pCrL6QTzy7";

const endpoints = [
  {
    name: "Direct Host (db.project.supabase.co:5432)",
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      user: "postgres",
      password: DB_PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    },
  },
  {
    name: "Transaction Pooler (aws-0-ap-southeast-1.pooler.supabase.com:6543)",
    config: {
      host: "aws-0-ap-southeast-1.pooler.supabase.com",
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    },
  },
  {
    name: "Session Pooler (aws-0-ap-southeast-1.pooler.supabase.com:5432)",
    config: {
      host: "aws-0-ap-southeast-1.pooler.supabase.com",
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    },
  },
  {
    name: "Direct Host Port 6543 (db.project.supabase.co:6543)",
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 6543,
      user: "postgres",
      password: DB_PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    },
  },
];

async function main() {
  console.log(`[*] Menguji koneksi database Supabase untuk project ref: ${PROJECT_REF}...`);
  for (const ep of endpoints) {
    process.stdout.write(`[*] Mencoba ${ep.name}... `);
    const client = new Client(ep.config);
    try {
      await client.connect();
      const res = await client.query("SELECT current_database(), version();");
      console.log(`\n[SUCCESS] Berhasil terhubung! Database: ${res.rows[0].current_database}`);
      console.log(`[INFO] PostgreSQL Version: ${res.rows[0].version.split(" on ")[0]}`);
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`[FAILED: ${err.message}]`);
      try { await client.end(); } catch (_) {}
    }
  }
  console.error("[!] Semua endpoint gagal terhubung.");
  process.exit(1);
}

main();
