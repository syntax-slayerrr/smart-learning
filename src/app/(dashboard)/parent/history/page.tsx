import { createClient } from "@/lib/supabase/server";
import { History, Calendar } from "lucide-react";

export default async function ParentHistoryPage() {
  const supabase = await createClient();

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Absensi</h1>
        <p className="text-muted-foreground">
          Daftar lengkap kehadiran anak Anda selama semester ini.
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Tanggal</th>
              <th className="px-6 py-3 text-left font-medium">Jam Masuk</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">1{i} Mei 2026</td>
                <td className="px-6 py-4">07:{10 + i} WIB</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                    Hadir
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
