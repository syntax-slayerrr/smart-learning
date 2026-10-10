import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Enterprise guardrail: Disable debug endpoint completely in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  // In development, require authenticated admin or teacher session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden: Admin or Teacher role required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const { data: sessions, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id, subject, class_id, status, session_date")
    .eq("session_date", date);

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const sessionIds = sessions?.map((s) => s.id) || [];
  let records: any[] = [];
  if (sessionIds.length > 0) {
    const { data: recs, error: recError } = await supabase
      .from("attendance_records")
      .select("id, session_id, student_id, status, scanned_at")
      .in("session_id", sessionIds)
      .limit(10);
    if (recError) return NextResponse.json({ error: recError.message }, { status: 500 });
    records = recs || [];
  }

  return NextResponse.json({
    date,
    sessionsCount: sessions?.length ?? 0,
    recordsCount: records.length,
    sessionsSample: sessions?.slice(0, 2),
    recordsSample: records,
  });
}
