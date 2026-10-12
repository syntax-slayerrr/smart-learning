import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  MessageSquare,
  ShieldAlert,
  Info,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { id } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Pemberitahuan Orang Tua — Smart Learning",
};

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "warning" | "info" | "alert";
  created_at: string;
}

export default async function ParentNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil parent record
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!parent) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
          <AlertCircle className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-800">Profil Orang Tua Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">Silakan hubungi admin sekolah untuk verifikasi akun.</p>
        </div>
      </div>
    );
  }

  // 2. Ambil anak-anak yang terhubung
  const { data: links } = await supabase
    .from("student_parents")
    .select(`
      student_id,
      relationship,
      students (
        id,
        nis,
        profiles ( full_name ),
        classes ( name )
      )
    `)
    .eq("parent_id", parent.id);

  const studentLinks = (links || []) as unknown as Array<{
    student_id: string;
    relationship: string;
    students: {
      id: string;
      nis: string;
      profiles: { full_name: string } | null;
      classes: { name: string } | null;
    } | null;
  }>;

  const childIds = studentLinks.map((l) => l.student_id).filter(Boolean);
  const primaryChild = studentLinks[0]?.students;
  const childName = primaryChild?.profiles?.full_name || "Siswa";

  // 3. Query notifikasi riil dari tabel notifications
  const { data: rawNotifications } = await supabase
    .from("notifications")
    .select("id, message, status, created_at")
    .eq("parent_id", parent.id)
    .order("created_at", { ascending: false })
    .limit(30);

  // 4. Query aktivitas presensi terkini untuk dijadikan feed notifikasi realtime
  const { data: recentAttendances } = childIds.length > 0
    ? await supabase
        .from("attendance_records")
        .select(`
          id,
          status,
          scanned_at,
          attendance_sessions (
            session_date,
            subjects ( name ),
            classes ( name )
          )
        `)
        .in("student_id", childIds)
        .order("scanned_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const notificationsList: NotificationItem[] = [];

  // Gabungkan notifikasi langsung dari DB
  if (rawNotifications && rawNotifications.length > 0) {
    rawNotifications.forEach((n) => {
      const isWarning = n.message?.toLowerCase().includes("terlambat") || n.message?.toLowerCase().includes("absen") || n.message?.toLowerCase().includes("tidak hadir");
      notificationsList.push({
        id: `notif-${n.id}`,
        title: isWarning ? "Perhatian Kehadiran" : "Informasi Sekolah",
        message: n.message || "Pemberitahuan dari sistem sekolah.",
        time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: id }),
        type: isWarning ? "warning" : "info",
        created_at: n.created_at,
      });
    });
  }

  // Generate notifikasi otomatis dari catatan absensi riil
  if (recentAttendances && recentAttendances.length > 0) {
    recentAttendances.forEach((rec: any) => {
      const subjectName = rec.attendance_sessions?.subjects?.name || "Kelas";
      const scannedDate = new Date(rec.scanned_at);
      const timeStr = format(scannedDate, "HH:mm", { locale: id });

      if (rec.status === "present") {
        notificationsList.push({
          id: `att-${rec.id}`,
          title: `Kehadiran Tepat Waktu — ${childName}`,
          message: `${childName} telah hadir di sesi ${subjectName} tepat waktu pada pukul ${timeStr} WIB.`,
          time: formatDistanceToNow(scannedDate, { addSuffix: true, locale: id }),
          type: "success",
          created_at: rec.scanned_at,
        });
      } else if (rec.status === "late") {
        notificationsList.push({
          id: `att-${rec.id}`,
          title: `Keterlambatan Masuk Kelas — ${childName}`,
          message: `${childName} tercatat terlambat memasuki sesi ${subjectName} pada pukul ${timeStr} WIB.`,
          time: formatDistanceToNow(scannedDate, { addSuffix: true, locale: id }),
          type: "warning",
          created_at: rec.scanned_at,
        });
      } else if (rec.status === "absent") {
        notificationsList.push({
          id: `att-${rec.id}`,
          title: `Tidak Hadir Tanpa Keterangan — ${childName}`,
          message: `${childName} tidak tercatat dalam sesi ${subjectName}. Silakan konfirmasi ke pihak sekolah.`,
          time: formatDistanceToNow(scannedDate, { addSuffix: true, locale: id }),
          type: "alert",
          created_at: rec.scanned_at,
        });
      }
    });
  }

  // Sortir berdasarkan tanggal terbaru
  notificationsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* Back button */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href="/parent"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-white transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Pantauan Belajar</span>
        </Link>
      </div>

      <PageHeader
        eyebrow="PORTAL ORANG TUA • PUSAT INFORMASI"
        title="Pemberitahuan & Log Aktivitas Anak"
        description="Pesan otomatis, status kehadiran kelas, dan pengumuman dari pihak sekolah"
      />

      {/* Notifications Feed */}
      <div className="space-y-3 max-w-3xl">
        {notificationsList.length > 0 ? (
          notificationsList.map((n) => {
            const badgeConfig = {
              success: {
                icon: CheckCircle2,
                iconColor: "text-emerald-600",
                bg: "bg-emerald-50 border-emerald-100",
              },
              warning: {
                icon: AlertCircle,
                iconColor: "text-amber-600",
                bg: "bg-amber-50 border-amber-100",
              },
              alert: {
                icon: ShieldAlert,
                iconColor: "text-rose-600",
                bg: "bg-rose-50 border-rose-100",
              },
              info: {
                icon: Bell,
                iconColor: "text-blue-600",
                bg: "bg-blue-50 border-blue-100",
              },
            }[n.type];

            const IconComp = badgeConfig.icon;

            return (
              <div
                key={n.id}
                className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xs hover:border-blue-200 hover:bg-white transition-all"
              >
                <div className={`p-2.5 rounded-xl border ${badgeConfig.bg} ${badgeConfig.iconColor} shrink-0 mt-0.5`}>
                  <IconComp className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">{n.title}</h3>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center text-center bg-white/50">
            <MessageSquare className="h-10 w-10 mb-2 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">Belum Ada Pemberitahuan Baru</h4>
            <p className="text-xs text-slate-400 mt-0.5">Semua pesan dan log aktivitas presensi akan muncul di sini secara real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
