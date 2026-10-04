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
    Menggambar kerangka anatomi neon berlapis (Glow Effect) untuk visualisasi pergerakan siswa.
    Lengan yang terangkat otomatis memancarkan pendar emas amber.
    """
    tinggi_frame, lebar_frame = frame.shape[:2]

    # 1. Gambar Ruas Tulang (Bone Connections)
    for idx_sendi_1, idx_sendi_2 in KONEKSI_SENDI_ANATOMI:
        if idx_sendi_1 < len(daftar_sendi) and idx_sendi_2 < len(daftar_sendi):
            sendi_1 = daftar_sendi[idx_sendi_1]
            sendi_2 = daftar_sendi[idx_sendi_2]
            visibilitas_1 = getattr(sendi_1, 'visibility', 0.5)
            visibilitas_2 = getattr(sendi_2, 'visibility', 0.5)

            if visibilitas_1 > 0.22 and visibilitas_2 > 0.22:
                titik_1 = (int(sendi_1.x * lebar_frame), int(sendi_1.y * tinggi_frame))
                titik_2 = (int(sendi_2.x * lebar_frame), int(sendi_2.y * tinggi_frame))

                warna_tulang = warna
                apakah_ruas_lengan = (
                    (idx_sendi_1 in (11, 13, 15) and idx_sendi_2 in (11, 13, 15)) or
                    (idx_sendi_1 in (12, 14, 16) and idx_sendi_2 in (12, 14, 16))
                )

                if tangan_terangkat and apakah_ruas_lengan:
                    warna_tulang = WARNA_AMBER
                elif status_tidur:
                    warna_tulang = WARNA_MERAH

                # Lapisan luar tipis putih + inti neon berwarna (Anti-Aliased)
                cv2.line(frame, titik_1, titik_2, WARNA_PUTIH, 3, cv2.LINE_AA)
                cv2.line(frame, titik_1, titik_2, warna_tulang, 2, cv2.LINE_AA)

    # 2. Gambar Simpul Sendi Anatomi (Joint Nodes)
    for indeks_simpul, sendi in enumerate(daftar_sendi[:25]):
        visibilitas = getattr(sendi, 'visibility', 0.5)
        if visibilitas > 0.22:
            pusat_x = int(sendi.x * lebar_frame)
            pusat_y = int(sendi.y * tinggi_frame)
            warna_simpul = warna
            radius_simpul = 5

            if tangan_terangkat and indeks_simpul in (15, 16):
                warna_simpul = WARNA_AMBER
                radius_simpul = 8  # Denyut pulsa pada pergelangan tangan yang bertanya
            elif status_tidur:
                warna_simpul = WARNA_MERAH

            cv2.circle(frame, (pusat_x, pusat_y), radius_simpul, warna_simpul, -1, cv2.LINE_AA)
            cv2.circle(frame, (pusat_x, pusat_y), max(2, radius_simpul - 3), WARNA_PUTIH, -1, cv2.LINE_AA)


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
    Menggambar kotak pembatas presisi bergaya cyberpunk dengan sudut siku beraksen tebal.
    """
    panjang_sudut = min(22, lebar // 4, tinggi // 4)

    # Gambar Aksen 4 Sudut Kotak
    cv2.line(frame, (x, y), (x + panjang_sudut, y), warna, 2)
    cv2.line(frame, (x, y), (x, y + panjang_sudut), warna, 2)
    cv2.line(frame, (x + lebar, y), (x + lebar - panjang_sudut, y), warna, 2)
    cv2.line(frame, (x + lebar, y), (x + lebar, y + panjang_sudut), warna, 2)
    cv2.line(frame, (x, y + tinggi), (x + panjang_sudut, y + tinggi), warna, 2)
    cv2.line(frame, (x, y + tinggi), (x, y + tinggi - panjang_sudut), warna, 2)
    cv2.line(frame, (x + lebar, y + tinggi), (x + lebar - panjang_sudut, y + tinggi), warna, 2)
    cv2.line(frame, (x + lebar, y + tinggi), (x + lebar, y + tinggi - panjang_sudut), warna, 2)

    cv2.rectangle(frame, (x, y), (x + lebar, y + tinggi), warna, 1, cv2.LINE_AA)

    # Lencana Label & Persentase Keyakinan
    teks_lencana = f"{label} {int(keyakinan * 100)}%"
    (lebar_teks, tinggi_teks), _ = cv2.getTextSize(teks_lencana, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
    posisi_y_lencana = max(0, y - tinggi_teks - 8)
    cv2.rectangle(frame, (x, posisi_y_lencana), (x + lebar_teks + 12, y), WARNA_GELAP, -1)
    cv2.rectangle(frame, (x, posisi_y_lencana), (x + lebar_teks + 12, y), warna, 1)
    cv2.putText(frame, teks_lencana, (x + 6, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, WARNA_PUTIH, 1, cv2.LINE_AA)

    # Sub-lencana Detail (Postur, Tatapan, Atensi)
    if sub_label:
        (lebar_sub, tinggi_sub), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
        sub_y1 = y + tinggi
        sub_y2 = sub_y1 + tinggi_sub + 8
        if sub_y2 < frame.shape[0]:
            cv2.rectangle(frame, (x, sub_y1), (x + lebar_sub + 10, sub_y2), (25, 27, 32), -1)
            cv2.rectangle(frame, (x, sub_y1), (x + lebar_sub + 10, sub_y2), (60, 64, 72), 1)
            cv2.putText(frame, sub_label, (x + 5, sub_y2 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 215, 225), 1, cv2.LINE_AA)

    # Sorotan Kotak Tangan Mengangkat
    if kotak_tangan is not None:
        tx, ty, tw, th = kotak_tangan
        cv2.rectangle(frame, (tx, ty), (tx + tw, ty + th), WARNA_AMBER, 2, cv2.LINE_AA)
        cv2.putText(frame, "HAND [ANGKAT]", (tx, max(12, ty - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, WARNA_AMBER, 1, cv2.LINE_AA)


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
    Menggambar bilah status HUD atas dengan indikator operasional real-time.
    """
    tinggi_frame, lebar_frame = frame.shape[:2]
    lapisan_transparan = frame.copy()
    cv2.rectangle(lapisan_transparan, (0, 0), (lebar_frame, 36), WARNA_GELAP, -1)
    cv2.addWeighted(lapisan_transparan, 0.78, frame, 0.22, 0, frame)

    # Indikator Status Aktif
    cv2.circle(frame, (16, 18), 5, WARNA_EMERALD, -1)
    cv2.putText(frame, "AI CLASSROOM v4.1 (YOLO26 + MediaPipe Heavy + ArcFace)", (28, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, WARNA_PUTIH, 1, cv2.LINE_AA)

    jumlah_subjek = statistik.get("total", 0)
    info_telemetri = f"{fps:.1f} FPS ({latensi_inferensi_ms:.0f}ms) | {jumlah_subjek} Subjek | Rot: {info_rotasi} | Sync: {status_sinkronisasi}"
    (lebar_info, _), _ = cv2.getTextSize(info_telemetri, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(frame, info_telemetri, (max(10, lebar_frame - lebar_info - 16), 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 225, 185), 1, cv2.LINE_AA)


# Alias kompatibilitas bahasa Inggris
apply_orientation = terapkan_orientasi
draw_neon_skeleton = gambar_kerangka_neon
draw_tech_box = gambar_kotak_cerdas
draw_hud = gambar_banner_hud
