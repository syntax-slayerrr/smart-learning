import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, grade")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("[API /api/classes] Database error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      classes: data || [],
    });
  } catch (err: any) {
    console.error("[API /api/classes] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
