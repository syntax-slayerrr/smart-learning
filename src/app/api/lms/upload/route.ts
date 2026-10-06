import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "documents";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Berkas PDF tidak ditemukan dalam request." },
        { status: 400 }
      );
    }

    // Validasi tipe berkas
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { success: false, error: "Hanya berkas format PDF yang didukung saat ini." },
        { status: 400 }
      );
    }

    // Validasi ukuran berkas (Maks 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas maksimal 25 MB." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Buat nama file unik dan aman
    const timestamp = Date.now();
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

    // Pastikan bucket lms-documents siap
    const { error: uploadError } = await admin.storage
      .from("lms-documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: `Gagal mengunggah ke penyimpanan: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage
      .from("lms-documents")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      storagePath,
    });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
