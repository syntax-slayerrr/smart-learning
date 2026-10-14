import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const adminClient = createAdminClient();

    // Check user auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
    }

    const isDemoSession = sessionId === "00000000-0000-0000-0000-000000000001";

    // 1. Fetch Session Info & Target Class
    let session = null;
    let classId = null;
    let effectiveSessionId = sessionId;

    if (!isDemoSession) {
      const { data: sessionData } = await adminClient
        .from("attendance_sessions")
        .select("id, class_id, status, teacher_id, session_date")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionData) {
        session = sessionData;
        classId = sessionData.class_id;
      }
    } else {
      // In demo mode, automatically bind to the currently active attendance session
      const { data: activeSession } = await adminClient
        .from("attendance_sessions")
        .select("id, class_id, status, teacher_id, session_date")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        session = activeSession;
        classId = activeSession.class_id;
        effectiveSessionId = activeSession.id;
      } else {
        // Fallback: ambil kelas pertama jika belum ada sesi aktif
        const { data: fallbackClass } = await adminClient
          .from("classes")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (fallbackClass) {
          classId = fallbackClass.id;
        }
      }
    }

    // 2. Fetch enrolled students for this class
    let enrolledStudents: Array<{ id: string; nis: string; name: string }> = [];

    if (classId) {
      const { data: students } = await adminClient
        .from("students")
        .select("id, nis, profiles ( full_name )")
        .eq("class_id", classId);

      if (students) {
        enrolledStudents = students.map((s: any) => ({
          id: s.id,
          nis: s.nis || "",
          name: s.profiles?.full_name || "Siswa",
        }));
      }
    }

    // 3. Fetch already recorded attendance (baik dari sessionId maupun effectiveSessionId)
    let recordedStudentIds = new Set<string>();
    const sessionIdsToCheck = Array.from(new Set([sessionId, effectiveSessionId]));
    const { data: existingRecords } = await adminClient
      .from("attendance_records")
      .select("student_id")
      .in("session_id", sessionIdsToCheck);

    if (existingRecords) {
      existingRecords.forEach((r: { student_id: string }) => recordedStudentIds.add(r.student_id));
    }

    // 4. Read memory draft from Edge CV Engine (gabungkan draft dari sessionId, demo id, dan active session id)
    const rawDemoDraft = (globalThis as any).__ATTENDANCE_DRAFT__?.["00000000-0000-0000-0000-000000000001"] || {};
    const rawSessDraft = (globalThis as any).__ATTENDANCE_DRAFT__?.[sessionId] || {};
    const rawEffDraft = effectiveSessionId ? (globalThis as any).__ATTENDANCE_DRAFT__?.[effectiveSessionId] || {} : {};
    const draftMap = { ...rawDemoDraft, ...rawEffDraft, ...rawSessDraft };

    // 5. Match detected students against class roster
    const verifiedList: any[] = [];
    const pendingList: any[] = [];

    for (const student of enrolledStudents) {
      const isAlreadyRecorded = recordedStudentIds.has(student.id);

      // Search match in draft: Prioritas 1: student_id UUID / NIS definitif. Fallback: Nama
      let match = null;
      for (const [keyName, draftItem] of Object.entries(draftMap) as [string, any][]) {
        if (draftItem.student_id && draftItem.student_id === student.id) {
          match = draftItem;
          break;
        }
        if (draftItem.nis && student.nis && draftItem.nis === student.nis) {
          match = draftItem;
          break;
        }
        if (
          student.name.toLowerCase().includes(keyName.toLowerCase()) ||
          keyName.toLowerCase().includes(student.name.toLowerCase())
        ) {
          match = draftItem;
          break;
        }
      }

      // Verifikasi HANYA jika benar-benar aktif terdeteksi oleh AI Kamera dalam 35 detik terakhir
      const lastSeenMs = match?.last_seen ? Date.now() - new Date(match.last_seen).getTime() : Infinity;
      const isRecentlyActive = lastSeenMs <= 35000;

      const isQualified = Boolean(
        match &&
        isRecentlyActive &&
        (match.attendance_qualified || match.confidence >= 0.35 || match.dwell_seconds >= 5)
      );
      const dwellSeconds = match?.dwell_seconds || 0;
      const confidence = match?.confidence || 0.0;
      const seatId = match?.seat_id || "SEAT_1";

      if (match && isQualified) {
        verifiedList.push({
          student_id: student.id,
          nis: student.nis,
          name: student.name,
          dwell_seconds: dwellSeconds,
          confidence: confidence,
          seat_id: seatId,
          already_recorded: isAlreadyRecorded,
          status_recommendation: "present",
          qualification_reason: isAlreadyRecorded
            ? `Tercatat otomatis di database presensi (${seatId})`
            : `Duduk stabil ${dwellSeconds}s di ${seatId} (Konsensus ${(confidence * 100).toFixed(1)}%)`,
        });
      } else {
        pendingList.push({
          student_id: student.id,
          nis: student.nis,
          name: student.name,
          dwell_seconds: dwellSeconds,
          already_recorded: isAlreadyRecorded,
          status_recommendation: isAlreadyRecorded ? "recorded" : "unverified",
          reason: isAlreadyRecorded ? "Sudah diabsen manual (tidak di kamera)" : "Belum terdeteksi di kamera kelas",
        });
      }
    }

    const totalEnrolled = enrolledStudents.length;
    const verifiedCount = verifiedList.length;
    const consensusRate = totalEnrolled > 0 ? (verifiedCount / totalEnrolled) * 100 : 0;

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      metrics: {
        total_enrolled: totalEnrolled,
        verified_count: verifiedCount,
        pending_count: pendingList.length,
        consensus_rate: Number(consensusRate.toFixed(1)),
        fail_safe_gate: "Dwell Time >= 45s + 5x Cosine Consensus",
      },
      verified_students: verifiedList,
      pending_students: pendingList,
    });
  } catch (error: any) {
    console.error("[Auto-Draft Attendance Error]:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message, success: false },
      { status: 500 }
    );
  }
}
