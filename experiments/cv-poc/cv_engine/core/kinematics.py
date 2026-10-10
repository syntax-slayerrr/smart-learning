"""
AI Classroom Intelligence — Kinematika, Geometri Spasial & Filter Pose
======================================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan algoritma geometri analitis dan penyaringan spasial:
1. Algoritma Vektor Dot-Product Trigonometrik untuk Sudut Sendi Siku.
2. Algoritma Non-Maximum Suppression (NMS) berbasis Spatial IoU & Jarak Euclidean.
"""

import math
from typing import List, Tuple, Any, Dict, Optional
import numpy as np


def hitung_sudut_tiga_titik(titik_bahu: Any, titik_siku: Any, titik_pergelangan: Any) -> float:
    """
    Menghitung besar sudut sendi (derajat) yang dibentuk oleh 3 titik anatomi.
    Titik puncak/vertex sudut adalah titik_siku.
    
    Analisis Algoritma:
    -------------------
    - Rumus: cos(theta) = (v1 . v2) / (||v1|| * ||v2||)
    - Kompleksitas Waktu: O(1) (hanya 4 operasi perkalian vektor 2D konstan)
    - Kompleksitas Ruang: O(1)
    
    Tujuan Pedagogis:
    -----------------
    Membedakan secara pasti antara gerakan menggaruk kepala / membetulkan kacamata
    (sudut siku lancip < 90 derajat) dengan gestur mengangkat tangan bertanya
    (sudut siku tumpul >= 105 derajat).
    """
    vektor_bahu = np.array([titik_bahu.x - titik_siku.x, titik_bahu.y - titik_siku.y], dtype=np.float32)
    vektor_pergelangan = np.array([titik_pergelangan.x - titik_siku.x, titik_pergelangan.y - titik_siku.y], dtype=np.float32)

    panjang_vektor_bahu = np.linalg.norm(vektor_bahu)
    panjang_vektor_pergelangan = np.linalg.norm(vektor_pergelangan)

    if panjang_vektor_bahu < 1e-4 or panjang_vektor_pergelangan < 1e-4:
        return 0.0

    nilai_kosinus = np.dot(vektor_bahu, vektor_pergelangan) / (panjang_vektor_bahu * panjang_vektor_pergelangan)
    sudut_radian = math.acos(np.clip(nilai_kosinus, -1.0, 1.0))
    return float(math.degrees(sudut_radian))


def saring_pose_tumpang_tindih(
    daftar_pose_landmark: List[Any],
    dimensi_frame: Tuple[int, int, ...],
    ambang_iou: float = 0.30,
    ambang_jarak_pusat: float = 95.0
) -> List[Any]:
    """
    Menyaring dan mengeliminasi duplikasi pose (Ghost Tracks) menggunakan algoritma
    Spatial Greedy Non-Maximum Suppression (NMS) terkalibrasi.
    
    Analisis Algoritma:
    -------------------
    - Struktur Data: List Tuple (x1, y1, x2, y2, pose) & Array Skor Visibilitas
    - Algoritma: 
        1. Menghitung bounding box pelindung dari keypoints dengan visibilitas > 0.22.
        2. Mengurutkan pose secara menurun (descending) berdasarkan total skor keypoint.
        3. Melakukan uji tumpang tindih (Overlap Test) berbasis Jarak Euclidean Titik Pusat
           dan Intersection-over-Union (IoU).
        4. Mengabaikan pose yang terbukti merupakan bayangan/duplikasi dari subjek yang sama.
    - Kompleksitas Waktu: O(N^2) di mana N adalah jumlah subjek dalam frame (N <= 10,
      sehingga eksekusi < 0.1 milidetik).
    - Kompleksitas Ruang: O(N) untuk menyimpan kandidat terpilih.
    """
    if len(daftar_pose_landmark) <= 1:
        return daftar_pose_landmark

    tinggi_frame, lebar_frame = dimensi_frame[:2]
    daftar_kotak = []
    daftar_skor = []

    for pose in daftar_pose_landmark:
        koordinat_x = [lm.x for lm in pose[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
        koordinat_y = [lm.y for lm in pose[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
        if len(koordinat_x) < 8:
            continue

        min_x = min(koordinat_x) * lebar_frame
        min_y = min(koordinat_y) * tinggi_frame
        max_x = max(koordinat_x) * lebar_frame
        max_y = max(koordinat_y) * tinggi_frame

        daftar_kotak.append((min_x, min_y, max_x, max_y, pose))
        total_skor = sum(getattr(lm, 'visibility', 0.5) for lm in pose[:25])
        daftar_skor.append(total_skor)

    kotak_terseleksi = []
    indeks_terurut = sorted(range(len(daftar_kotak)), key=lambda i: daftar_skor[i], reverse=True)

    for i in indeks_terurut:
        x1_a, y1_a, x2_a, y2_a, pose_a = daftar_kotak[i]
        luas_a = max(0, x2_a - x1_a) * max(0, y2_a - y1_a)
        pusat_x_a = (x1_a + x2_a) / 2.0
        pusat_y_a = (y1_a + y2_a) / 2.0

        terjadi_overlap = False
        for (x1_b, y1_b, x2_b, y2_b, pose_b) in kotak_terseleksi:
            pusat_x_b = (x1_b + x2_b) / 2.0
            pusat_y_b = (y1_b + y2_b) / 2.0

            # Uji Landmark Hidung & Pusat: Jika kedua pose menunjuk ke kepala/badan orang yang sama persis
            hidung_sama = False
            if len(pose_a) >= 1 and len(pose_b) >= 1:
                if math.hypot(pose_a[0].x - pose_b[0].x, pose_a[0].y - pose_b[0].y) < 0.12:
                    hidung_sama = True

            dist_pusat = math.hypot(pusat_x_a - pusat_x_b, pusat_y_a - pusat_y_b)
            if hidung_sama and dist_pusat < ambang_jarak_pusat:
                terjadi_overlap = True
                break

            # Uji Rasio IoU (Intersection over Union)
            irisan_x1 = max(x1_a, x1_b)
            irisan_y1 = max(y1_a, y1_b)
            irisan_x2 = min(x2_a, x2_b)
            irisan_y2 = min(y2_a, y2_b)
            luas_irisan = max(0, irisan_x2 - irisan_x1) * max(0, irisan_y2 - irisan_y1)
            luas_b = max(0, x2_b - x1_b) * max(0, y2_b - y1_b)
            luas_gabungan = luas_a + luas_b - luas_irisan

            if luas_gabungan > 0 and (luas_irisan / luas_gabungan) > ambang_iou:
                terjadi_overlap = True
                break

        if not terjadi_overlap:
            kotak_terseleksi.append((x1_a, y1_a, x2_a, y2_a, pose_a))

    return [item[4] for item in kotak_terseleksi]


def saring_kandidat_spasial(
    daftar_kandidat: List[Dict[str, Any]],
    ambang_iou: float = 0.45,
    ambang_jarak_pusat: float = 40.0,
    dimensi_frame: Optional[Tuple[int, int]] = None
) -> List[Dict[str, Any]]:
    """
    Menyaring kandidat subjek deteksi terpadu agar tidak terjadi duplikasi/ghost box
    tanpa mematikan siswa yang duduk berdampingan atau berbaris di kelas (jarak 3-8m).
    Mengeliminasi kotak jika IoU tinggi, terkurung, atau merupakan bayangan tangan terangkat.
    """
    if len(daftar_kandidat) <= 1:
        return daftar_kandidat

    # Prioritaskan kandidat yang memiliki kerangka anatomi lengkap (landmarks) terlebih dahulu
    kandidat_terurut = sorted(
        daftar_kandidat,
        key=lambda k: (1 if k.get("landmarks") is not None else 0, k.get("keyakinan", 0.0)),
        reverse=True
    )
    kandidat_terpilih: List[Dict[str, Any]] = []

    for cand in kandidat_terurut:
        cx1, cy1, cw1, ch1 = cand["kotak"]
        cpx1 = cx1 + cw1 / 2.0
        cpy1 = cy1 + ch1 / 2.0
        luas1 = max(0, cw1) * max(0, ch1)

        tumpang_tindih = False
        for terpilih in kandidat_terpilih:
            cx2, cy2, cw2, ch2 = terpilih["kotak"]
            cpx2 = cx2 + cw2 / 2.0
            cpy2 = cy2 + ch2 / 2.0
            luas2 = max(0, cw2) * max(0, ch2)

            # Irisan kedua kotak
            ix1 = max(cx1, cx2)
            iy1 = max(cy1, cy2)
            ix2 = min(cx1 + cw1, cx2 + cw2)
            iy2 = min(cy1 + ch1, cy2 + ch2)
            luas_irisan = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            luas_gabungan = luas1 + luas2 - luas_irisan
            min_luas = min(luas1, luas2)
            min_w = min(cw1, cw2)

            # 1. Uji Landmark Pose Hidung (Jika kedua kandidat menunjuk ke orang yang sama)
            lm1 = cand.get("landmarks")
            lm2 = terpilih.get("landmarks")
            dua_kepala_berbeda = False
            if lm1 and lm2 and len(lm1) >= 1 and len(lm2) >= 1:
                jarak_hidung = math.hypot(lm1[0].x - lm2[0].x, lm1[0].y - lm2[0].y)
                if jarak_hidung < 0.08:
                    tumpang_tindih = True
                    break
                elif jarak_hidung >= 0.10:
                    dua_kepala_berbeda = True

            # 2. Uji Rasio IoU Standar (Intersection-over-Union)
            ambang_iou_efektif = 0.65 if dua_kepala_berbeda else ambang_iou
            if luas_gabungan > 0 and (luas_irisan / luas_gabungan) > ambang_iou_efektif:
                tumpang_tindih = True
                break

            # 3. Guardrail Enclosure & Containment (Nested Upper-Torso / Sub-Box Duplicates):
            # Mengeliminasi kotak yang bersarang di dalam kotak tubuh yang lebih besar dari orang yang sama
            # atau potongan tubuh yang berimpit pada sumbu horizontal orang yang sama.
            # KECUALI jika kedua kandidat terbukti memiliki 2 kepala berbeda (Pilar 1.1: Duduk Sebangku Rapat).
            rasio_containment = (luas_irisan / float(min_luas)) if min_luas > 0 else 0.0
            irisan_w = max(0.0, ix2 - ix1)
            rasio_w = (irisan_w / float(min_w)) if min_w > 0 else 0.0
            delta_pusat_x = abs(cpx1 - cpx2)

            apakah_bersarang_atau_split = (
                not dua_kepala_berbeda and (
                    (rasio_containment >= 0.58 and delta_pusat_x < min_w * 0.40) or
                    (rasio_w >= 0.62 and delta_pusat_x < min_w * 0.35)
                )
            )

            if apakah_bersarang_atau_split:
                if luas1 > luas2 * 1.15 and (cand.get("landmarks") is not None or terpilih.get("landmarks") is None):
                    idx_ganti = kandidat_terpilih.index(terpilih)
                    kandidat_terpilih[idx_ganti] = cand
                tumpang_tindih = True
                break

            # 4. Guardrail Hand-Body Enclosure (Tangan Terangkat vs Ghost Box)
            # Mencegah tangan yang diangkat ke samping menduplikasi orang menjadi 2 siswa.
            # Hanya aktif jika cand adalah ghost box kecil tanpa proporsi tubuh nyata dan konsentris dengan lengan orang terpilih.
            if lm2 is not None and lm1 is None and len(lm2) >= 17:
                w_f = dimensi_frame[1] if (dimensi_frame and dimensi_frame[1] > 0) else max(cx1 + cw1, cx2 + cw2, 640)
                h_f = dimensi_frame[0] if (dimensi_frame and dimensi_frame[0] > 0) else max(cy1 + ch1, cy2 + ch2, 480)

                sendi_lengan_di_dalam = False
                for idx_s in (15, 16, 13, 14):
                    s = lm2[idx_s]
                    if getattr(s, 'visibility', 0.5) > 0.35:
                        sx = s.x * w_f
                        sy = s.y * h_f
                        if (cx1 <= sx <= cx1 + cw1) and (cy1 <= sy <= cy1 + ch1):
                            sendi_lengan_di_dalam = True
                            break

                if sendi_lengan_di_dalam and min_luas > 0:
                    if (luas_irisan / float(min_luas) >= 0.75) and delta_pusat_x < min_w * 0.25:
                        tumpang_tindih = True
                        break

        if not tumpang_tindih:
            kandidat_terpilih.append(cand)

    return kandidat_terpilih


# Alias backward-compatibility untuk pemanggil eksternal
calculate_angle_3pts = hitung_sudut_tiga_titik
filter_overlapping_poses = saring_pose_tumpang_tindih
filter_spatial_candidates = saring_kandidat_spasial
