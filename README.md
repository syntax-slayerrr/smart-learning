# 🎓 SMART LEARNING — AI CLASSROOM INTELLIGENCE & CAMPUS ECOSYSTEM
### Platform Analitik Pembelajaran & Pemantauan Pedagogis Berbasis AI
**Tim Pengembang: SYNTAX SLAYER • Versi Enterprise 4.1.0**

Platform terintegrasi yang menghubungkan **Edge Computer Vision Intelligence** (Python, YOLO26n, MediaPipe Heavy 3D, ArcFace 512-d) dengan **Fullstack Web Platform** (Next.js 16, TypeScript, Supabase PostgreSQL, Tailwind CSS) untuk mendeteksi dinamika belajar di kelas, kehadiran siswa, intervensi dini siswa berisiko (*At-Risk Students*), dan pelaporan otomatis ke orang tua melalui WhatsApp.

---

## 👥 Pembagian Tugas & Tanggung Jawab Tim (3 Developers)

Seluruh arsitektur proyek dibagi menjadi **3 pilar spesialisasi independen** dengan batas modul yang jelas (*clean separation of concerns*) sehingga 3 developer dapat bekerja secara paralel tanpa konflik Git (*zero merge conflicts*):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                      SMART LEARNING ECOSYSTEM — ARSITEKTUR 3 DEVELOPER                      │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│         DEVELOPER 1          │         DEVELOPER 2          │          DEVELOPER 3          │
│       AI & Vision Lead       │  Backend, Telemetry & Data   │  Frontend, Stream & UI/UX     │
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────┤
│ 📂 experiments/cv-poc/       │ 📂 src/app/api/              │ 📂 src/components/dashboard/  │
│    └── cv_engine/core/       │    ├── telemetry/ingest/     │    ├── live-camera-monitor    │
│    • detector.py (YOLO26n)   │    ├── attendance/           │    ├── session-dynamics       │
│    • pose.py (MediaPipe 3D)  │    └── notifications/        │    └── at-risk-students       │
│    • face.py (ArcFace 512-d) │ 📂 src/services/             │ 📂 src/app/(dashboard)/       │
│    • kinematics.py (Sudut)   │    ├── student-analytics.ts  │    ├── admin/                 │
│    • tracker.py (5 Guards)   │    └── whatsapp.ts           │    ├── teacher/               │
│ 📂 experiments/cv-poc/       │ 📂 src/lib/supabase/         │    ├── parent/                │
│    • classroom_poc.py        │    └── schemas & migrations  │    └── student/               │
│    • main.py                 │ 📂 cv_engine/telemetry/      │ 📂 cv_engine/streaming/       │
│                              │    • schemas & dispatcher    │    └── camera.py & hud.py     │
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────┤
│ Tanggung Jawab Utama:        │ Tanggung Jawab Utama:        │ Tanggung Jawab Utama:         │
│ 1. Inferensi YOLO26n ONNX    │ 1. Endpoint Ingest Telemetri │ 1. Live Camera Monitor HUD    │
│    CPU AVX2 (~45ms)          │    (/api/telemetry/ingest)   │    dengan siaran video 45 FPS │
│ 2. MediaPipe Heavy 33-pt 3D  │ 2. Mesin Skoring Risiko      │ 2. Panel Analitik Interaktif  │
│    estimasi sendi tubuh      │    Komposit Siswa (O(N) DSA) │    (Recharts & Lucide Icons)  │
│ 3. ArcFace 512-d Biometrik   │ 3. Database Supabase & RLS   │ 3. Dashboard Multi-Role       │
│    pengenalan wajah siswa    │    (PostgreSQL schema)       │    (Admin, Guru, Ortu, Siswa) │
│ 4. 5 Enterprise Guardrails   │ 4. Gateway Notifikasi WA     │ 4. Desain Sistem Anti-Slop    │
│    kinematika & energi       │    (Fonnte API otomatis)     │    (Warm Canvas & Zinc Theme) │
│                              │                              │                               │
│ Git Branch:                  │ Git Branch:                  │ Git Branch:                   │
│ feature/dev1-vision-core     │ feature/dev2-backend-data    │ feature/dev3-frontend-stream  │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 🏛️ Arsitektur Pipeline Aliran Data End-to-End

```mermaid
flowchart TD
    subgraph EdgeDevice["1. Edge Box / Kamera Kelas (Dev 1 & Dev 3)"]
        CAM[Kamera HP / RTSP / Webcam] --> TC[KameraUtasTerpisah: Buffer 1-Frame Zero Lag]
        TC --> YOLO[YOLO26n ONNX: Detektor Spasial Makro]
        TC --> MP[MediaPipe Heavy 3D: Kerangka Sendi Anatomi]
        TC --> FACE[ArcFace 512-d: Pengenal Biometrik Wajah]
        YOLO --> TRACK[PelacakSubjekKelas: 5 Enterprise Guardrails]
        MP --> TRACK
        FACE --> TRACK
        TRACK --> HUD[Renderer Cyber-HUD & MJPEG Server :5000]
        TRACK --> DISP[PengirimTelemetriAsinkron: Bounded FIFO Queue]
    end

    subgraph BackendAPI["2. Next.js & Supabase Cloud (Dev 2)"]
        DISP -->|HTTP POST JSON Tiap 2s| INGEST[/api/telemetry/ingest]
        INGEST --> DB[(Supabase PostgreSQL: classroom_telemetry)]
        INGEST --> INMEM[In-Memory Sliding Buffer: 50 Slices]
        DB --> ANALYTICS[Layanan Analitik Siswa: Skoring Komposit O(N)]
        ANALYTICS --> WA[Gateway WhatsApp: Notifikasi Intervensi Ortu]
    end

    subgraph ClientDashboards["3. Antarmuka Web Interaktif (Dev 3)"]
        HUD -->|MJPEG Feed 45 FPS| LIVE[Live Camera Monitor Component]
        INMEM -->|Polling / Realtime| LIVE
        ANALYTICS --> ADM[Dashboard Admin: Tren Seluruh Sekolah]
        ANALYTICS --> TCH[Dashboard Guru: Rekap Sesi & Siswa Berisiko]
        ANALYTICS --> PRN[Portal Orang Tua: Pemantauan Keterlibatan Anak]
    end
```

---

## 📊 Matriks Struktur Data & Algoritma (DSA Matrix) Seluruh Proyek

Proyek ini menerapkan konsep **Struktur Data & Algoritma (DSA)** tingkat enterprise di setiap lapisan teknisnya:

| Lapisan Teknis | Komponen / Berkas | Struktur Data yang Digunakan | Algoritma yang Diterapkan | Kompleksitas Waktu ($O$) | Kompleksitas Ruang ($O$) | Peran Teknis & Alasan Pemilihan |
|---|---|---|---|---|---|---|
| **Edge AI** | `cv_engine/core/detector.py` | Tensor 4D `float32` `(1, 3, 320, 320)` | **End-to-End One-to-One Hungarian Head** | $O(1)$ konstan pada CPU AVX2 (~45ms) | $O(1)$ alokasi buffer tetap | Deteksi makro tanpa NMS; bebas kotak ganda saat siswa duduk berdekatan. |
| **Edge AI** | `cv_engine/core/pose.py` | Graf Topologi 33 Titik Verteks 3D | **Landmark Coordinate Regression via XNNPACK** | $O(P \cdot K)$ ($P \le 4$, $K=33$) | $O(K)$ koordinat sendi | Meregresikan sendi anatomi 3D untuk analisis sudut siku dan gestur. |
| **Edge AI** | `cv_engine/core/face.py` | Vektor $512$-Dimensi $L_2$-Normalized | **Umeyama Similarity Transform + Cosine Dot** | $O(D)$ di mana $D=512$ | $O(D)$ (~2 KB/profil) | Mengunci identitas siswa berdasarkan kemiripan kosinus biometrik wajah. |
| **Edge AI** | `cv_engine/core/kinematics.py` | Vektor 2D Bahu-Siku-Pergelangan | **Vector Dot-Product Trigonometry** | $O(1)$ perhitungan sudut siku | $O(1)$ memori | Menghitung $\theta \ge 105^\circ$ untuk eliminasi false positive dari garuk kepala/kacamata. |
| **Edge AI** | `cv_engine/core/tracker.py` | `collections.deque(maxlen=8)` (Ring Buffer) | **Sliding Window Numerical Derivative** ($v = \frac{\Delta d}{\Delta t}$) | $O(1)$ per pembaruan | $O(1)$ geser konstan | Menghitung kecepatan tangan ($v > 0.015$) agar siswa tekun menulis tidak dituduh tidur. |
| **Edge AI** | `cv_engine/core/tracker.py` | Hash Table State Tracker | **Exponential Moving Average (EMA) Coordinate Filter** | $O(N)$ di mana $N$ adalah jumlah siswa | $O(N)$ | $S_t = 0.22 Y_t + 0.78 S_{t-1}$. Menghasilkan bounding box tenang bebas getaran (*zero jitter*). |
| **Edge AI** | `cv_engine/core/tracker.py` | Hash Table Vote Counter | **Majority Voting Temporal Latching** | $O(1)$ per frame | $O(1)$ | Mengunci nama siswa ke kursi setelah $\ge 2$ match; nama tidak hilang saat menunduk. |
| **Edge AI** | `cv_engine/core/tracker.py` | Time-To-Live (TTL) Eviction Queue | **Seat-Anchored Re-ID Grace Period** | $O(N)$ per siklus | $O(N)$ | Menoleransi oklusi 4 detik saat ada orang lewat tanpa reset ID/nama siswa. |
| **Edge Stream**| `cv_engine/streaming/camera.py` | Atomic Swap Frame Buffer | **Double-Buffering Swap** (`BUFFERSIZE=1`) | $O(1)$ per pembacaan | $O(1)$ 1 citra aktif | Menjamin latensi streaming selalu 0ms (tidak ada penumpukan antrean video). |
| **Edge Stream**| `cv_engine/telemetry/dispatcher.py` | Bounded FIFO Queue (`maxsize=100`) | **Producer-Consumer Pattern** | $O(1)$ enqueue / dequeue | $O(B)$ ($B \le 100$) | Mencegah Out-Of-Memory (OOM) jika internet putus; kirim HTTP tanpa mengorbankan FPS. |
| **Backend API**| `src/app/api/telemetry/ingest/` | Circular Ring Buffer In-Memory (Array 50 Slices) | **Sliding Window Time-Series Buffer** | $O(1)$ push / $O(K)$ unshift ($K=50$) | $O(K)$ memori tetap | Menyimpan 50 irisan telemetri terkini untuk grafik visualisasi live monitor tanpa query DB terus-menerus. |
| **Backend API**| `src/lib/rate-limit.ts` | Hash Map (`Map<string, RateLimitEntry>`) | **Fixed Window Token Counter with TTL Purge** | $O(1)$ pemeriksaan batas laju | $O(U)$ untuk $U$ IP aktif | Melindungi endpoint dari serangan brute-force dan spam permintaan. |
| **Analytics**  | `src/services/student-analytics.ts` | Hash Map Bucket (`Map<studentId, Records>`) | **Linear-Time Grouping & Single-Pass Reduction** | **$O(N + R + P)$ (Linear)** *(Optimasi dari naif $O(N^2)$)* | $O(N + P)$ | Menghitung rasio kehadiran, insiden tidur, dan skor komposit risiko siswa dalam 1 kali lintasan (*single-pass*). |
| **Frontend**   | `src/components/dashboard/live-camera-monitor.tsx` | Objek Akumulator Frekuensi | **Single-Pass Histogram Reduction** | $O(S)$ untuk $S$ subjek | $O(1)$ | Mengagregasi status fokus, menulis, angkat tangan, dan tidur dalam 1 loop tanpa perulangan redundan. |

---

## 📖 Kamus Terminologi & Glosarium Presentasi (Bahasa Indonesia)

Glosarium ini dibuat agar seluruh anggota tim dapat menjelaskan teknologi kepada juri/evaluator menggunakan istilah baku Bahasa Indonesia yang jelas dan berbobot:

| Istilah Teknis Asli | Istilah Baku Bahasa Indonesia | Cara Menjelaskan Saat Presentasi ke Penguji / Juri |
|---|---|---|
| **YOLO26 Macro Detector** | *Detektor Spasial Makro* | *"Model AI yang mendeteksi posisi kotak seluruh siswa dalam kelas secara instan dengan arsitektur NMS-free yang bebas dari kotak ganda."* |
| **MediaPipe Heavy 3D** | *Pelacak Kerangka Anatomi 3D* | *"Model AI yang membaca 33 titik sendi anatomi tubuh manusia secara 3 dimensi untuk mengetahui postur duduk, berdiri, dan arah kepala."* |
| **ArcFace 512-d Biometrics** | *Mesin Biometrik Fitur Wajah 512-d* | *"Model AI yang mengekstrak sidik biometrik wajah siswa menjadi 512 angka matematis dan mencocokkannya ke database profil kelas."* |
| **SubjectTracker** | *Pelacak Subjek Spasio-Temporal* | *"Komponen yang menjaga agar ID dan nama siswa tetap konsisten dari detik ke detik menggunakan fusi spasial dan filter matematika terpadu."* |
| **Elbow Angle Kinematics** | *Kinematika Sudut Siku* | *"Filter trigonometri sudut siku $\ge 105^\circ$ agar gerakan menggaruk kepala atau membetulkan kacamata tidak salah terhitung sebagai angkat tangan."* |
| **Hand Motion Energy** | *Verifikator Energi Kinetik Tangan* | *"Algoritma sliding window yang menghitung kecepatan tangan di meja. Siswa yang tekun menulis dilarang divonis tidur meskipun kepalanya menunduk."* |
| **Temporal Identity Voting** | *Buffer Voting Identitas Temporal* | *"Sistem penguncian kursi yang menuntut minimal 2 kecocokan wajah berturut-turut sebelum mengunci nama siswa pada kursi tersebut."* |
| **EMA Smoothing** | *Filter Penghalus Rata-Rata Bergerak Eksponensial* | *"Filter koordinat ($0.22 \times \text{baru} + 0.78 \times \text{lama}$) agar kotak HUD terlihat tenang, rapi, dan bebas kedipan (*zero jitter*)."* |
| **Seat-Anchored Re-ID** | *Penahan Identitas Kursi Toleransi Oklusi* | *"Mekanisme toleransi 4 detik saat siswa terhalang orang lewat, sehingga nama siswa langsung pulih tanpa membuat ID baru."* |
| **Composite Risk Scoring** | *Skor Komposit Risiko Siswa* | *"Formula terbobot ($0.6 \times \text{Ketidakhadiran} + 0.4 \times \text{Frekuensi Tidur}$) untuk mendeteksi siswa yang membutuhkan pendampingan khusus."* |
| **Bounded FIFO Queue** | *Antrean Terbatas Masuk-Pertama-Keluar-Pertama* | *"Antrean berkapasitas 100 slot yang mencegah memori bocor (OOM) jika internet terputus dan memastikan pengiriman telemetri tidak membuat video siaran ngelag."* |

---

## 🛠️ Panduan Instalasi & Menjalankan Sistem

### 1. Prasyarat Sistem
- **Node.js:** v20.x atau v22.x
- **Python:** v3.12.x
- **Sistem Operasi:** Linux (Ubuntu/Debian/Fedora), macOS, atau Windows dengan WSL2
- **Kamera:** Webcam Laptop atau HP Android via aplikasi **IP Webcam** (Wi-Fi)

---

### 2. Menjalankan Platform Web (Next.js & Supabase)
```bash
# 1. Masuk ke direktori utama
cd /home/zaldy/antigravity/smart-learning

# 2. Instal dependensi Node.js
npm install

# 3. Pastikan berkas .env.local telah terisi kredensial Supabase
# NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
# SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 4. Jalankan development server Next.js
npm run dev
```
Buka dashboard di browser: [http://localhost:3000](http://localhost:3000)

---

### 3. Menjalankan Edge CV Telemetry Engine (Python)
```bash
# 1. Buat virtual environment Python 3.12 (jika belum ada)
python3 -m venv .venv312
source .venv312/bin/activate

# 2. Instal dependensi CPU teroptimasi
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r experiments/cv-poc/requirements.txt

# 3. Jalankan Engine dengan Kamera HP via Wi-Fi:
python3 experiments/cv-poc/classroom_poc.py --source "http://10.10.10.33:8080/video" --port 5000 --headless

# Atau jalankan via Webcam Laptop langsung:
python3 experiments/cv-poc/classroom_poc.py --source 0 --port 5000 --headless
```

---

## 🌐 Endpoint Edge REST & Siaran Video

Engine lokal membuka HTTP server di `http://localhost:5000`:
- **`/video_feed`**: Siaran video MJPEG (40–45 FPS) dengan kerangka neon & bounding box.
- **`/status`**: JSON status performa, FPS, dan status sinkronisasi cloud (`Local:201 | Cloud:201`).
- **`/rotate?deg=90&flip=1`**: Kontrol rotasi kamera dinamis tanpa restart engine.
- **`/register_face?name=Nama+Siswa`**: Pendaftaran biometrik wajah siswa baru ke database lokal.
- **`/gallery`**: Daftar nama seluruh siswa yang wajahnya telah terdaftar.

---

## 🤝 Standar Kolaborasi Git (3 Developers)

1. **Developer 1 (AI & Vision Core):**
   - Branch: `feature/dev1-vision-core`
   - Direktori kerja: `experiments/cv-poc/cv_engine/core/`
2. **Developer 2 (Backend, Telemetry & Data):**
   - Branch: `feature/dev2-backend-data`
   - Direktori kerja: `src/app/api/`, `src/services/`, `cv_engine/telemetry/`, `supabase/`
3. **Developer 3 (Frontend, Stream & UI/UX):**
   - Branch: `feature/dev3-frontend-stream`
   - Direktori kerja: `src/components/`, `src/app/(dashboard)/`, `cv_engine/streaming/`, `cv_engine/server/`

Sebelum melakukan merge ke `master`, seluruh anggota tim wajib menjalankan verifikasi kualitas:
```bash
# 1. Verifikasi Type Checking TypeScript (Zero Errors)
npx tsc --noEmit

# 2. Verifikasi Sintaks Python (Zero Errors)
.venv312/bin/python -m py_compile experiments/cv-poc/cv_engine/*.py experiments/cv-poc/cv_engine/*/*.py experiments/cv-poc/main.py
```
