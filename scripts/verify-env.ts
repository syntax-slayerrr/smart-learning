// ============================================
// Environment Verification Script — AbsenSMK
// Run: npx tsx scripts/verify-env.ts
// ============================================

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
  hint?: string;
}

const ENV_VARS: EnvVar[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL",
    validate: (v) => v.startsWith("https://") && v.includes(".supabase.co"),
    hint: "Must be like https://xxxxx.supabase.co",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anonymous/public key",
    validate: (v) => v.startsWith("eyJ") && v.length > 100,
    hint: "Must be a JWT token starting with 'eyJ'",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key (server-only)",
    validate: (v) => v.startsWith("eyJ") && v.length > 100,
    hint: "Must be a JWT token starting with 'eyJ'. NEVER expose this client-side.",
  },
  {
    key: "WHATSAPP_API_URL",
    required: false,
    description: "WhatsApp API endpoint (e.g. Fonnte)",
    validate: (v) => v.startsWith("https://"),
    hint: "Must be a valid HTTPS URL",
  },
  {
    key: "WHATSAPP_API_TOKEN",
    required: false,
    description: "WhatsApp API authentication token",
    validate: (v) => v.length > 10,
    hint: "Token from your WhatsApp gateway provider",
  },
];

function loadEnvFile(): Record<string, string> {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file not found!");
    console.error("   Copy .env.example to .env.local and fill in your values.");
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }

  return vars;
}

async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n🔍 AbsenSMK — Environment Verification\n");
  console.log("=".repeat(50));

  const envVars = loadEnvFile();
  let hasErrors = false;
  let hasWarnings = false;

  for (const envVar of ENV_VARS) {
    const value = envVars[envVar.key];
    const isPlaceholder = value && (value.includes("your-") || value.includes("xxxxx"));

    if (!value || isPlaceholder) {
      if (envVar.required) {
        console.error(`❌ ${envVar.key} — MISSING (required)`);
        console.error(`   ${envVar.description}`);
        if (envVar.hint) console.error(`   💡 ${envVar.hint}`);
        hasErrors = true;
      } else {
        console.warn(`⚠️  ${envVar.key} — not configured (optional)`);
        console.warn(`   ${envVar.description}`);
        hasWarnings = true;
      }
    } else if (envVar.validate && !envVar.validate(value)) {
      console.error(`❌ ${envVar.key} — INVALID FORMAT`);
      if (envVar.hint) console.error(`   💡 ${envVar.hint}`);
      hasErrors = true;
    } else {
      const masked = value.substring(0, 8) + "..." + value.substring(value.length - 4);
      console.log(`✅ ${envVar.key} — configured (${masked})`);
    }
  }

  console.log("\n" + "=".repeat(50));

  // Test Supabase connection if URL and key are valid
  const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseKey = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("your-")) {
    console.log("\n🔗 Testing Supabase connection...");
    const connected = await testSupabaseConnection(supabaseUrl, supabaseKey);
    if (connected) {
      console.log("✅ Supabase connection successful!");
    } else {
      console.error("❌ Supabase connection failed. Check URL and Anon Key.");
      hasErrors = true;
    }
  }

  console.log("\n" + "=".repeat(50));

  if (hasErrors) {
    console.error("\n🚫 Verification FAILED. Fix the errors above before deploying.\n");
    process.exit(1);
  } else if (hasWarnings) {
    console.warn("\n⚠️  Verification PASSED with warnings. Optional features may be disabled.\n");
    process.exit(0);
  } else {
    console.log("\n🎉 All environment variables are correctly configured!\n");
    process.exit(0);
  }
}

main();
