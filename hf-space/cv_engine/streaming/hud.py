"""
AI Classroom Intelligence — Renderer HUD & Visualisasi Anatomi Neon
====================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengelola rasterisasi grafis antarmuka cyberpunk / EduAI:
1. Transformasi rotasi spasial dan pencerminan frame.
2. Gambar kerangka anatomi neon bercahaya (SenseTime / Megvii Style).
3. Gambar kotak pintar (Tech Bounding Box) dengan lencana skor atensi.
4. Banner status HUD telemetri atas (FPS, headcount, sync status).
"""

from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
import cv2
import numpy as np

from cv_engine.config import (
    WARNA_CYAN,
    WARNA_PUTIH,
    WARNA_AMBER,
    WARNA_MERAH,
    WARNA_GELAP,
    WARNA_EMERALD,
    KONEKSI_SENDI_ANATOMI
)


def terapkan_orientasi(frame: np.ndarray, rotasi: str = "auto", cermin_horizontal: bool = False) -> np.ndarray:
    """
    Menerapkan transformasi rotasi sudut (90, 180, 270 derajat) dan pencerminan horizontal.
    
    Analisis Algoritma:
    -------------------
    - Kompleksitas Waktu: O(W * H) transposisi matriks piksel OpenCV.
    - Kompleksitas Ruang: O(1) in-place atau salinan tunggal buffer matriks.
    """
    if frame is None:
        return frame

    if rotasi == "90":
        keluaran = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
    elif rotasi == "180":
        keluaran = cv2.rotate(frame, cv2.ROTATE_180)
    elif rotasi == "270":
        keluaran = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif rotasi == "auto":
        # Otomatis tegakkan jika HP dalam orientasi lanskap namun terbalik
        if frame.shape[1] > frame.shape[0]:
            keluaran = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        else:
            keluaran = frame
    else:
        keluaran = frame

    if cermin_horizontal:
        keluaran = cv2.flip(keluaran, 1)

    return keluaran


def gambar_kerangka_neon(
    frame: np.ndarray,
    daftar_sendi: List[Any],
    warna: Tuple[int, int, int] = WARNA_CYAN,
    tangan_terangkat: bool = False,
    status_tidur: bool = False
) -> None:
    """
    Menggambar kerangka anatomi ringan (Yellow Pose lines seperti sistem CCTV akademik).
    Ultra-lightweight: single-pass direct line & joints, zero CPU overhead.
    """
    tinggi_frame, lebar_frame = frame.shape[:2]
    warna_tulang = (0, 230, 255)  # Kuning CCTV (Yellow) seperti pada foto referensi

    if tangan_terangkat:
        warna_tulang = WARNA_AMBER
    elif status_tidur:
        warna_tulang = WARNA_MERAH

    # 1. Gambar Ruas Tulang (Bone Connections) - Single Pass 2px
    for idx_sendi_1, idx_sendi_2 in KONEKSI_SENDI_ANATOMI:
        if idx_sendi_1 < len(daftar_sendi) and idx_sendi_2 < len(daftar_sendi):
            sendi_1 = daftar_sendi[idx_sendi_1]
            sendi_2 = daftar_sendi[idx_sendi_2]
            visibilitas_1 = getattr(sendi_1, 'visibility', 0.5)
            visibilitas_2 = getattr(sendi_2, 'visibility', 0.5)

            if visibilitas_1 > 0.25 and visibilitas_2 > 0.25:
                titik_1 = (int(sendi_1.x * lebar_frame), int(sendi_1.y * tinggi_frame))
                titik_2 = (int(sendi_2.x * lebar_frame), int(sendi_2.y * tinggi_frame))
                cv2.line(frame, titik_1, titik_2, warna_tulang, 2)

    # 2. Gambar Simpul Sendi Anatomi (Joint Nodes) - Single circle
    for sendi in daftar_sendi[:23]:
        visibilitas = getattr(sendi, 'visibility', 0.5)
        if visibilitas > 0.3:
            pusat_x = int(sendi.x * lebar_frame)
            pusat_y = int(sendi.y * tinggi_frame)
            cv2.circle(frame, (pusat_x, pusat_y), 3, (0, 180, 255), -1)


def gambar_kotak_cerdas(
    frame: np.ndarray,
    x: int,
    y: int,
    lebar: int,
    tinggi: int,
    warna: Tuple[int, int, int],
    label: str,
    keyakinan: float = 0.95,
    sub_label: Optional[str] = None,
    kotak_tangan: Optional[Tuple[int, int, int, int]] = None
) -> None:
    """
    Menggambar bounding box bersih & tajam (Hijau/Merah CCTV Style seperti foto referensi).
    Kotak persegi tebal 2px dengan label teks di atas. Sangat enteng dan responsif.
    """
    x, y, lebar, tinggi = int(round(x)), int(round(y)), int(round(lebar)), int(round(tinggi))
    # 1. Kotak Bounding Box (Gaya Surveillance Cam)
    cv2.rectangle(frame, (x, y), (x + lebar, y + tinggi), warna, 2)

    # 2. Lencana Teks Label di Atas Kotak (e.g. attentive, distracted, talking, using_phone)
    teks_utama = f"{label.lower()}"
    (lebar_teks, tinggi_teks), _ = cv2.getTextSize(teks_utama, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    posisi_y_teks = max(tinggi_teks + 4, y - 4)

    # Background kotak teks solid
    cv2.rectangle(frame, (x, posisi_y_teks - tinggi_teks - 4), (x + lebar_teks + 8, posisi_y_teks + 2), warna, -1)
    cv2.putText(frame, teks_utama, (x + 4, posisi_y_teks - 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0), 1, cv2.LINE_AA)

    # 3. Sub-label jika ada
    if sub_label:
        (lebar_sub, tinggi_sub), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
        cv2.rectangle(frame, (x, y + tinggi + 2), (x + lebar_sub + 6, y + tinggi + tinggi_sub + 6), (20, 20, 20), -1)
        cv2.putText(frame, sub_label, (x + 3, y + tinggi + tinggi_sub + 3),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.36, (220, 220, 220), 1, cv2.LINE_AA)


def gambar_banner_hud(
    frame: np.ndarray,
    statistik: Dict[str, Any],
    fps: float,
    id_sesi: str,
    status_sinkronisasi: str,
    info_rotasi: str,
    latensi_inferensi_ms: float = 0.0
) -> None:
    """
    Menggambar header CCTV minimalis tanpa frame copying / alpha blending.
    Watermark CCTV Timestamp di pojok atas persis gaya kamera pengawas.
    """
    tinggi_frame, lebar_frame = frame.shape[:2]

    # Timestamp & Status CCTV di pojok atas (tanpa addWeighted copy yang berat)
    cv2.rectangle(frame, (0, 0), (lebar_frame, 24), (15, 15, 15), -1)

    info_kiri = f"IP CAM LIVE | {statistik.get('total', 0)} Siswa | {fps:.1f} FPS"
    cv2.putText(frame, info_kiri, (8, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 180), 1, cv2.LINE_AA)

    waktu_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    (lebar_waktu, _), _ = cv2.getTextSize(waktu_str, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
    cv2.putText(frame, waktu_str, (lebar_frame - lebar_waktu - 8, 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)


# Alias kompatibilitas bahasa Inggris
apply_orientation = terapkan_orientasi
draw_neon_skeleton = gambar_kerangka_neon
draw_tech_box = gambar_kotak_cerdas
draw_hud = gambar_banner_hud
