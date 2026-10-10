import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyCronAuthorization, verifyEdgeDeviceAuthorization } from "@/lib/security";

export const maxDuration = 60; // Izinkan cron berjalan hingga 60 detik

/**
 * CRON / MAINTENANCE ENDPOINT: cleanup-telemetry
 * Merotasi data frame mentah di `classroom_telemetry` yang lebih tua dari masa retensi (default 14 hari).
 * 
 * GUARDRAILS:
 * - Data presensi resmi (`attendance_records`) PERMANEN dan TIDAK PERNAH dihapus.
 * - Sesi kelas (`attendance_sessions`) PERMANEN dan TIDAK PERNAH dihapus.
 * - Riwayat audit (`audit_logs`) PERMANEN dan TIDAK PERNAH dihapus.
 * - HANYA frame-by-frame digest telemetri mentah di `classroom_telemetry` yang dipangkas untuk mencegah lonjakan kuota basis data.
 */
export async function GET(request: NextRequest) {
  try {
    let isAuthorized = verifyCronAuthorization(request) || verifyEdgeDeviceAuthorization(request);

    // Jika tidak via secret header, cek apakah sesi user adalah Admin
    if (!isAuthorized) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Akses dibatasi untuk Cron atau Admin." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedDays = parseInt(searchParams.get("days") || "14", 10);
    const retentionDays = Math.max(7, Math.min(parsedDays, 90)); // Batas aman antara 7 s.d. 90 hari

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const adminClient = createAdminClient();

    // Hapus baris telemetri mentah yang lebih tua dari batas retensi
    const { count, error: deleteError } = await adminClient
      .from("classroom_telemetry")
      .delete({ count: "exact" })
      .lt("timestamp_bucket", cutoffDate);

    if (deleteError) {
      return NextResponse.json(
        {
          success: false,
          error: "Gagal membersihkan data telemetri lawas",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pembersihan data telemetri mentah berhasil. Data di atas ${retentionDays} hari dipangkas.`,
      retentionDays,
      cutoffDate,
      deletedRows: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan sistem internal";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
