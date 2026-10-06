import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();

    const [{ data: subjects, error: sErr }, { data: classes, error: cErr }] = await Promise.all([
      admin.from("subjects").select("id, name, code").order("name"),
      admin.from("classes").select("id, name, grade").order("name"),
    ]);

    if (sErr || cErr) {
      return NextResponse.json(
        { success: false, error: sErr?.message || cErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subjects: subjects || [],
      classes: classes || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
