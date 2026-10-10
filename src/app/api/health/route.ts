import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCHOOL_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Health Check & Diagnostic Endpoint — /api/health
 * Digunakan oleh tim IT sekolah, Docker liveness probe, dan monitoring uptime (UptimeRobot / BetterStack).
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // 1. Diagnostik Koneksi Supabase Database
  let dbStatus = "disconnected";
  let dbLatencyMs = 0;
  let dbErrorDetails: string | null = null;

  try {
    const dbStart = Date.now();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .select("id")
      .limit(1);

    dbLatencyMs = Date.now() - dbStart;
    if (error) {
      dbStatus = "degraded";
      dbErrorDetails = error.message;
    } else {
      dbStatus = "connected";
    }
  } catch (err: unknown) {
    dbStatus = "error";
    dbErrorDetails = err instanceof Error ? err.message : "Database connection failed";
  }

  // 2. Diagnostik Edge Vision Engine (OpenCV / AI Kamera Daemon)
  const edgeUrl = process.env.NEXT_PUBLIC_EDGE_SERVER || "http://localhost:5000";
  let edgeStatus = "offline";
  let edgeLatencyMs: number | null = null;

  try {
    const edgeStart = Date.now();
    const edgeRes = await fetch(`${edgeUrl}/status`, {
      signal: AbortSignal.timeout(1200),
    });
    if (edgeRes.ok) {
      edgeStatus = "online";
      edgeLatencyMs = Date.now() - edgeStart;
    }
  } catch {
    edgeStatus = "offline";
  }

  const totalDurationMs = Date.now() - startTime;
  const isHealthy = dbStatus === "connected";

  const responsePayload = {
    status: isHealthy ? "healthy" : "degraded",
    school: SCHOOL_NAME,
    timestamp,
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbErrorDetails ? { error: dbErrorDetails } : {}),
      },
      edgeVisionCamera: {
        status: edgeStatus,
        url: edgeUrl,
        latencyMs: edgeLatencyMs,
      },
    },
    responseTimeMs: totalDurationMs,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
