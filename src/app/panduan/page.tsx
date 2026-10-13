import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  QrCode,
  ScanFace,
  BrainCircuit,
  Bell,
  BookOpen,
  Award,
  Smartphone,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Panduan Pengguna | Smart Learning",
  description: "Panduan lengkap penggunaan fitur Smart Learning untuk Siswa, Guru, Orang Tua, dan Administrator.",
};

const guides = [
  {
    role: "Siswa",
    badge: "Student Portal",
    color: "from-blue-600 to-indigo-600",
    features: [
      {
        title: "Presensi Mandiri & Face ID",
        icon: ScanFace,
        desc: "Daftarkan wajah sekali di menu profil/pendaftaran biometrik. Lakukan presensi kelas dengan memindai kode QR sesi atau verifikasi otomatis kamera kelas.",
      },
      {
        title: "Notebook Belajar Terpadu",
        icon: BookOpen,
        desc: "Akses materi pelajaran, modul unduhan offline, dan buat catatan pribadi langsung di bawah setiap materi mata pelajaran.",
      },
      {
        title: "Pengumpulan Tugas & AI Uji Lisan",
        icon: BrainCircuit,
        desc: "Kirimkan tugas berkas atau teks online. Sistem menyediakan fitur Uji Lisan interaktif berbasis AI untuk menguji pemahaman konsep secara mandiri.",
      },
      {
        title: "Jurnal Keaktifan Mingguan",
        icon: Award,
        desc: "Lihat rekaman atensi, interaksi bertanya di kelas, dan riwayat presensi yang terverifikasi dalam dashboard beranda.",
      },
    ],
  },
  {
    role: "Guru / Pendidik",
    badge: "Teacher Workspace",
    color: "from-emerald-600 to-teal-600",
    features: [
      {
        title: "Membuka Sesi Presensi & Kode QR Dinamis",
        icon: QrCode,
        desc: "Mulai sesi kelas pada menu Jadwal/Presensi untuk mengaktifkan kode QR sesi dinamis dan mengizinkan presensi siswa.",
      },
      {
        title: "Manajemen Bahan Ajar & Modul",
        icon: BookOpen,
        desc: "Unggah dokumen modul, materi presentasi, dan buat penugasan terstruktur untuk tiap rombel dan mata pelajaran.",
      },
      {
        title: "Penilaian & AI Pedagogical Nudge",
        icon: BrainCircuit,
        desc: "Periksa pengumpulan tugas siswa, evaluasi jawaban, dan terima ringkasan saran pedagogis otomatis terhadap pemahaman kelas.",
      },
      {
        title: "Pemantauan Kamera Kelas Live",
        icon: UserCheck,
        desc: "Pantau telemetri kehadiran visual ruang kelas secara real-time dan tinjau draf presensi otomatis sebelum dikunci.",
      },
    ],
  },
  {
    role: "Orang Tua / Wali",
    badge: "Parent Oversight",
    color: "from-purple-600 to-pink-600",
    features: [
      {
        title: "Notifikasi Kehadiran Real-Time",
        icon: Bell,
        desc: "Dapatkan pembaruan instan saat anak telah hadir, izin, atau mengalami keterlambatan masuk kelas.",
      },
      {
        title: "Rekap & Riwayat Presensi Bulanan",
        icon: ShieldCheck,
        desc: "Pantau grafik persentase kehadiran bulanan dan catatan kedisiplinan belajar tanpa perlu menunggu laporan cetak.",
      },
    ],
  },
  {
    role: "Administrator",
    badge: "School Admin Console",
    color: "from-amber-600 to-orange-600",
    features: [
      {
        title: "Master Data Sekolah",
        icon: ShieldCheck,
        desc: "Kelola data master kelas, rombel, akun siswa, guru, jadwal mingguan, dan kartu identitas QR.",
      },
      {
        title: "Audit & Laporan Akreditasi",
        icon: Award,
        desc: "Ekspor rekapitulasi presensi harian, bulanan, dan laporan siap cetak untuk keperluan administrasi dan akreditasi sekolah.",
      },
      {
        title: "Integrasi Perangkat & Kamera",
        icon: Smartphone,
        desc: "Konfigurasi engine kamera kelas, endpoint telemetri, dan kontrol izin push notifikasi instansi.",
      },
    ],
  },
];

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600/20 py-10 px-4 sm:px-6">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Top Header & Back Navigation */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div className="space-y-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Halaman Masuk
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Panduan Pengguna Smart Learning
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Instruksi komprehensif seluruh alur kerja & fitur berdasarkan peran pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Versi 4.1.0 Aktif
            </span>
          </div>
        </header>

        {/* Quick Tips: Instalasi PWA & Notifikasi */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tips Penggunaan: Pasang Aplikasi (PWA) & Izin Notifikasi
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/20">
              <p className="font-semibold text-slate-800 dark:text-white mb-1">Pasang ke Layar Utama (PWA)</p>
              <p>Klik tombol <strong>Pasang</strong> pada banner aplikasi atau menu browser (<em>Add to Home Screen</em>) agar dapat diakses tanpa mengetik alamat web dan hemat kuota.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/20">
              <p className="font-semibold text-slate-800 dark:text-white mb-1">Aktifkan Notifikasi</p>
              <p>Pilih <strong>Aktifkan</strong> saat dialog notifikasi muncul agar pengingat jadwal mengajar, tugas baru, dan presensi masuk tepat waktu.</p>
            </div>
          </div>
        </div>

        {/* Guides Per Role */}
        <div className="space-y-6">
          {guides.map((g) => (
            <div
              key={g.role}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Peran: {g.role}
                  </h2>
                  <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                    {g.badge}
                  </span>
                </div>
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.features.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.title}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-xs">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span>{feat.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
                        {feat.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info & Login redirect */}
        <footer className="pt-4 text-center space-y-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-98 transition-all"
          >
            <span>Sudah Paham? Masuk Sekarang</span>
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
          <p className="text-[10px] text-slate-400">
            Smart Learning • Ekosistem Presensi & Akademik Terpadu
          </p>
        </footer>
      </main>
    </div>
  );
}
