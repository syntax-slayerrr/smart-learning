import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/dashboard/profile-client";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Siswa</h1>
        <p className="text-muted-foreground">
          Kelola informasi akun dan keamanan kata sandi Anda.
        </p>
      </div>
      
      <ProfileClient userProfile={profile} />
    </div>
  );
}
