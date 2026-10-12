# SYNTAX SLAYER SMART LEARNING — Deployment & Operational Runbook
### Panduan Instalasi, Konfigurasi Lingkungan & Operasional Produksi Resmi

---

## 🏛️ 1. Arsitektur Sistem Produksi

Platform **SYNTAX SLAYER SMART LEARNING** beroperasi dengan arsitektur hibrida (Edge AI + Cloud/Local Fullstack):

```
┌─────────────────────────────────┐        HTTP Stream / Ingest         ┌─────────────────────────────────┐
│     EDGE VISION CAMERA ENGINE   │ ──────────────────────────────────> │      NEXT.JS 16 WEB PLATFORM    │
│  (Python 3.12 • YOLO • ArcFace) │   :5000/video_feed & Telemetry      │ (App Router • SSR • TypeScript) │
│       Port 5000 (Headless)      │                                     │       Port 3000 (HTTP/PWA)      │
└─────────────────────────────────┘                                     └─────────────────────────────────┘
                                                                                         │
                                                                                         ▼
                                                                        ┌─────────────────────────────────┐
                                                                        │       SUPABASE DATABASE         │
                                                                        │  PostgreSQL • Auth • Realtime   │
                                                                        └─────────────────────────────────┘
```

* **Frontend & Backend API:** Next.js 16 (Turbopack, TypeScript, Tailwind CSS v4) di Port `3000`.
* **Edge Vision AI Engine:** Python 3.12 (OpenCV, YOLO26n, ArcFace 512-d, ByteTracker) di Port `5000`.
* **Database & Auth:** Supabase PostgreSQL (Row Level Security & Database Realtime).
* **Monitoring & Health Probe:** `/api/health` (HTTP 200 JSON Diagnostic).

---

## 🚀 2. Prasyarat Perangkat Keras & Lunak (Prerequisites)

* **Node.js:** Versi 18.x atau 20.x LTS ([nodejs.org](https://nodejs.org))
* **Python:** Versi 3.10 – 3.12 (Disarankan virtualenv `.venv312`)
* **Kamera:** Webcam USB, Webcam Laptop bawaan, atau Kamera HP Android via Wi-Fi (*IP Webcam app*)
* **Akun Supabase:** Proyek PostgreSQL aktif ([supabase.com](https://supabase.com))

---

## ⚙️ 3. Konfigurasi Lingkungan (`.env.local`)

Salin berkas contoh konfigurasi:
```bash
cp .env.example .env.local
```

Isi variabel lingkungan pada `.env.local`:
```env
# --- Branding Nama Institusi / Sekolah (White-label Support) ---
NEXT_PUBLIC_SCHOOL_NAME="SYNTAX SLAYER SMART LEARNING"
NEXT_PUBLIC_SCHOOL_TAGLINE="AI Smart Learning Ecosystem"

# --- Supabase Database & Auth ---
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# --- Keamanan Kamera Edge (Shared Token) ---
EDGE_DEVICE_SECRET="dev-edge-secret-key-2026"
NEXT_PUBLIC_EDGE_SERVER="http://localhost:5000"

# --- Web Push Protocol (VAPID) ---
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your_vapid_public_key"
VAPID_PRIVATE_KEY="your_vapid_private_key"
VAPID_SUBJECT="mailto:admin@slayer.test"

# --- AI Gateway (Opsional untuk Socratic Tutor & Smart AI Assistant) ---
NINEROUTER_BASE_URL="http://127.0.0.1:20128/v1"
NINEROUTER_API_KEY="your_api_key"
GROQ_API_KEY="gsk_your_groq_key"
```

---

## 🏃 4. Cara Menjalankan Sistem

### A. Sekali Klik di Windows (Direkomendasikan)
Cukup jalankan file batch launcher di folder utama proyek:
* **`START_SEMUA.bat`** → Otomatis menyalakan Edge CV Engine (:5000), Next.js Dashboard (:3000), dan membuka web browser.
* **`START_AI_KAMERA.bat`** → Menyalakan AI Vision Camera Engine secara mandiri di background.

### B. Manual via Terminal
1. **Jalankan Edge Vision Engine (Python):**
   ```bash
   .venv312\Scripts\python.exe experiments/cv-poc/main.py --source 0 --port 5000 --headless
   ```
2. **Jalankan Next.js Web Platform:**
   ```bash
   npm run dev
   # atau untuk mode produksi:
   npm run build
   npm run start
   ```

Akses aplikasi di browser: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 5. Akun Akses Awal & Manajemen Data (Database Management)

### A. Kredensial Master Admin (Clean Database State)
Setelah proses pembersihan data (*mock data purge*), database dalam status **bersih (clean slate)** dengan 1 akun administrator utama untuk menginput data sekolah asli:

| Peran (Role) | Alamat Email | Kata Sandi | Deskripsi Akses |
|---|---|---|---|
| **Master Admin** | `admin@slayer.test` | `password123` | Akses penuh dashboard, konfigurasi sekolah, pendaftaran kelas, guru & siswa asli |

### B. Skrip Utilitas Database (Maintenance Scripts)
* **Membersihkan Semua Mock Data (Reset Bersih):**
  ```bash
  node scripts/clean-mock-data.js
  ```
  *Mengosongkan 171.000+ baris telemetri, tabel LMS, siswa, guru, kelas dummy, dan mempertahankan master admin `admin@slayer.test`.*

* **Mengisi Ulang Mock Data Pengujian (Khusus Demo / Staging):**
  ```bash
  node scripts/seed-complete-database.js
  ```

> *Catatan:* Domain `@slayer.test` mengikuti standar **RFC 2606** (Reserved Domain) sehingga aman dari pengiriman email yang tidak diinginkan ke internet publik.

---

## 🏥 6. Pemantauan & Diagnostik Otomatis (Health Monitoring)

Platform menyediakan endpoint diagnostik bawaan untuk Uptime Monitoring (UptimeRobot, BetterStack, atau Docker Probe):

```bash
curl http://localhost:3000/api/health
```

**Contoh Output Respons HTTP 200 OK:**
```json
{
  "status": "healthy",
  "school": "SYNTAX SLAYER SMART LEARNING",
  "timestamp": "2026-10-10T10:52:04.228Z",
  "version": "1.0.0",
  "uptimeSeconds": 180,
  "services": {
    "database": {
      "status": "connected",
      "latencyMs": 142
    },
    "edgeVisionCamera": {
      "status": "online",
      "url": "http://localhost:5000",
      "latencyMs": 6
    }
  },
  "responseTimeMs": 148
}
```

---

## 🧹 7. Pemeliharaan Basis Data & Cron Otomatis (Maintenance)

Disediakan endpoint cron untuk menjaga kestabilan kapasitas basis data:

1. **Tutup Sesi Otomatis & Notifikasi:**
   * **Endpoint:** `GET /api/cron/close-sessions`
   * **Jadwal:** Tiap 30 menit atau setiap akhir jam sekolah (16:00 WIB).
   * **Fungsi:** Menutup sesi absensi aktif yang telah kadaluarsa dan mengirim laporan ringkasan.

2. **Rotasi Log Telemetri Mentah (14 Hari):**
   * **Endpoint:** `GET /api/cron/cleanup-telemetry?days=14`
   * **Jadwal:** Tiap hari minggu pukul 01:00 WIB.
   * **Guardrail:** HANYA memangkas frame-per-second mentah di `classroom_telemetry`. Data presensi resmi (`attendance_records`) dan sesi kelas **tetap 100% permanen**.

---

## 🖨️ 8. Panduan Cetak Fisik & Format A4

* Platform telah dilengkapi **Production Print Engine** terpusat di `globals.css`.
* Saat mencetak kartu absensi siswa ([`/admin/classes/print-cards/[id]`](file:///d:/.VSCODE/smart-learning/src/app/(dashboard)/admin/classes/print-cards/[id]/print-class-client.tsx)) atau dokumen akreditasi:
  * Gunakan opsi kertas **A4** dengan orientasi **Portrait** atau **Landscape** sesuai pratinjau.
  * Seluruh sidebar, header navigasi, tombol kontrol, dan floating widget disembunyikan secara otomatis.
  * Latar belakang dicetak putih murni bebas noda grafis untuk menghemat tinta printer.

---

## ☁️ 9. Panduan Deploy Python CV Engine di Deplexo

Platform [Deplexo](https://deplexo.com) digunakan untuk menjalankan kontainer Docker Python CV Engine di cloud secara *always-on* dengan HTTPS otomatis.

### A. Berkas Konfigurasi yang Telah Disiapkan
1. `experiments/cv-poc/Dockerfile`: Base Python 3.12-slim, dependensi headless OpenCV/MediaPipe, port 5000, serta healthcheck `/status`.
2. `experiments/cv-poc/.dockerignore`: Memangkas file gambar/cache agar build context cepat dan ringan.
3. `experiments/cv-poc/deplexo.yaml`: Menetapkan framework `dockerfile` dan port `5000`.

### B. Langkah Deploy di Deplexo Dashboard
1. Buka [deplexo.com](https://deplexo.com) dan login dengan akun GitHub kamu.
2. Klik **Deploy new** / **New Project** → Pilih repository `smart-learning`.
3. Pada form konfigurasi:
   * **Root Directory:** `experiments/cv-poc` *(Wajib diisi agar Deplexo mendeteksi Dockerfile Python, bukan Next.js)*
   * **Branch:** `main` (atau branch produksi kamu)
   * **Port:** `5000`
4. Di tab **Environment Variables**, tambahkan:
   * `CAMERA_SOURCE`: URL RTSP atau IP Webcam kamu (contoh: `http://10.10.10.33:8080/video` atau URL streaming CCTV publik/VPN)
   * `API_URL`: `https://smart-learning-black.vercel.app/api/telemetry/ingest`
   * `DEVICE_KEY`: Isi dengan nilai secret `EDGE_DEVICE_SECRET` kamu
   * `SESSION_ID`: `00000000-0000-0000-0000-000000000001` (opsional)
5. Klik **Deploy**. Tunggu proses build selesai hingga status menjadi `running` dan Deplexo memberikan URL HTTPS (misal: `https://cv-engine.de.deplexo.com`).

### C. Sambungkan ke Next.js (Vercel)
Setelah kontainer aktif di Deplexo:
1. Buka dashboard Vercel → Project Settings → **Environment Variables**.
2. Perbarui / tambahkan:
   * `NEXT_PUBLIC_EDGE_SERVER`: `https://cv-engine.de.deplexo.com`
   * `CV_ENGINE_URL`: `https://cv-engine.de.deplexo.com`
3. Lakukan **Redeploy** di Vercel agar perubahan URL tersimpan ke frontend produksi.

