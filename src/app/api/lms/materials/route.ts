import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { call9Router, ROUTER_MODELS } from "@/lib/ai/9router";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");

    let query = admin
      .from("course_materials")
      .select(`
        id,
        title,
        description,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        page_count,
        ai_summary,
        ai_status,
        created_at,
        subject_id,
        class_id,
        teacher_id,
        subjects ( id, name, code ),
        classes ( id, name ),
        teachers ( id, nip, profiles ( full_name, email ) )
      `)
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error("Error fetching course_materials:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: materials || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      subjectId,
      classId,
      teacherId,
      fileUrl,
      fileName,
      fileSizeBytes,
      pageCount = 10,
    } = body;

    if (!title || !fileUrl) {
      return NextResponse.json(
        { success: false, error: "Judul materi dan berkas URL wajib disertakan." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Resolusi fallback teacher dan subject jika tidak disediakan
    let finalTeacherId = teacherId;
    if (!finalTeacherId) {
      const { data: t } = await admin.from("teachers").select("id").limit(1).maybeSingle();
      finalTeacherId = t?.id || "883cfa91-1270-462c-995c-83892eb69351";
    }

    let finalSubjectId = subjectId;
    if (!finalSubjectId) {
      const { data: s } = await admin.from("subjects").select("id").limit(1).maybeSingle();
      finalSubjectId = s?.id || "df058ee9-dc56-4dba-9bc7-865428be8f61";
    }

    // Insert material record
    const { data: newMaterial, error: insertError } = await admin
      .from("course_materials")
      .insert({
        title,
        description: description || "Modul materi pembelajaran resmi.",
        subject_id: finalSubjectId,
        class_id: classId || null,
        teacher_id: finalTeacherId,
        file_url: fileUrl,
        file_name: fileName || `${title.replace(/\s+/g, "_")}.pdf`,
        file_type: "application/pdf",
        file_size_bytes: fileSizeBytes || 1024 * 500,
        page_count: pageCount,
        ai_status: "processing",
      })
      .select(`
        id,
        title,
        description,
        file_url,
        file_name,
        created_at,
        subject_id,
        class_id,
        subjects ( id, name, code ),
        classes ( id, name )
      `)
      .single();

    if (insertError) {
      console.error("Insert material error:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Trigger AI summary secara asynchronous via Gemini/9Router
    try {
      const prompt = `Analisis materi pembelajaran berikut:
Judul: ${title}
Deskripsi: ${description || "Modul ajar sekolah"}

Hasilkan ringkasan materi yang padat, berbobot, dan poin-poin konsep penting (maksimal 3 paragraf). Tulis dalam bahasa Indonesia formal untuk kurikulum sekolah.`;

      call9Router({
        model: ROUTER_MODELS.GEMINI_3_FLASH,
        messages: [
          { role: "system", content: "Kamu adalah asisten kurikulum akademik AI untuk platform Smart Learning." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      })
        .then(async (aiRes) => {
          if (aiRes?.content) {
            await admin
              .from("course_materials")
              .update({
                ai_summary: aiRes.content,
                ai_status: "completed",
              })
              .eq("id", newMaterial.id);
          }
        })
        .catch((e) => {
          console.error("AI extraction background error:", e);
        });
    } catch (aiErr) {
      console.warn("AI extraction trigger error:", aiErr);
    }

    return NextResponse.json({ success: true, data: newMaterial }, { status: 201 });
  } catch (err: any) {
    console.error("Create material error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID materi diperlukan" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("course_materials").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Materi berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
