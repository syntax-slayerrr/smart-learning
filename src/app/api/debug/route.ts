import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "No env" }, { status: 500 });
  
  const supabase = createClient(url, key);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "2026-07-26";

  const { data: sessions, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("session_date", date);

  if (sessionError) return NextResponse.json({ sessionError });

  const sessionIds = sessions?.map(s => s.id) || [];
  let records = [];
  if (sessionIds.length > 0) {
    const { data: recs, error: recError } = await supabase
      .from("attendance_records")
      .select("*")
      .in("session_id", sessionIds)
      .limit(10);
    if (recError) return NextResponse.json({ recError });
    records = recs || [];
  }

  return NextResponse.json({ 
    date,
    sessionsCount: sessions?.length, 
    recordsCount: records?.length,
    sessionsSample: sessions?.slice(0, 2),
    recordsSample: records
  });
}
