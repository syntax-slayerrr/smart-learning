"use client";

import React, { useState } from "react";
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
  Search,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Camera,
} from "lucide-react";

type RoleKey = "student" | "teacher" | "parent" | "admin";

interface StepGuide {
  title: string;
  badge: string;
  icon: React.ElementType;
  overview: string;
  steps: string[];
  tips?: string;
}

interface FaqItem {
  q: string;
  a: string;
}

const ROLES_DATA: Record<
  RoleKey,
  {
    name: string;
    tagline: string;
    icon: React.ElementType;
    color: string;
    badgeBg: string;
    guides: StepGuide[];
    faqs: FaqItem[];
  }
> = {
  student: {
    name: "Siswa",
    tagline: "Panduan presensi digital, tugas mandiri, dan catatan belajar",
    icon: GraduationCap,
    color: "blue",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-900/40",
    guides: [
      {
        title: "Presensi Mandiri via Scan QR Sesi",
        badge: "Fitur Presensi",
        icon: QrCode,
        overview: "Lakukan presensi kelas setiap jam pelajaran dimulai saat guru membuka sesi.",
        steps: [
          "Buka aplikasi Smart Learning di HP Anda.",
          "Pilih menu 'Scan QR' pada navigasi bawah.",
          "Arahkan kamera ke layar proyektor / HP guru yang menampilkan QR Sesi Dinamis.",
          "Sistem memverifikasi identitas Anda dan langsung mencatat kehadiran dengan status Hadir Tepat Waktu.",
        ],
        tips: "Pastikan izin kamera browser aktif. Kode QR guru berganti berkala untuk mencegah kecurangan titip absen.",
      },
      {
        title: "Pendaftaran & Verifikasi Face ID Biometrik",
        badge: "Fitur Biometrik",
        icon: ScanFace,
        overview: "Daftarkan wajah sekali agar presensi dapat terverifikasi otomatis oleh kamera ruang kelas.",
        steps: [
          "Masuk ke tab 'Profil' atau klik badge 'Daftar Biometrik' di beranda.",
          "Pilih tombol 'Daftarkan Wajah'. Berikan izin akses kamera saat diminta browser.",
          "Posisikan wajah Anda tepat di tengah bingkai lingkaran dengan pencahayaan terang.",
          "Tahan posisi 2 detik hingga indikator berubah hijau. Vektor wajah akan disimpan aman di IndexedDB perangkat & server.",
        ],
        tips: "Hindari penggunaan kacamata hitam atau masker saat pendaftaran. Setelah terdaftar, badge berubah menjadi '● Biometrik Aktif'.",
      },
      {
        title: "Membuka Modul & Notebook Catatan Belajar",
        badge: "Fitur Akademik",
        icon: BookOpen,
        overview: "Akses bahan ajar, unduh modul offline, dan simpan catatan belajar per mata pelajaran.",
        steps: [
          "Buka tab 'Notebook' di bilah navigasi bawah.",
          "Pilih mata pelajaran yang sedang dipelajari (misal: Rekayasa Perangkat Linier, Matematika).",
          "Klik materi untuk membaca ringkasan atau mengunduh bahan presentasi PDF/dokumen.",
          "Ketik poin penting pada kolom 'Catatan Saya' di bagian bawah materi. Catatan tersimpan otomatis.",
        ],
        tips: "Materi yang sudah dibuka tersimpan di cache lokal, tetap dapat dibaca meski koneksi internet tidak stabil.",
      },
      {
        title: "Pengumpulan Tugas & Uji Lisan AI",
        badge: "Fitur Evaluasi",
        icon: BrainCircuit,
        overview: "Kirimkan draf tugas dan uji pemahaman konsep secara interaktif sebelum dinilai guru.",
        steps: [
          "Buka menu 'Tugas' di beranda atau tab navigasi.",
          "Pilih tugas aktif, klik 'Kirim Jawaban' berupa teks online atau unggah berkas (PDF/DOCX).",
          "Setelah pengumpulan, Anda dapat mengaktifkan sesi 'Uji Lisan AI' untuk melatih argumen tugas.",
          "Jawab 3 pertanyaan interaktif AI terkait konsep yang Anda tulis. AI memberikan evaluasi pemahaman seketika.",
        ],
        tips: "Hasil uji lisan membantu guru memvalidasi orisinalitas tugas Anda tanpa perlu ujian tatap muka panjang.",
      },
    ],
    faqs: [
      {
        q: "Bagaimana jika kamera tidak bisa memindai QR guru?",
        a: "Pastikan izin kamera sudah diberikan di pengaturan browser (ikon gembok di sebelah kiri URL bar -> Izinkan Kamera). Jika ruangan gelap, minta guru memperbesar kecerahan layar.",
      },
      {
        q: "Apakah data wajah saya aman?",
        a: "Aman. Sistem tidak menyimpan foto wajah mentah Anda, melainkan hanya representasi vektor matematis terenkripsi untuk pencocokan kehadiran lokal dan kelas.",
      },
      {
        q: "Bagaimana jika tugas terlambat dikumpulkan?",
        a: "Tugas tetap dapat dikirim selama guru belum menutup total penugasan, namun sistem menandai pengumpulan dengan status 'Terlambat'.",
      },
    ],
  },
  teacher: {
    name: "Guru / Pendidik",
    tagline: "Pengelolaan sesi presensi kelas, bahan ajar, tugas, dan pemantauan AI",
    icon: UserCheck,
    color: "emerald",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40",
    guides: [
      {
        title: "Membuka Sesi Presensi & Menampilkan QR Dinamis",
        badge: "Manajemen Kelas",
        icon: QrCode,
        overview: "Buka sesi kelas baru saat jam pelajaran dimulai agar siswa dapat presensi mandiri.",
        steps: [
          "Buka menu 'Presensi' atau 'Jadwal Mengajar' di dashboard guru.",
          "Pilih rombel dan jam pelajaran yang sedang berlangsung, lalu klik tombol 'Mulai Sesi Presensi'.",
          "Klik 'Tampilkan QR Sesi' untuk membuka kode QR layar penuh (proyeksikan ke layar atau tunjukkan ke siswa).",
          "Kode QR berotasi otomatis setiap beberapa detik untuk memastikan presensi hanya dari siswa yang hadir fisik.",
        ],
        tips: "Setelah jam pelajaran selesai, klik 'Tutup Sesi' agar rekapitulasi kehadiran terkunci dan tersimpan ke buku nilai.",
      },
      {
        title: "Mengunggah Bahan Ajar & Membuat Penugasan",
        badge: "Bahan Ajar",
        icon: BookOpen,
        overview: "Distribusikan materi digital dan buat penugasan terstruktur untuk siswa.",
        steps: [
          "Masuk ke menu 'Bahan Ajar & Modul'.",
          "Klik 'Tambah Materi', pilih mata pelajaran, rombel target, dan unggah berkas modul (PDF/PPT/Docs).",
          "Untuk memberi tugas, masuk ke menu 'Tugas' lalu klik 'Buat Penugasan Baru'.",
          "Tentukan judul tugas, tenggat waktu pengumpulan, petunjuk teknis, serta opsi pengumpulan (Teks / File).",
        ],
        tips: "Materi yang diunggah otomatis tersedia di Notebook Belajar seluruh siswa di kelas yang dipilih.",
      },
      {
        title: "Memeriksa Tugas & Saran Pedagogis AI",
        badge: "Penilaian Cerdas",
        icon: BrainCircuit,
        overview: "Tinjau jawaban siswa, skor tugas, dan dapatkan ringkasan pemahaman kelas dari asisten AI.",
        steps: [
          "Pilih tugas pada daftar, lalu klik 'Lihat Pengumpulan'.",
          "Sistem menampilkan draf jawaban, berkas, serta ringkasan Uji Lisan AI yang telah dilakukan siswa.",
          "Gunakan fitur 'AI Pedagogical Nudge' untuk mendeteksi topik mana yang paling banyak disalahpahami siswa di kelas.",
          "Masukkan nilai angka dan catatan umpan balik, lalu klik 'Simpan & Publikasikan Nilai'.",
        ],
        tips: "Rekomendasi AI membantu Anda merancang materi remedial yang tepat sasaran pada pertemuan berikutnya.",
      },
      {
        title: "Monitoring Kamera Kelas & Konfirmasi Draf Otomatis",
        badge: "Telemetri Visual",
        icon: Camera,
        overview: "Tinjau hasil deteksi otomatis kamera sudut kelas dan verifikasi draf presensi sebelum dikunci.",
        steps: [
          "Masuk ke menu 'Kamera Kelas' saat sesi pelajaran aktif.",
          "Sistem menampilkan feed telemetri deteksi wajah siswa yang tertangkap kamera secara periodik.",
          "Draf kehadiran siswa otomatis tercentang berdasarkan confidence score deteksi.",
          "Guru cukup memeriksa anomali (misal siswa izin ke toilet) lalu mengonfirmasi draf kehadiran.",
        ],
        tips: "Guru tetap memegang kendali penuh untuk override manual status kehadiran siswa.",
      },
    ],
    faqs: [
      {
        q: "Bagaimana jika ada siswa yang tidak membawa HP?",
        a: "Guru dapat mengubah status kehadiran siswa secara manual menjadi 'Hadir' langsung dari tabel daftar hadir sesi tanpa memerlukan scan QR.",
      },
      {
        q: "Kapan notifikasi kehadiran terkirim ke orang tua?",
        a: "Notifikasi otomatis dikirim sesaat setelah siswa berhasil presensi atau saat guru menutup sesi kelas untuk siswa yang tidak hadir.",
      },
    ],
  },
  parent: {
    name: "Orang Tua / Wali",
    tagline: "Pengawasan kehadiran anak di sekolah secara real-time dan rekap kedisiplinan",
    icon: ShieldCheck,
    color: "purple",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-900/40",
    guides: [
      {
        title: "Menerima Notifikasi Kehadiran Real-Time",
        badge: "Notifikasi Instan",
        icon: Bell,
        overview: "Dapatkan pembaruan langsung begitu anak memindai presensi di sekolah.",
        steps: [
          "Pastikan notifikasi browser telah diizinkan saat pertama kali membuka aplikasi.",
          "Saat anak hadir di sekolah, notifikasi push akan muncul di layar HP Anda memberitahukan jam kedatangan.",
          "Jika anak terlambat atau belum hadir setelah jam masuk sekolah, sistem mengirimkan pesan peringatan.",
        ],
        tips: "Instal aplikasi ke layar utama (PWA) agar notifikasi masuk layaknya aplikasi pesan.",
      },
      {
        title: "Melihat Riwayat & Rekapitulasi Presensi Bulanan",
        badge: "Monitoring",
        icon: Award,
        overview: "Periksa grafik persentase kehadiran dan riwayat jam belajar anak setiap bulan.",
        steps: [
          "Buka beranda akun Orang Tua.",
          "Lihat kartu ringkasan: Persentase Kehadiran (%), Total Hadir, Sakit, Izin, dan Alpa.",
          "Pilih menu 'Riwayat Kehadiran' untuk melihat rincian tanggal, nama mata pelajaran, dan guru pengajar.",
        ],
        tips: "Data kehadiran terintegrasi langsung dengan database akademik resmi sekolah.",
      },
    ],
    faqs: [
      {
        q: "Bagaimana cara mengajukan surat izin sakit anak?",
        a: "Hubungi wali kelas atau gunakan kontak administrasi sekolah yang tertera pada kartu profil untuk validasi surat dokter.",
      },
      {
        q: "Apakah satu akun wali murid bisa memantau lebih dari 1 anak?",
        a: "Bisa, jika kedua anak bersekolah di instansi yang sama, akun wali murid akan memiliki pilihan tombol switch profil anak di bagian atas.",
      },
    ],
  },
  admin: {
    name: "Administrator",
    tagline: "Konfigurasi master data sekolah, kartu QR, laporan akreditasi, dan audit",
    icon: Smartphone,
    color: "amber",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/40",
    guides: [
      {
        title: "Pengelolaan Master Data (Kelas, Siswa, Guru, Jadwal)",
        badge: "Master Data",
        icon: ShieldCheck,
        overview: "Kelola akun pengguna dan struktur akademik sekolah setiap tahun ajaran baru.",
        steps: [
          "Buka sidebar Administrator, pilih menu 'Kelas & Rombel' atau 'Siswa' / 'Guru'.",
          "Gunakan tombol 'Tambah' untuk input satuan atau 'Import CSV' untuk memasukkan data rombel secara massal.",
          "Atur jadwal pelajaran mingguan di menu 'Jadwal' agar sesi presensi guru muncul otomatis.",
        ],
      },
      {
        title: "Cetak Kartu Identitas QR Siswa & Guru",
        badge: "Cetak Fisik",
        icon: QrCode,
        overview: "Cetak kartu ID fisik ber-QR untuk cadangan presensi scanner gerbang/kelas.",
        steps: [
          "Buka menu 'Data Siswa' atau 'Data Kelas'.",
          "Klik tombol 'Cetak Kartu QR'. Sistem menampilkan layout kartu siap cetak dengan barcode/QR terenkripsi.",
          "Pilih printer atau cetak langsung ke format PDF resolusi tinggi.",
        ],
      },
      {
        title: "Ekspor Laporan Bulanan & Akreditasi",
        badge: "Pelaporan Resmi",
        icon: Award,
        overview: "Hasilkan dokumen rekapitulasi kehadiran untuk dinas pendidikan dan audit akreditasi.",
        steps: [
          "Pilih menu 'Laporan & Akreditasi' pada menu utama.",
          "Filter rentang tanggal (Harian, Mingguan, Bulanan) dan pilih rombel target.",
          "Klik 'Ekspor Rekapitulasi (PDF/Excel)' untuk mengunduh laporan berformat resmi dengan stempel digital.",
        ],
      },
    ],
    faqs: [
      {
        q: "Bagaimana cara mereset password akun guru atau siswa yang lupa?",
        a: "Buka menu 'Siswa' atau 'Guru', cari nama pengguna yang bersangkutan, klik ikon opsi (titik tiga) lalu pilih 'Reset Password ke Default'.",
      },
      {
        q: "Di mana konfigurasi push notification instansi diatur?",
        a: "Buka menu 'Pengaturan Sistem' -> 'Notifikasi & WebPush' untuk memasukkan kredensial VAPID sekolah.",
      },
    ],
  },
};

export default function PanduanPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const currentRoleData = ROLES_DATA[activeRole];

  // Filter fitur berdasarkan search bar jika ada input
  const filteredGuides = currentRoleData.guides.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      g.overview.toLowerCase().includes(q) ||
      g.steps.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600/20 py-8 px-4 sm:px-6">
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="space-y-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Halaman Masuk
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Pusat Panduan & Bantuan
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Instruksi praktis langkah demi langkah seluruh fitur Smart Learning.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Dokumentasi Lengkap 4 Role
          </span>
        </header>

        {/* Quick Help: PWA & Kamera Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Instalasi Aplikasi Cepat (PWA)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Klik tombol <strong>Pasang</strong> pada banner aplikasi atau menu browser (<em>Add to Home Screen</em>). Aplikasi dapat diakses instan tanpa mengetik URL dan jauh lebih hemat kuota.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Izin Notifikasi & Kamera</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Jika kamera tidak muncul atau notifikasi terhambat, klik ikon gembok pada URL browser, pilih <strong>Izinkan Kamera & Notifikasi</strong>, lalu muat ulang halaman.
            </p>
          </div>
        </div>

        {/* Interactive Search Bar & Role Tabs */}
        <div className="space-y-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari fitur atau langkah (cth: presensi, scan qr, tugas, modul, kamera)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-2xs transition-all"
            />
          </div>

          {/* Role Tab Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["student", "teacher", "parent", "admin"] as RoleKey[]).map((roleKey) => {
              const r = ROLES_DATA[roleKey];
              const Icon = r.icon;
              const isActive = activeRole === roleKey;
              return (
                <button
                  key={roleKey}
                  onClick={() => {
                    setActiveRole(roleKey);
                    setOpenFaqIndex(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs scale-[1.01]"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span className="truncate">{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Overview Heading */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Panduan Peran: {currentRoleData.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentRoleData.tagline}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${currentRoleData.badgeBg}`}>
            {currentRoleData.guides.length} Alur Utama
          </span>
        </div>

        {/* Feature Guides: Step-by-Step Cards */}
        <div className="space-y-4">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/50">
              <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">
                Tidak ada panduan yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const GuideIcon = guide.icon;
              return (
                <div
                  key={guide.title}
                  className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                        <GuideIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {guide.badge}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {guide.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {guide.overview}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Numbered Steps */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-100 dark:border-white/5 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Langkah-langkah:
                    </p>
                    <ol className="space-y-1.5">
                      {guide.steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                            {sIdx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips Note if available */}
                  {guide.tips && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/30 rounded-xl p-2.5">
                      <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <span>{guide.tips}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FAQ Accordion Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tanya Jawab & Solusi Kendala ({currentRoleData.name})
            </h3>
          </div>

          <div className="space-y-2">
            {currentRoleData.faqs.map((faq, fIdx) => {
              const isOpen = openFaqIndex === fIdx;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/40 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-2">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer info & CTA */}
        <footer className="pt-2 text-center space-y-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-98 transition-all"
          >
            <span>Sudah Paham? Masuk ke Sistem</span>
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
          <p className="text-[10px] text-slate-400">
            Smart Learning • Ekosistem Presensi & Pembelajaran Terpadu
          </p>
        </footer>
      </main>
    </div>
  );
}
