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


KAMUS_AKTIVITAS = {
    "attentive": "Fokus Menyimak",
    "hand_raised": "Bertanya",
    "writing": "Mencatat",
    "sleep": "Mengantuk",
    "standing": "Berdiri",
    "teaching": "Guru Mengajar",
    "normal": "Normal"
}


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
    Menggambar bounding box cerdas (Academic Surveillance Style) dengan:
    1. Bounding box 2px dan 4 corner brackets reticle tajam.
    2. Smart Anti-Clipping Badge (berpindah ke dalam jika posisi berada di tepi atas).
    3. Reticle lingkaran fokus khusus pada pergelangan/tangan yang terangkat.
    """
    x, y, lebar, tinggi = int(round(x)), int(round(y)), int(round(lebar)), int(round(tinggi))
    tinggi_frame, lebar_frame = frame.shape[:2]

    # Pastikan koordinat dalam batas frame
    x = max(0, min(lebar_frame - 10, x))
    y = max(0, min(tinggi_frame - 10, y))
    lebar = max(10, min(lebar_frame - x, lebar))
    tinggi = max(10, min(tinggi_frame - y, tinggi))

    # 1. Kotak Bounding Box (Gaya Surveillance Cam)
    cv2.rectangle(frame, (x, y), (x + lebar, y + tinggi), warna, 2)

    # Corner brackets reticle di 4 sudut kotak (SenseTime / Megvii Academic Style)
    siku = min(16, max(6, lebar // 6), max(6, tinggi // 6))
    # Sudut Kiri Atas
    cv2.line(frame, (x, y), (x + siku, y), warna, 3)
    cv2.line(frame, (x, y), (x, y + siku), warna, 3)
    # Sudut Kanan Atas
    cv2.line(frame, (x + lebar, y), (x + lebar - siku, y), warna, 3)
    cv2.line(frame, (x + lebar, y), (x + lebar, y + siku), warna, 3)
    # Sudut Kiri Bawah
    cv2.line(frame, (x, y + tinggi), (x + siku, y + tinggi), warna, 3)
    cv2.line(frame, (x, y + tinggi), (x, y + tinggi - siku), warna, 3)
    # Sudut Kanan Bawah
    cv2.line(frame, (x + lebar, y + tinggi), (x + lebar - siku, y + tinggi), warna, 3)
    cv2.line(frame, (x + lebar, y + tinggi), (x + lebar, y + tinggi - siku), warna, 3)

    # 2. Lokalisasi Status Aktivitas & Format Identitas
    aktivitas_teks = KAMUS_AKTIVITAS.get(label.lower(), label.capitalize())
    if sub_label:
        if sub_label.startswith("[ID] "):
            nama_siswa = sub_label[5:]
            teks_utama = f"[HADIR] {nama_siswa} | {aktivitas_teks}"
        elif sub_label.startswith("[GURU]"):
            teks_utama = f"{sub_label} | {aktivitas_teks}"
        else:
            teks_utama = f"{sub_label} | {aktivitas_teks}"
    else:
        teks_utama = f"{aktivitas_teks}"

    (lebar_teks, tinggi_teks), _ = cv2.getTextSize(teks_utama, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)

    # 3. Smart Anti-Clipping Badge (Mencegah teks tertutup banner atas di y < 28)
    if y < 28:
        posisi_y_badge = y
        cv2.rectangle(frame, (x, posisi_y_badge), (x + lebar_teks + 8, posisi_y_badge + tinggi_teks + 8), warna, -1)
        cv2.putText(frame, teks_utama, (x + 4, posisi_y_badge + tinggi_teks + 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1, cv2.LINE_AA)
    else:
        posisi_y_badge = max(tinggi_teks + 6, y - 4)
        cv2.rectangle(frame, (x, posisi_y_badge - tinggi_teks - 5), (x + lebar_teks + 8, posisi_y_badge + 3), warna, -1)
        cv2.putText(frame, teks_utama, (x + 4, posisi_y_badge - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1, cv2.LINE_AA)

    # 4. Reticle Fokus Tangan Terangkat (Jika Terdeteksi)
    if kotak_tangan is not None:
        hx, hy, hw, hh = kotak_tangan
        if hw > 8 and hh > 8:
            cx_tangan = int(hx + hw / 2)
            cy_tangan = int(hy + hh / 2)
            r_tangan = max(14, int(max(hw, hh) / 2))
            cv2.circle(frame, (cx_tangan, cy_tangan), r_tangan, (0, 215, 255), 2)
            cv2.circle(frame, (cx_tangan, cy_tangan), 3, (0, 215, 255), -1)
            (tw_h, th_h), _ = cv2.getTextSize("BERTANYA", cv2.FONT_HERSHEY_SIMPLEX, 0.32, 1)
            badge_y = max(th_h + 4, hy - 4)
            cv2.rectangle(frame, (hx, badge_y - th_h - 3), (hx + tw_h + 6, badge_y + 2), (0, 215, 255), -1)
            cv2.putText(frame, "BERTANYA", (hx + 3, badge_y - 1), cv2.FONT_HERSHEY_SIMPLEX, 0.30, (0, 0, 0), 1, cv2.LINE_AA)


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
    Menggambar header CCTV enterprise minimalis, ringkasan kelas real-time & watermark sekolah.
    """
    tinggi_frame, lebar_frame = frame.shape[:2]

    # Bar Header Atas (Hitam Solid 26px dengan Garis Hairline Pemisah)
    cv2.rectangle(frame, (0, 0), (lebar_frame, 26), (15, 15, 18), -1)
    cv2.line(frame, (0, 26), (lebar_frame, 26), (40, 40, 45), 1)

    # Indikator Status Rekam / Live Aktif
    cv2.circle(frame, (12, 13), 4, (0, 240, 140), -1)

    # Ringkasan Dinamis Kondisi Kelas
    total_siswa = statistik.get('total', 0)
    bertanya = statistik.get('hands_raised', 0)
    tertidur = statistik.get('sleep_detected', 0)
    fokus = statistik.get('desk_focused', 0)
    guru_hadir = statistik.get('teacher_present', False)

    ringkasan_detail = []
    if fokus > 0:
        ringkasan_detail.append(f"{fokus} Fokus")
    if bertanya > 0:
        ringkasan_detail.append(f"{bertanya} Bertanya")
    if tertidur > 0:
        ringkasan_detail.append(f"{tertidur} Mengantuk")
    if guru_hadir:
        ringkasan_detail.append("Guru Aktif")

    teks_detail = f" ({', '.join(ringkasan_detail)})" if ringkasan_detail else ""
    info_kiri = f"LIVE CAM | KELAS XI RPL 1 | {total_siswa} Siswa{teks_detail} | {fps:.1f} FPS"
    cv2.putText(frame, info_kiri, (22, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 245, 195), 1, cv2.LINE_AA)

    # Timestamp Jam & Tanggal Presisi di Pojok Kanan Atas
    waktu_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    (lebar_waktu, _), _ = cv2.getTextSize(waktu_str, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(frame, waktu_str, (lebar_frame - lebar_waktu - 8, 17),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (230, 230, 230), 1, cv2.LINE_AA)

    # Watermark Formal Institusi Sekolah di Pojok Kiri Bawah
    cv2.putText(frame, "SMK TI SYNTAX SLAYER | SMART CLASSROOM AI", (8, tinggi_frame - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.34, (140, 140, 140), 1, cv2.LINE_AA)


# Alias kompatibilitas bahasa Inggris
apply_orientation = terapkan_orientasi
draw_neon_skeleton = gambar_kerangka_neon
draw_tech_box = gambar_kotak_cerdas
draw_hud = gambar_banner_hud
