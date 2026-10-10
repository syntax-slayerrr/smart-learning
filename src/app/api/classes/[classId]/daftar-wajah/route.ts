import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyEdgeDeviceAuthorization } from "@/lib/security";

interface RouteParams {
  params: Promise<{
    classId: string;
  }>;
}

/**
 * GET /api/classes/[classId]/daftar-wajah
 * Endpoint biometrik seluruh siswa & guru kelas ke Edge CV Engine.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { classId } = await params;
    const adminClient = createAdminClient();

    // 1. Otorisasi: Perangkat Edge Kamera atau Sesi Guru/Admin
    let isAuthorized = verifyEdgeDeviceAuthorization(request);

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

        if (profile && (profile.role === "teacher" || profile.role === "admin")) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid edge device key or user session", success: false },
        { status: 401 }
      );
    }

    const isDemoClass = classId === "00000000-0000-0000-0000-000000000001";

    // 2. Ambil Informasi Kelas
    let className = "Kelas XI RPL 1";
    let teacherProfile: any = null;

    if (!isDemoClass) {
      const { data: classData } = await adminClient
        .from("classes")
        .select("id, name, grade, homeroom_teacher_id, teachers ( profile_id, profiles ( full_name ) )")
        .eq("id", classId)
        .maybeSingle();

      if (classData) {
        className = `${classData.grade} ${classData.name}`;
        teacherProfile = classData.teachers;
      }
    }

    // 3. Ambil Seluruh Siswa di Kelas Ini beserta Biometrik Wajahnya
    const roster: Array<{
      student_id: string;
      nis: string;
      name: string;
      role: string;
      embedding: number[] | null;
      quality_score: number;
    }> = [];

    if (!isDemoClass) {
      const { data: students, error: studentsError } = await adminClient
        .from("students")
        .select(`
          id,
          nis,
          profile_id,
          profiles ( full_name, role ),
          student_face_biometrics ( embedding, quality_score )
        `)
        .eq("class_id", classId);

      if (!studentsError && students && students.length > 0) {
        for (const s of students as any[]) {
          const bio = Array.isArray(s.student_face_biometrics)
            ? s.student_face_biometrics[0]
            : s.student_face_biometrics;

          roster.push({
            student_id: s.id,
            nis: s.nis || "",
            name: s.profiles?.full_name || "Siswa",
            role: "student",
            embedding: bio?.embedding || null,
            quality_score: Number(bio?.quality_score || 0),
          });
        }
      }
    }

    // 4. Fallback Demo Siswa jika database masih kosong atau kelas demo aktif
    if (roster.length === 0) {
      roster.push(
        {
          student_id: "00000000-0000-0000-0000-000000000101",
          nis: "20250001",
          name: "Zaldy (Siswa)",
          role: "student",
          embedding: null,
          quality_score: 98.8,
        },
        {
          student_id: "00000000-0000-0000-0000-000000000102",
          nis: "20250002",
          name: "Andi Pratama",
          role: "student",
          embedding: null,
          quality_score: 97.5,
        },
        {
          student_id: "00000000-0000-0000-0000-000000000103",
          nis: "20250003",
          name: "Citra Dewi",
          role: "student",
          embedding: null,
          quality_score: 96.0,
        }
      );
    }

    // 5. Tambahkan Guru jika tersedia agar kamera mengenali Guru vs Siswa
    if (teacherProfile?.profiles?.full_name) {
      roster.push({
        student_id: teacherProfile.profile_id || "teacher-id",
        nis: "GURU-NIP",
        name: `[GURU] ${teacherProfile.profiles.full_name}`,
        role: "teacher",
        embedding: null,
        quality_score: 99.0,
      });
    }

    const enrolledCount = roster.filter((r) => r.embedding !== null).length;

    return NextResponse.json({
      success: true,
      class_id: classId,
      class_name: className,
      total_students: roster.filter((r) => r.role === "student").length,
      enrolled_biometrics_count: enrolledCount,
      roster,
    });
  } catch (error) {
    console.error("[Daftar Wajah API Error]:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar biometrik wajah kelas.", success: false },
      { status: 500 }
    );
  }
}
