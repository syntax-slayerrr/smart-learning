"""
AI Classroom Intelligence — Engine Configuration & Constants
============================================================
Syntax Slayer — Smart Learning Platform

Modul ini mengelola seluruh konstanta lingkungan, lokasi berkas model,
palet warna visualisasi, serta ambang batas algoritma (Thresholds)
untuk 5 Enterprise Guardrails.
"""

import os
from dataclasses import dataclass, field
from typing import Optional, List, Tuple


# ==============================================================================
# 1. PATH DIREKTORI & BERKAS MODEL (Struktur Berkas & Model Zoo)
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))

# Berkas Model Deteksi Spasial YOLO26n
YOLO26_ONNX_PATH = os.path.join(BASE_DIR, "yolo26n.onnx")
YOLO26_ROOT_PATH = os.path.join(PROJECT_ROOT, "yolo26n.onnx")

# Berkas Model Estimasi Kerangka Anatomi MediaPipe 33-Keypoints
POSE_HEAVY_TASK_PATH = os.path.join(BASE_DIR, "pose_landmarker_heavy.task")
POSE_LITE_TASK_PATH = os.path.join(BASE_DIR, "pose_landmarker_lite.task")

# Berkas Model Biometrik Wajah 512-Dimensi InsightFace ArcFace
ARCFACE_MBF_PATH = os.path.join(BASE_DIR, "insightface_models", "w600k_mbf.onnx")
YUNET_ONNX_PATH = os.path.join(BASE_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_ONNX_PATH = os.path.join(BASE_DIR, "face_recognition_sface_2021dec.onnx")

# Basis Data Penyimpanan Fitur Wajah Siswa
FACE_GALLERY_PATH = os.path.join(BASE_DIR, "students_face_gallery.json")


# ==============================================================================
# 2. PALET WARNA VISUALISASI HUD (Format BGR OpenCV)
# ==============================================================================
WARNA_EMERALD    = (70, 205, 95)    # Status: Fokus / Normal / Duduk
WARNA_CYAN       = (235, 205, 50)   # Garis kerangka tubuh neon
WARNA_LANGIT_SKY = (235, 140, 20)   # Status: Menulis / Mengetik di meja
WARNA_BIRU       = (255, 175, 45)   # Status: Berdiri / Mobilitas guru
WARNA_AMBER      = (25, 165, 255)   # Status: Interaksi / Mengangkat tangan
WARNA_MERAH      = (50, 50, 245)    # Status: Peringatan / Tertidur di meja
WARNA_GELAP      = (18, 20, 24)     # Latar belakang HUD semi-transparan
WARNA_PUTIH      = (245, 245, 245)  # Garis tepi kontras dan teks utama
WARNA_UNGU       = (220, 90, 180)   # Indikator sekunder

# Alias kompatibilitas bahasa Inggris
COLOR_EMERALD = WARNA_EMERALD
COLOR_CYAN    = WARNA_CYAN
COLOR_SKY     = WARNA_LANGIT_SKY
COLOR_BLUE    = WARNA_BIRU
COLOR_AMBER   = WARNA_AMBER
COLOR_RED     = WARNA_MERAH
COLOR_DARK    = WARNA_GELAP
COLOR_WHITE   = WARNA_PUTIH
COLOR_PURPLE  = WARNA_UNGU


# ==============================================================================
# 3. STRUKTUR DATA HUBUNGAN TULANG ANATOMI (MediaPipe 33-Keypoints)
# Struktur Graf: Daftar edge (u, v) menghubungkan sendi tubuh manusia
# ==============================================================================
KONEKSI_SENDI_ANATOMI = [
    # Lengan Kiri: Bahu Kiri -> Siku Kiri -> Pergelangan Kiri
    (11, 13), (13, 15),
    # Lengan Kanan: Bahu Kanan -> Siku Kanan -> Pergelangan Kanan
    (12, 14), (14, 16),
    # Bahu: Bahu Kiri <-> Bahu Kanan
    (11, 12),
    # Torso / Badan: Bahu ke Pinggul
    (11, 23), (12, 24),
    (23, 24),
    # Kepala & Mata: Hidung, Mata, Telinga
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10),
    (0, 11), (0, 12)
]
POSE_CONNECTIONS = KONEKSI_SENDI_ANATOMI


# ==============================================================================
# 4. AMBANG BATAS 5 ENTERPRISE GUARDRAILS (Data Structure & Algorithm Bounds)
# ==============================================================================
# Guardrail 1: Kinematika Sudut Siku & Gerbang Jarak Wajah
AMBANG_SUDUT_SIKU_DERAJAT           = 105.0  # Sudut minimum siku (derajat) agar valid sebagai angkat tangan
AMBANG_JARAK_WAJAH_TANGAN           = 0.07   # Jarak minimum pergelangan ke hidung (menghindari garuk kepala)
DURASI_TAHAN_ANGKAT_TANGAN_DETIK    = 0.7    # Jendela geser waktu minimum agar gestur tidak fluktuatif
DURASI_HISTESIS_ANGKAT_TANGAN_DETIK = 0.7    # Relaksasi transisi halus saat tangan mulai diturunkan

# Guardrail 2: Verifikator Energi Kinetik Gerakan Tangan
KECEPATAN_TANGAN_MENULIS            = 0.015  # Ambang batas kecepatan tangan menulis di meja
KECEPATAN_TANGAN_DIAM_TIDUR         = 0.010  # Ambang batas kecepatan tangan diam (statis)
DURASI_TAHAN_TIDUR_DETIK            = 3.5    # Waktu akumulasi menunduk + diam sebelum divonis tidur

# Guardrail 3: Buffer Voting Identitas Spasial
MINIMAL_VOTING_IDENTITAS            = 2      # Akumulasi kecocokan ArcFace berturut-turut untuk mengunci identitas

# Guardrail 4: Filter Penghalus Koordinat & Reduksi Jitter (One Euro Filter + EMA Sub-pixel)
FAKTOR_EMA_SMOOTHING                = 0.22   # Fallback bobot koordinat baru
ONE_EURO_MIN_CUTOFF                 = 0.25   # Frekuensi cutoff minimum (Hz) saat objek diam (reduksi jitter >95%)
ONE_EURO_BETA                       = 0.012  # Koefisien responsivitas kecepatan (menghilangkan lag gerakan cepat)
ONE_EURO_D_CUTOFF                   = 1.0    # Cutoff derivatif kecepatan

# Guardrail 5: Toleransi Retensi & Eliminasi Ghost Box
MINIMAL_HIT_STREAK_KONFIRMASI       = 3      # Wajib terdeteksi >= 3 frame berturut-turut sebelum di-render ke HUD
MAKSIMAL_FRAME_TENTATIVE_HILANG     = 1      # Track tentatif langsung dihapus jika hilang 1 frame (zero ghost retention)
TOLERANSI_TRACK_HILANG_DETIK        = 5.0    # Jeda toleransi waktu saat siswa terkonfirmasi tertutup sementara
AMBANG_IOU_PELACAKAN                = 0.30   # Ambang batas tumpang tindih spasial (IoU)
AMBANG_BIAYA_ASOSIASI_MAKSIMAL      = 0.80   # Ambang batas gabungan IoU + Jarak Centroid Ternormalisasi
INTERVAL_INFERENSI_WAJAH_DETIK     = 2.0    # Frekuensi inferensi pengenalan wajah asinkron (detik)
SEAT_ANCHOR_MAX_RADIUS_PX           = 140.0  # Radius jangkar spasial kursi meja siswa (anti swap ID)
SEAT_ANCHOR_TTL_SEC                 = 15.0   # Toleransi retensi kursi saat siswa tertutup guru atau teman sekelas

# Alias kompatibilitas
GUARDRAIL_ELBOW_ANGLE_THRESH        = AMBANG_SUDUT_SIKU_DERAJAT
GUARDRAIL_FACE_DIST_THRESH          = AMBANG_JARAK_WAJAH_TANGAN
GUARDRAIL_HAND_HOLD_GATE_SEC        = DURASI_TAHAN_ANGKAT_TANGAN_DETIK
GUARDRAIL_HAND_LATCH_HYSTERESIS_SEC = DURASI_HISTESIS_ANGKAT_TANGAN_DETIK
GUARDRAIL_WRIST_MOTION_WRITING      = KECEPATAN_TANGAN_MENULIS
GUARDRAIL_WRIST_MOTION_STILL        = KECEPATAN_TANGAN_DIAM_TIDUR
GUARDRAIL_SLEEP_HOLD_SEC            = DURASI_TAHAN_TIDUR_DETIK
GUARDRAIL_EMA_ALPHA                 = FAKTOR_EMA_SMOOTHING
GUARDRAIL_LOST_TRACK_GRACE_SEC      = TOLERANSI_TRACK_HILANG_DETIK
GUARDRAIL_ARCFACE_MATCH_VOTES       = MINIMAL_VOTING_IDENTITAS
GUARDRAIL_MIN_HIT_STREAK            = MINIMAL_HIT_STREAK_KONFIRMASI


# ==============================================================================
# 5. DATA STRUCTURE: KONFIGURASI ENGINE
# ==============================================================================
@dataclass
class KonfigurasiEngine:
    """
    Struktur data strongly-typed untuk parameter eksekusi pipeline Edge CV.
    """
    source: str = "http://10.10.10.33:8080/video"
    port: int = 5000
    interval: int = 2
    session_id: str = "00000000-0000-0000-0000-000000000001"
    api_url: str = "http://127.0.0.1:3000/api/telemetry/ingest"
    cloud_url: str = "https://smart-learning-black.vercel.app/api/telemetry/ingest"
    device_key: str = "dev-edge-secret-key-2026"
    rotate: str = "auto"
    flip_h: bool = False
    headless: bool = True
    target_fps: int = 30
    yolo_conf_thresh: float = 0.50
    yolo_imgsz: int = 320
    face_sim_thresh: float = 0.38
    face_interval_sec: float = 2.0

# Alias kompatibilitas
EngineConfig = KonfigurasiEngine
