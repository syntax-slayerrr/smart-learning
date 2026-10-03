import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Save to profiles table
    const { error } = await supabase
      .from("profiles")
      .update({ push_subscription: subscription })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving subscription:", error);
      return NextResponse.json({ error: "Gagal menyimpan data langganan notifikasi." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Gagal mendaftarkan notifikasi push karena kendala sistem. Silakan coba lagi." }, { status: 500 });
  }
}
