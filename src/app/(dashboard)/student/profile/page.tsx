import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/dashboard/profile-client";
import { FaceIdCard } from "@/components/student/face-id-card";
import { redirect } from "next/navigation";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) return <div>Profil tidak ditemukan.</div>;

  const cleanName = (profile.full_name || "Siswa")
    .replace(/\s*\([^)]*slayer[^)]*\)/gi, "")
    .trim();
  const initials = cleanName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

  return (
    <div className="dashboard-container max-w-2xl space-y-5 animate-fade-in pb-12">
      {/* Apple HIG Identity Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs">
        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-lg font-bold font-mono tracking-tight shrink-0 shadow-2xs">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100 truncate">
              {cleanName}
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50">
              Siswa Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono truncate mt-0.5">
            {profile.email}
          </p>
        </div>
      </div>

      {/* Grouped Face ID Card */}
      <FaceIdCard studentName={cleanName} />
      
      {/* Account Info & Password Update */}
      <ProfileClient userProfile={{ ...profile, full_name: cleanName }} />
    </div>
  );
}
