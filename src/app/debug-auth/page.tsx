"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const envConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DebugAuthPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!envConfigured) {
      setStatus({
        connected: false,
        latency: "N/A",
        error: "Supabase env vars are not configured.",
        session: "N/A",
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "MISSING",
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configured" : "MISSING",
        },
      });
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function checkConnection() {
      try {
        const start = Date.now();
        // 1. Check basic connection
        const { data, error } = await supabase.from("profiles").select("count").limit(1);
        const end = Date.now();

        // 2. Check current session
        const { data: sessionData } = await supabase.auth.getSession();

        setStatus({
          connected: !error,
          latency: `${end - start}ms`,
          error: error?.message || "None",
          session: sessionData.session ? "Active" : "No Session",
          env: {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "MISSING",
            key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configured" : "MISSING",
          }
        });
      } catch (err: any) {
        setStatus({ connected: false, error: err.message });
      } finally {
        setLoading(false);
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="p-8 font-mono bg-slate-900 text-green-400 min-h-screen">
      <h1 className="text-2xl mb-4 border-b border-zinc-800 pb-2">🛠 SYNTAX SLAYER Debug Auth</h1>
      
      {loading ? (
        <p className="animate-pulse">Analyzing connection...</p>
      ) : (
        <div className="space-y-4">
          <div className={`p-4 border ${status.connected ? 'border-green-500' : 'border-red-500'}`}>
            <p className="text-xl font-bold mb-2">
              Status: {status.connected ? "✅ CONNECTED" : "❌ DISCONNECTED"}
            </p>
            <p>Latency: {status.latency}</p>
            <p className="text-red-400">Error: {status.error}</p>
          </div>

          <div className="p-4 border border-blue-500">
            <h2 className="font-bold mb-2">Environment Check:</h2>
            <pre>{JSON.stringify(status.env, null, 2)}</pre>
          </div>

          <div className="p-4 border border-yellow-500">
            <h2 className="font-bold mb-2">Session:</h2>
            <p>{status.session}</p>
          </div>

          {!status.connected && (
            <div className="bg-red-900/30 p-4 rounded text-white">
              <h3 className="font-bold mb-1">Diagnosa:</h3>
              <p>Jika URL & Key sudah "Configured" tapi status "Disconnected", kemungkinan besar Key Anon yang Anda berikan tadi salah atau ada IP Whitelisting di Supabase.</p>
            </div>
          )}
          
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Kembali ke Login
          </button>
        </div>
      )}
    </div>
  );
}
