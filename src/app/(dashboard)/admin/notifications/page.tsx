import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "./notifications-client";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const supabase = await createClient();

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/login");
  }

  // Fetch notification logs (latest 1000 to avoid overwhelming the browser)
  // We include parent name/phone and student name from relationships
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(`
      id,
      message,
      status,
      error_message,
      created_at,
      parents (
        phone_wa,
        profiles (
          full_name
        )
      ),
      students (
        profiles (
          full_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching notifications:", error);
  }

  // Transform data for the client
  const logs = (notifications || []).map((notif: any) => ({
    id: notif.id,
    message: notif.message,
    status: notif.status,
    error_message: notif.error_message,
    created_at: notif.created_at,
    parent_name: notif.parents?.profiles?.full_name || "Unknown",
    parent_phone: notif.parents?.phone_wa || "Unknown",
    student_name: notif.students?.profiles?.full_name || "Unknown",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            SMK TI SYNTAX SLAYER • GATEWAY AUDIT
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Log Notifikasi & Pengiriman WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Pantau riwayat dispatch pesan real-time ke wali murid untuk absensi harian, keterlambatan, dan peringatan kehadiran siswa.
        </p>
      </div>

      <NotificationsClient initialData={logs} />
    </div>
  );
}
