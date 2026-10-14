"""
AI Classroom Intelligence — Kinematika, Geometri Spasial & Filter Pose
======================================================================
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan algoritma geometri analitis dan penyaringan spasial:
1. Algoritma Vektor Dot-Product Trigonometrik untuk Sudut Sendi Siku.
2. Algoritma Non-Maximum Suppression (NMS) berbasis Spatial IoU & Jarak Euclidean.
"""

import math
from typing import List, Tuple, Any, Dict
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


def hitung_jarak_telinga_ke_lengan(landmarks: List[Any]) -> float:
    """
    Menghitung jarak Euclidean ternormalisasi terdekat antara telinga dan lengan (siku/pergelangan).
    Pembeda biomekanis mutlak antara:
    - Membaca dekat meja (otot leher menahan kepala melayang di udara, jarak > 0.18)
    - Tertidur di meja (kepala bersandar menempel fisik di atas lengan/meja, jarak < 0.15)
    """
    if not landmarks or len(landmarks) < 17:
        return 1.0
    l_ear = landmarks[7]
    r_ear = landmarks[8]
    l_elbow = landmarks[13]
    r_elbow = landmarks[14]
    l_wrist = landmarks[15]
    r_wrist = landmarks[16]

    return float(min(
        math.hypot(l_ear.x - l_wrist.x, l_ear.y - l_wrist.y),
        math.hypot(l_ear.x - l_elbow.x, l_ear.y - l_elbow.y),
        math.hypot(r_ear.x - r_wrist.x, r_ear.y - r_wrist.y),
        math.hypot(r_ear.x - r_elbow.x, r_ear.y - r_elbow.y)
    ))


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
        for (x1_b, y1_b, x2_b, y2_b, _) in kotak_terseleksi:
            pusat_x_b = (x1_b + x2_b) / 2.0
            pusat_y_b = (y1_b + y2_b) / 2.0

            # Uji Jarak Euclidean Pusat Massa
            if math.hypot(pusat_x_a - pusat_x_b, pusat_y_a - pusat_y_b) < ambang_jarak_pusat:
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
    ambang_iou: float = 0.35,
    ambang_jarak_pusat: float = 100.0
) -> List[Dict[str, Any]]:
    """
    Menyaring kandidat subjek deteksi terpadu agar tidak terjadi duplikasi/ghost box.
    Mengurutkan kandidat berdasarkan skor keyakinan dan mengeliminasi kotak
    yang memiliki IoU tinggi atau jarak pusat sangat dekat (subjek yang sama).
    """
    if len(daftar_kandidat) <= 1:
        return daftar_kandidat

    kandidat_terurut = sorted(daftar_kandidat, key=lambda k: k.get("keyakinan", 0.0), reverse=True)
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

            # 1. Uji Jarak Euclidean Titik Pusat
            if math.hypot(cpx1 - cpx2, cpy1 - cpy2) < ambang_jarak_pusat:
                tumpang_tindih = True
                break

            # 2. Uji Rasio IoU (Intersection-over-Union)
            ix1 = max(cx1, cx2)
            iy1 = max(cy1, cy2)
            ix2 = min(cx1 + cw1, cx2 + cw2)
            iy2 = min(cy1 + ch1, cy2 + ch2)
            luas_irisan = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            luas_gabungan = luas1 + luas2 - luas_irisan

            if luas_gabungan > 0 and (luas_irisan / luas_gabungan) > ambang_iou:
                tumpang_tindih = True
                break

        if not tumpang_tindih:
            kandidat_terpilih.append(cand)

    return kandidat_terpilih


# Alias backward-compatibility untuk pemanggil eksternal
calculate_angle_3pts = hitung_sudut_tiga_titik
filter_overlapping_poses = saring_pose_tumpang_tindih
filter_spatial_candidates = saring_kandidat_spasial
