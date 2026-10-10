import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const studentId = searchParams.get("studentId");

    let query = admin
      .from("assignments")
      .select(`
        id,
        title,
        instructions,
        due_date,
        max_score,
        submission_format,
        is_oral_defense_required,
        created_at,
        subject_id,
        class_id,
        material_id,
        subjects ( id, name, code ),
        classes ( id, name ),
        course_materials ( id, title, file_url, file_name )
      `)
      .order("created_at", { ascending: false });

    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    }
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Ambil statistik submissions untuk setiap assignment
    const assignmentIds = (assignments || []).map((a) => a.id);
    let submissions: any[] = [];
    if (assignmentIds.length > 0) {
      const { data: subsData } = await admin
        .from("assignment_submissions")
        .select(`
          id,
          assignment_id,
          student_id,
          status,
          oral_defense_passed,
          oral_defense_score,
          teacher_score,
          file_url,
          submitted_at
        `)
        .in("assignment_id", assignmentIds);
      submissions = subsData || [];
    }

    const enhancedAssignments = (assignments || []).map((assignment) => {
      const relatedSubs = submissions.filter((s) => s.assignment_id === assignment.id);
      const totalSubmissions = relatedSubs.length;
      const gradedCount = relatedSubs.filter((s) => s.status === "graded").length;
      const defensePassedCount = relatedSubs.filter((s) => s.oral_defense_passed).length;
      const mySubmission = studentId
        ? relatedSubs.find((s) => s.student_id === studentId) || null
        : null;

      return {
        ...assignment,
        stats: {
          totalSubmissions,
          gradedCount,
          defensePassedCount,
        },
        mySubmission,
      };
    });

    return NextResponse.json({ success: true, data: enhancedAssignments });
  } catch (err: any) {
    console.error("Assignments GET error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" && profile?.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Hanya guru atau admin yang dapat membuat tugas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      instructions,
      subjectId,
      classId,
      teacherId,
      materialId,
      dueDate,
      maxScore = 100,
      submissionFormat = "pdf",
      isOralDefenseRequired = true,
      rubricGuidelines,
    } = body;

    if (!title || !subjectId) {
      return NextResponse.json(
        { success: false, error: "Judul tugas dan mata pelajaran wajib diisi." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Resolusi fallback teacher jika belum ada
    let finalTeacherId = teacherId;
    if (!finalTeacherId) {
      const { data: t } = await admin.from("teachers").select("id").limit(1).maybeSingle();
      finalTeacherId = t?.id || "883cfa91-1270-462c-995c-83892eb69351";
    }

    // Resolusi fallback class jika belum ada
    let finalClassId = classId;
    if (!finalClassId) {
      const { data: c } = await admin.from("classes").select("id").limit(1).maybeSingle();
      finalClassId = c?.id || "4832063d-9b9a-43ad-9d6e-203493cc21eb";
    }

    const finalDueDate = dueDate
      ? new Date(dueDate).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Resolusi attachment PDF jika guru mengunggah berkas lampiran tugas
    let finalMaterialId = materialId || null;
    if (!finalMaterialId && body.attachmentUrl) {
      const { data: createdMat } = await admin
        .from("course_materials")
        .insert({
          title: `${title} (Lampiran)`,
          description: `Lampiran instruksi penugasan: ${title}`,
          subject_id: subjectId,
          teacher_id: finalTeacherId,
          file_url: body.attachmentUrl,
          file_name: body.attachmentName || "Lampiran_Tugas.pdf",
          file_type: "application/pdf",
        })
        .select("id")
        .maybeSingle();

      if (createdMat?.id) {
        finalMaterialId = createdMat.id;
      }
    }

    const { data: newAssignment, error: insertError } = await admin
      .from("assignments")
      .insert({
        title,
        instructions: instructions || "Kerjakan sesuai petunjuk dan unggah berkas PDF laporan/jawaban.",
        subject_id: subjectId,
        class_id: finalClassId,
        teacher_id: finalTeacherId,
        material_id: finalMaterialId,
        due_date: finalDueDate,
        max_score: maxScore,
        submission_format: submissionFormat,
        is_oral_defense_required: isOralDefenseRequired,
        rubric_guidelines: rubricGuidelines || {
          understanding: 40,
          clarity: 30,
          originality: 30,
        },
      })
      .select(`
        id,
        title,
        instructions,
        due_date,
        max_score,
        submission_format,
        is_oral_defense_required,
        created_at,
        subjects ( id, name, code ),
        classes ( id, name ),
        course_materials ( id, title, file_url )
      `)
      .single();

    if (insertError) {
      console.error("Insert assignment error:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newAssignment }, { status: 201 });
  } catch (err: any) {
    console.error("Create assignment error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID tugas diperlukan" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("assignments").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Penugasan berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
