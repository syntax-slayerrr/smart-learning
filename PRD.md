# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Smart Learning: AI Classroom Intelligence & Campus Ecosystem

**Versi:** 4.1.0  
**Target:** Smart Learning Ecosystem (Web Platform, LMS & Edge AI)

---

## 1. Ringkasan Produk & Visi
**Smart Learning** adalah ekosistem digital terintegrasi untuk institusi pendidikan (SMK/SMA/Kampus) yang menggabungkan:
1. **LMS & Akademik:** Portal materi, tugas mandiri, kuis adaptif, buku catatan digital (*notebook*), dan uji lisan (*defense*).
2. **Presensi & Verifikasi Wajah:** Verifikasi kehadiran cepat berbasis Face ID, deteksi keterlambatan, dan pemantauan guru piket.
3. **Analitik Dinamika Belajar (Edge Vision):** Analisis postur spasial dan interaksi belajar kelas secara objektif tanpa menyimpan rekaman video (*Privacy-by-Design*).
4. **Notifikasi Intervensi:** Gateway otomatisasi WhatsApp ke orang tua untuk monitoring kehadiran dan status belajar siswa berisiko (*At-Risk Students*).

Prinsip utama: **Objektif, Membantu Guru & Siswa, serta Menghormati Privasi (UU PDP No. 27/2022).**

---

## 2. Pengguna Sistem (User Roles)
* **Siswa:** Akses materi, notebook/catatan konsep, kerjakan tugas/kuis, lihat jadwal dan presensi harian.
* **Guru:** Kelola kelas, materi ajar, bank tugas/evaluasi, buka sesi kelas/presensi, dan pantau dinamika belajar.
* **Orang Tua:** Pantau rekap kehadiran harian dan menerima laporan notifikasi resmi via WhatsApp.
* **Admin / Staf Piket:** Kelola data master (siswa, guru, kelas, mata pelajaran, jadwal), scanner presensi gerbang, dan laporan akreditasi.

---

## 3. Fitur Utama & Ruang Lingkup MVP

| Modul | Komponen | Deskripsi & Target |
| :--- | :--- | :--- |
| **LMS & Notebook** | `student/notebook` | Silabus berbasis database, materi per bab, kuis adaptif, dan metrik riil (Modul, Rerata Nilai, Tugas Aktif). |
| **Presensi Cerdas** | `scanner` & Face ID | Presensi otomatis via scan QR/Wajah, log realtime ke Supabase, proteksi multi-role. |
| **Edge Vision Engine** | `cv_engine` / Python | Deteksi posisi duduk/berdiri, angkat tangan, dan mobilitas pengajar. Zero video retention di disk. |
| **WhatsApp Gateway** | `services/whatsapp` | Pengiriman notifikasi kehadiran, rekap mingguan, dan peringatan intervensi dini. |

---

## 4. Perlindungan Data & Privasi (Privacy-by-Design)
1. **Zero Video Retention:** Stream kamera diproses langsung di RAM (in-memory) dan tidak disimpan dalam bentuk file video permanen.
2. **Aktivasi Terjadwal:** Kamera hanya aktif saat sesi pelajaran berstatus aktif.
3. **Keamanan Data:** Autentikasi berbasis Supabase Auth dengan Row Level Security (RLS) pada seluruh tabel database.
