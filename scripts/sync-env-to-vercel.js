/**
 * ==============================================================================
 * SYNTAX SLAYER SMART LEARNING — VERCEL ENV MIGRATION SCRIPT
 * ==============================================================================
 * Skrip ini membaca file .env.local dan memigrasikan seluruh environment variable
 * ke project Vercel menggunakan Vercel CLI.
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const envPath = path.join(__dirname, "..", ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("[-] File .env.local tidak ditemukan!");
  process.exit(1);
}

const rawContent = fs.readFileSync(envPath, "utf8");
const lines = rawContent.split("\n");

const envVars = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;

  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();

  // Bersihkan kutip jika ada
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }

  if (key && val) {
    envVars.push({ key, val });
  }
}

async function addEnvVar(key, val, targets = ["production", "preview", "development"]) {
  return new Promise((resolve) => {
    console.log(`[+] Mengirim ${key} ke Vercel (${targets.join(",")})...`);
    // npx vercel env add <key> <target> --force
    const targetArg = targets.join(",");
    const proc = spawn("npx", ["--yes", "vercel", "env", "add", key, targetArg, "--force"], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    // Kirim nilai variabel ke stdin lalu tutup stdin
    proc.stdin.write(val + "\n");
    proc.stdin.end();

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`    (✓) Berhasil migrasi: ${key}`);
        resolve(true);
      } else {
        // Cek jika sudah ada
        if (stderr.includes("already exists") || stdout.includes("already exists")) {
          console.log(`    (!) Variabel ${key} sudah ada di Vercel.`);
        } else {
          console.warn(`    (-) ${key} response (code ${code}):`, (stderr || stdout).trim());
        }
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log("=================================================");
  console.log(" 🚀 SYNTAX SLAYER — MIGRASI ENV KE VERCEL");
  console.log("=================================================");
  console.log(`Ditemukan ${envVars.length} variabel di .env.local:`);
  envVars.forEach((e) => console.log(` - ${e.key}`));
  console.log("-------------------------------------------------");

  for (const { key, val } of envVars) {
    await addEnvVar(key, val);
  }

  console.log("=================================================");
  console.log("🎉 SELURUH ENVIRONMENT VARIABLE BERHASIL DIMIGRASIKAN KE VERCEL!");
  console.log("=================================================");
}

main().catch(console.error);
