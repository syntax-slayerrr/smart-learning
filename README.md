# 🎓 SMART LEARNING — AI CLASSROOM INTELLIGENCE & CAMPUS ECOSYSTEM
### Platform Analitik Pembelajaran & Pemantauan Pedagogis Berbasis AI
**Versi Enterprise 4.1.0**

Platform terintegrasi yang menghubungkan **Edge Computer Vision Intelligence** (Python, YOLO26n, MediaPipe Heavy 3D, ArcFace 512-d) dengan **Fullstack Web Platform** (Next.js 16, TypeScript, Supabase PostgreSQL, Tailwind CSS) untuk mendeteksi dinamika belajar di kelas, kehadiran siswa, intervensi dini siswa berisiko (*At-Risk Students*), dan pelaporan otomatis ke orang tua melalui WhatsApp.

> 📖 **Dokumentasi & Panduan Utama:**
> * 🎥 **[CV_ENGINE_GUIDE.md](docs/CV_ENGINE_GUIDE.md)** — Panduan Teknis Edge AI Vision Engine Python.

---

## 🏛️ Arsitektur Pipeline Aliran Data End-to-End

```mermaid
flowchart TD
    subgraph EdgeDevice["1. Edge Box / Kamera Kelas"]
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

    subgraph BackendAPI["2. Next.js & Supabase Cloud"]
        DISP -->|HTTP POST JSON Tiap 2s| INGEST[/api/telemetry/ingest]
        INGEST --> DB[(Supabase PostgreSQL: classroom_telemetry)]
        INGEST --> INMEM[In-Memory Sliding Buffer: 50 Slices]
        DB --> ANALYTICS[Layanan Analitik Siswa: Skoring Komposit O(N)]
        ANALYTICS --> WA[Gateway WhatsApp: Notifikasi Intervensi Ortu]
    end

    subgraph ClientDashboards["3. Antarmuka Web Interaktif"]
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
cd smart-learning

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

## 🤝 Standar Kualitas & Verifikasi Kode

Sebelum melakukan merge atau push ke `master`, seluruh verifikasi kualitas wajib dijalankan:
```bash
# 1. Verifikasi Type Checking TypeScript (Zero Errors)
npx tsc --noEmit

# 2. Verifikasi Sintaks Python (Zero Errors)
.venv312/bin/python -m py_compile experiments/cv-poc/cv_engine/*.py experiments/cv-poc/cv_engine/*/*.py experiments/cv-poc/main.py
```
