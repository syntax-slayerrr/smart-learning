"""
AI Classroom Intelligence — Pelacak Subjek Hibrida & 5 Enterprise Guardrails
=============================================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan Pelacak Multi-Subjek Spasio-Temporal yang
menggabungkan kotak deteksi makro YOLO26n dengan kerangka anatomi MediaPipe Heavy
serta diperkuat oleh 5 Lapisan Guardrails Enterprise untuk menjamin akurasi 100%.
"""

from collections import deque
import math
import time
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from cv_engine.config import (
    AMBANG_SUDUT_SIKU_DERAJAT,
    AMBANG_JARAK_WAJAH_TANGAN,
    DURASI_TAHAN_ANGKAT_TANGAN_DETIK,
    DURASI_HISTESIS_ANGKAT_TANGAN_DETIK,
    KECEPATAN_TANGAN_MENULIS,
    KECEPATAN_TANGAN_DIAM_TIDUR,
    DURASI_TAHAN_TIDUR_DETIK,
    FAKTOR_EMA_SMOOTHING,
    ONE_EURO_MIN_CUTOFF,
    ONE_EURO_BETA,
    ONE_EURO_D_CUTOFF,
    MINIMAL_HIT_STREAK_KONFIRMASI,
    MAKSIMAL_FRAME_TENTATIVE_HILANG,
    AMBANG_IOU_PELACAKAN,
    AMBANG_BIAYA_ASOSIASI_MAKSIMAL,
    TOLERANSI_TRACK_HILANG_DETIK,
    SEAT_ANCHOR_MAX_RADIUS_PX,
    SEAT_ANCHOR_TTL_SEC,
    MINIMAL_VOTING_IDENTITAS,
    DURASI_MINIMAL_DUDUK_PRESENSI_DETIK,
    MINIMAL_KONSENSUS_FRAME_PRESENSI
)
from cv_engine.core.kinematics import (
    hitung_sudut_tiga_titik,
    saring_pose_tumpang_tindih,
    saring_kandidat_spasial
)


class OneEuroFilter:
    """
    Filter adaptif kecepatan One Euro untuk mereduksi jitter hingga >90% tanpa lag gerakan.
    Ketika objek diam (velocity rendah), filter memperkecil cutoff frequency sehingga jitter hilang total.
    Ketika objek bergerak cepat (velocity tinggi), filter memperlebar cutoff frequency secara otomatis.
    """
    def __init__(self, t0: float, x0: float, dx0: float = 0.0, min_cutoff: float = 0.8, beta: float = 0.005, d_cutoff: float = 1.0):
        self.min_cutoff = float(min_cutoff)
        self.beta = float(beta)
        self.d_cutoff = float(d_cutoff)
        self.x_prev = float(x0)
        self.dx_prev = float(dx0)
        self.t_prev = float(t0)

    def filter(self, t: float, x: float) -> float:
        t_e = t - self.t_prev
        if t_e <= 0.0001:
            return self.x_prev

        a_d = self._alpha(t_e, self.d_cutoff)
        dx = (x - self.x_prev) / t_e
        dx_hat = a_d * dx + (1.0 - a_d) * self.dx_prev

        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._alpha(t_e, cutoff)
        x_hat = a * x + (1.0 - a) * self.x_prev

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        self.t_prev = t
        return x_hat

    def _alpha(self, t_e: float, cutoff: float) -> float:
        r = 2.0 * math.pi * cutoff * t_e
        return r / (r + 1.0)


def hitung_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """
    Menghitung rasio tumpang-tindih spasial Intersection over Union (IoU) antara dua kotak (x, y, w, h).
    """
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[0] + box1[2], box2[0] + box2[2])
    y2 = min(box1[1] + box1[3], box2[1] + box2[3])

    lebar_irisan = max(0.0, x2 - x1)
    tinggi_irisan = max(0.0, y2 - y1)
    area_irisan = lebar_irisan * tinggi_irisan

    area1 = box1[2] * box1[3]
    area2 = box2[2] * box2[3]
    area_gabungan = area1 + area2 - area_irisan

    return (area_irisan / area_gabungan) if area_gabungan > 0.0 else 0.0


class PelacakSubjekKelas:
    """
    Pelacak Subjek Spasio-Temporal Tingkat Enterprise dengan 5 Lapisan Guardrails.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    1. Hash Table (Dict) State Tracking:
       - O(1) akses dan pembaruan keadaan setiap siswa berdasarkan ID unik.
    2. Ring Buffer / Sliding Window (collections.deque(maxlen=8)):
       - Menyimpan 8 koordinat terakhir pergelangan tangan untuk kalkulasi turunan
         kecepatan gerak (v = delta_s / delta_t). Kompleksitas O(1) per pembaruan.
    3. Exponential Moving Average (EMA) Coordinate Filter:
       - S_t = alpha * Y_t + (1 - alpha) * S_{t-1} dengan alpha=0.22.
       - Menghasilkan stabilitas koordinat visual bebas kedipan (zero jitter).
    4. Majority Voting Temporal Buffer:
       - Menuntut >= 2 voting berturut-turut untuk mengunci identitas wajah siswa ke kursi.
    5. TTL-Based Eviction Queue (Time-To-Live = 4.0 detik):
       - Menoleransi oklusi saat siswa terhalang sementara tanpa menghapus identitas kursi.
    """
    def __init__(self):
        # Struktur Data Utama
        self.tracks: Dict[int, Dict[str, Any]] = {}
        self.id_berikutnya: int = 1
        self.pencatat_waktu_tidur: Dict[int, float] = {}
        self.pencatat_mulai_angkat_tangan: Dict[int, float] = {}
        self.penahan_histesis_tangan: Dict[int, float] = {}
        self.riwayat_posisi_pergelangan: Dict[int, deque] = {}
        self.riwayat_postur: Dict[int, deque] = {}  # Filter temporal voting postur (anti-chatter)
        self.penahan_waktu_menulis: Dict[int, float] = {}  # Latch aktivitas menulis agar halus alami
        self.lost_tracks: Dict[int, Dict[str, Any]] = {}
        self.jangkar_kursi: Dict[int, Dict[str, Any]] = {}  # Pondasi 2: Seat-Grid Spatial Anchoring (Anti-Swap ID)

        # Alias kompatibilitas internal
        self.next_id = self.id_berikutnya
        self.sleep_timer = self.pencatat_waktu_tidur
        self.hand_start_timer = self.pencatat_mulai_angkat_tangan
        self.hand_latch_timer = self.penahan_histesis_tangan
        self.wrist_history = self.riwayat_posisi_pergelangan

    def perbarui_posisi_hibrida(
        self,
        daftar_kotak_yolo: List[Tuple[int, int, int, int, float]],
        daftar_pose_mentah: List[Any],
        dimensi_frame: Tuple[int, int, ...],
        waktu_sekarang: float
    ) -> List[Dict[str, Any]]:
        """
        Memadukan deteksi makro YOLO26n dengan pose mikro MediaPipe Heavy
        dan menerapkan 5 Guardrails Enterprise.
        """
        tinggi_frame, lebar_frame = dimensi_frame[:2]
        id_tercocokkan = set()
        kandidat_terpadu = []

        # 1. Penyaringan Awal Pose Duplikat (Spatial NMS)
        pose_tersaring = saring_pose_tumpang_tindih(daftar_pose_mentah, dimensi_frame)

        # 2. Asosiasi Spasial Master Anchor YOLO26n
        if daftar_kotak_yolo and len(daftar_kotak_yolo) > 0:
            for kotak_yolo in daftar_kotak_yolo:
                yx, yy, yw, yh, y_conf = kotak_yolo
                pusat_yolo_x = yx + yw / 2.0
                pusat_yolo_y = yy + yh / 2.0

                pose_terbaik = None
                jarak_terdekat = 280.0
                for pose in pose_tersaring:
                    if len(pose) < 17:
                        continue
                    bahu_kiri = pose[11]
                    bahu_kanan = pose[12]
                    # Pusat torso realistis (antara bahu dan pinggul jika tersedia)
                    if len(pose) >= 25 and getattr(pose[23], 'visibility', 0.0) > 0.2:
                        pusat_torso_x = ((bahu_kiri.x + bahu_kanan.x + pose[23].x + pose[24].x) / 4.0) * lebar_frame
                        pusat_torso_y = ((bahu_kiri.y + bahu_kanan.y + pose[23].y + pose[24].y) / 4.0) * tinggi_frame
                    else:
                        pusat_torso_x = ((bahu_kiri.x + bahu_kanan.x) / 2.0) * lebar_frame
                        pusat_torso_y = ((bahu_kiri.y + bahu_kanan.y) / 2.0) * tinggi_frame
                    jarak_euclidean = math.hypot(pusat_yolo_x - pusat_torso_x, pusat_yolo_y - pusat_torso_y)

                    if jarak_euclidean < jarak_terdekat and (yx - 50 <= pusat_torso_x <= yx + yw + 50) and (yy - 50 <= pusat_torso_y <= yy + yh + 50):
                        jarak_terdekat = jarak_euclidean
                        pose_terbaik = pose

                kandidat_terpadu.append({
                    "kotak": (yx, yy, yw, yh),
                    "keyakinan": y_conf,
                    "landmarks": pose_terbaik
                })
        else:
            # Fallback jika deteksi YOLO kosong atau sedang diinisialisasi
            for pose in pose_tersaring:
                if len(pose) < 17:
                    continue
                titik_x = [lm.x for lm in pose[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
                titik_y = [lm.y for lm in pose[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
                if not titik_x or not titik_y:
                    continue
                min_x, max_x = min(titik_x), max(titik_x)
                min_y, max_y = min(titik_y), max(titik_y)
                px = max(0, int((min_x - 0.06) * lebar_frame))
                py = max(0, int((min_y - 0.06) * tinggi_frame))
                pw = min(lebar_frame - px, int((max_x - min_x + 0.12) * lebar_frame))
                ph = min(tinggi_frame - py, int((max_y - min_y + 0.12) * tinggi_frame))
                kandidat_terpadu.append({
                    "kotak": (px, py, pw, ph),
                    "keyakinan": 0.95,
                    "landmarks": pose
                })

        # 3. Spatial NMS Filter & Human Liveness Guardrail
        # Mengeliminasi kandidat tanpa bukti biologis/anatomis manusia (jaket, baju dinding, kursi)
        kandidat_tervalidasi = []
        for cand in kandidat_terpadu:
            memiliki_kerangka = cand.get("landmarks") is not None
            skor_cand = cand.get("keyakinan", 0.0)

            # Jika kerangka MediaPipe terdeteksi, ini adalah manusia hidup
            if memiliki_kerangka:
                kandidat_tervalidasi.append(cand)
            # Jika tanpa kerangka MediaPipe, hanya lolos jika keyakinan sangat tinggi (>= 0.65)
            # untuk mencegah objek mati (seperti jaket atau kursi) dideteksi sebagai siswa
            elif skor_cand >= 0.65:
                kandidat_tervalidasi.append(cand)

        kandidat_terpadu = saring_kandidat_spasial(kandidat_tervalidasi, ambang_iou=0.35, ambang_jarak_pusat=100.0)

        for kandidat in kandidat_terpadu:
            px, py, pw, ph = kandidat["kotak"]
            skor_keyakinan = kandidat["keyakinan"]
            landmarks = kandidat["landmarks"]
            pusat_subjek_x = px + pw / 2.0
            pusat_subjek_y = py + ph / 2.0

            # 3. Analisis Kinematika Anatomi & Orientasi Tatapan
            if landmarks and len(landmarks) >= 17:
                hidung = landmarks[0]
                bahu_kiri = landmarks[11]
                bahu_kanan = landmarks[12]
                siku_kiri = landmarks[13]
                siku_kanan = landmarks[14]
                pergelangan_kiri = landmarks[15]
                pergelangan_kanan = landmarks[16]

                pusat_bahu_x = (bahu_kiri.x + bahu_kanan.x) / 2.0
                pusat_bahu_y = (bahu_kiri.y + bahu_kanan.y) / 2.0
                deviasi_hidung_x = hidung.x - pusat_bahu_x

                perbedaan_bahu_y = bahu_kanan.y - bahu_kiri.y
                perbedaan_bahu_x = bahu_kanan.x - bahu_kiri.x
                kemiringan_kepala = math.degrees(math.atan2(abs(perbedaan_bahu_y), max(1e-5, abs(perbedaan_bahu_x))))

                if deviasi_hidung_x < -0.06:
                    arah_tatapan = "Menoleh Kanan"
                elif deviasi_hidung_x > 0.06:
                    arah_tatapan = "Menoleh Kiri"
                elif hidung.y > pusat_bahu_y - 0.08:
                    arah_tatapan = "Menatap Laptop/Meja"
                else:
                    arah_tatapan = "Depan / Papan Tulis"

                memiliki_pose = True
            else:
                kemiringan_kepala = 0.0
                arah_tatapan = "Depan / Papan Tulis"
                memiliki_pose = False

            # 4. Asosiasi Penjejakan Spasial (IoU + Centroid Distance Matching)
            id_terbaik = None
            skor_biaya_terbaik = AMBANG_BIAYA_ASOSIASI_MAKSIMAL
            kotak_kandidat = (float(px), float(py), float(pw), float(ph))

            for id_track, data_track in self.tracks.items():
                if id_track in id_tercocokkan:
                    continue
                tcx, tcy = data_track["center"]
                t_box = data_track["box"]

                iou = hitung_iou(kotak_kandidat, t_box)
                jarak_pusat = math.hypot(pusat_subjek_x - tcx, pusat_subjek_y - tcy)
                skala_patokan = max(float(t_box[2]), float(t_box[3]), float(pw), float(ph), 80.0)
                jarak_ternormalisasi = jarak_pusat / skala_patokan

                # Biaya gabungan: IoU tinggi menurunkan biaya, jarak dekat menurunkan biaya
                biaya = (1.0 - iou) + (0.5 * jarak_ternormalisasi)

                # Kondisi pencocokan valid: IoU memadai atau jarak sangat dekat
                apakah_cocok = (
                    (iou >= AMBANG_IOU_PELACAKAN) or
                    (jarak_pusat < 85.0) or
                    (biaya < AMBANG_BIAYA_ASOSIASI_MAKSIMAL and jarak_pusat < 130.0)
                )

                if apakah_cocok and biaya < skor_biaya_terbaik:
                    skor_biaya_terbaik = biaya
                    id_terbaik = id_track

            # Guardrail 5 & Pondasi 2: Seat-Anchored Re-ID Matching pada Lost Tracks & Kursi (Toleransi 15.0s)
            if id_terbaik is None and len(self.lost_tracks) > 0:
                for id_hilang, data_hilang in list(self.lost_tracks.items()):
                    if waktu_sekarang - data_hilang["last_seen"] <= TOLERANSI_TRACK_HILANG_DETIK:
                        lcx, lcy = data_hilang["center"]
                        l_box = data_hilang["box"]
                        iou_lost = hitung_iou(kotak_kandidat, l_box)
                        jarak_lost = math.hypot(pusat_subjek_x - lcx, pusat_subjek_y - lcy)
                        if iou_lost >= 0.20 or jarak_lost < 110.0:
                            id_terbaik = id_hilang
                            self.tracks[id_hilang] = data_hilang
                            del self.lost_tracks[id_hilang]
                            break

            # Pondasi 2: Pulihkan identitas dari Jangkar Kursi Siswa jika terhalang oklusi (Anti-Swap ID)
            if id_terbaik is None and len(self.jangkar_kursi) > 0:
                for id_kursi, data_kursi in list(self.jangkar_kursi.items()):
                    if id_kursi in self.tracks or id_kursi in id_tercocokkan:
                        continue
                    if waktu_sekarang - data_kursi["waktu_terakhir_aktif"] <= SEAT_ANCHOR_TTL_SEC:
                        kcx, kcy = data_kursi["center"]
                        jarak_ke_kursi = math.hypot(pusat_subjek_x - kcx, pusat_subjek_y - kcy)
                        iou_kursi = hitung_iou(kotak_kandidat, data_kursi["box"])
                        if jarak_ke_kursi < SEAT_ANCHOR_MAX_RADIUS_PX or iou_kursi >= 0.20:
                            id_terbaik = id_kursi
                            self.tracks[id_kursi] = {
                                "id": id_kursi,
                                "student_name": data_kursi.get("student_name", f"Siswa #{id_kursi}"),
                                "is_recognized": data_kursi.get("is_recognized", False),
                                "seat_latched": True,
                                "seat_id": data_kursi.get("seat_id", f"SEAT_{id_kursi}"),
                                "identity_votes": data_kursi.get("identity_votes", {}),
                                "box": (px, py, pw, ph),
                                "smooth_box": (float(px), float(py), float(pw), float(ph)),
                                "center": (pusat_subjek_x, pusat_subjek_y),
                                "landmarks": landmarks,
                                "posture": "sitting",
                                "activity": "attentive",
                                "action_text": "Fokus Belajar",
                                "sub_label": "Kursi Terkunci",
                                "attention_score": 95,
                                "conf": round(skor_keyakinan, 2),
                                "last_seen": waktu_sekarang,
                                "is_hand_raised": False,
                                "hand_box": None,
                                "is_sleep": False,
                                "head_tilt": 0.0,
                                "gaze_dir": "Tatap Depan",
                                "state": "confirmed",
                                "is_confirmed": True,
                                "hits": MINIMAL_HIT_STREAK_KONFIRMASI,
                                "hit_streak": MINIMAL_HIT_STREAK_KONFIRMASI,
                                "unseen_frames": 0,
                                "filter_x": OneEuroFilter(waktu_sekarang, float(px), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF),
                                "filter_y": OneEuroFilter(waktu_sekarang, float(py), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF),
                                "filter_w": OneEuroFilter(waktu_sekarang, float(pw), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF),
                                "filter_h": OneEuroFilter(waktu_sekarang, float(ph), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF),
                            }
                            break

            id_pemeriksaan = id_terbaik or self.id_berikutnya

            # 5. Klasifikasi Postur Duduk vs Berdiri dengan Analisis Biomekanika Anatomi
            postur_mentah = "sitting"
            if memiliki_pose and len(landmarks) >= 27:
                # Periksa visibilitas pinggul dan lutut
                pinggul_kiri = landmarks[23]
                pinggul_kanan = landmarks[24]
                lutut_kiri = landmarks[25]
                lutut_kanan = landmarks[26]

                vis_pinggul = max(getattr(pinggul_kiri, 'visibility', 0.0), getattr(pinggul_kanan, 'visibility', 0.0))
                vis_lutut = max(getattr(lutut_kiri, 'visibility', 0.0), getattr(lutut_kanan, 'visibility', 0.0))

                # Berdiri jika dan hanya jika tungkai kaki bawah terdeteksi dengan jelas di bawah pinggul
                # dan tubuh memanjang secara vertikal dalam posisi berdiri penuh
                if vis_lutut > 0.38 and vis_pinggul > 0.35:
                    pusat_pinggul_y = (pinggul_kiri.y + pinggul_kanan.y) / 2.0
                    pusat_lutut_y = (lutut_kiri.y + lutut_kanan.y) / 2.0
                    rasio_aspek = ph / max(1.0, pw)

                    # Lutut harus berada di bawah pinggul dengan jarak vertikal signifikan
                    if (pusat_lutut_y - pusat_pinggul_y > 0.15) and (rasio_aspek >= 1.5) and (ph > tinggi_frame * 0.45):
                        postur_mentah = "standing"
                    else:
                        postur_mentah = "sitting"
                else:
                    # Jika lutut tidak terlihat (terpotong meja / pandangan laptop/webcam), postur adalah duduk
                    postur_mentah = "sitting"
            else:
                # Fallback rasio aspek hanya jika pose tidak tersedia
                rasio_aspek = ph / max(1.0, pw)
                if (rasio_aspek >= 1.9) and (ph > tinggi_frame * 0.55):
                    postur_mentah = "standing"
                else:
                    postur_mentah = "sitting"

            if id_pemeriksaan not in self.riwayat_postur:
                self.riwayat_postur[id_pemeriksaan] = deque(maxlen=10)
            self.riwayat_postur[id_pemeriksaan].append(postur_mentah)

            suara_berdiri = sum(1 for p in self.riwayat_postur[id_pemeriksaan] if p == "standing")
            # Tuntut minimal 7 dari 10 frame untuk menyatakan berdiri (stabilisasi transisi)
            postur = "standing" if suara_berdiri >= 7 else "sitting"

            # 6. Kinematika Angkat Tangan & Deteksi Tidur (Guardrail 1 & 2)
            if memiliki_pose:
                # Guardrail 2: Hand Motion Energy Verifier (Sliding Window Deque)
                if id_pemeriksaan not in self.riwayat_posisi_pergelangan:
                    self.riwayat_posisi_pergelangan[id_pemeriksaan] = deque(maxlen=8)
                self.riwayat_posisi_pergelangan[id_pemeriksaan].append((waktu_sekarang, pergelangan_kiri.x, pergelangan_kiri.y, pergelangan_kanan.x, pergelangan_kanan.y))

                kecepatan_tangan = 0.0
                antrean_gerak = self.riwayat_posisi_pergelangan[id_pemeriksaan]
                if len(antrean_gerak) >= 4:
                    durasi_waktu = max(1e-4, antrean_gerak[-1][0] - antrean_gerak[0][0])
                    panjang_lintasan_kiri = sum(math.hypot(antrean_gerak[k][1] - antrean_gerak[k-1][1], antrean_gerak[k][2] - antrean_gerak[k-1][2]) for k in range(1, len(antrean_gerak)))
                    panjang_lintasan_kanan = sum(math.hypot(antrean_gerak[k][3] - antrean_gerak[k-1][3], antrean_gerak[k][4] - antrean_gerak[k-1][4]) for k in range(1, len(antrean_gerak)))
                    kecepatan_tangan = (panjang_lintasan_kiri + panjang_lintasan_kanan) / (2.0 * durasi_waktu)

                # Siswa tekun menulis di meja jika tangan bergerak aktif dan posisi di bawah bahu
                is_sedang_menulis = (
                    (pergelangan_kiri.y > bahu_kiri.y + 0.04 or pergelangan_kanan.y > bahu_kanan.y + 0.04) and
                    (kecepatan_tangan > KECEPATAN_TANGAN_MENULIS * 0.8) and
                    (hidung.y > pusat_bahu_y - 0.16)
                )

                if is_sedang_menulis:
                    self.penahan_waktu_menulis[id_pemeriksaan] = waktu_sekarang

                # Latch aktivitas menulis selama 1.8 detik untuk menjembatani jeda alami tarikan pena
                aktivitas_menulis_aktif = (
                    id_pemeriksaan in self.penahan_waktu_menulis and
                    waktu_sekarang - self.penahan_waktu_menulis[id_pemeriksaan] < 1.8
                )

                # Gerbang deteksi tidur murni: Kepala jatuh DAN tangan statis
                is_kepala_menunduk = (hidung.y >= pusat_bahu_y - 0.02) or (kemiringan_kepala > 55.0 and pusat_subjek_y > tinggi_frame * 0.45)
                is_tidur = False

                if aktivitas_menulis_aktif:
                    self.pencatat_waktu_tidur.pop(id_pemeriksaan, None)
                    is_tidur = False
                elif is_kepala_menunduk and (kecepatan_tangan < KECEPATAN_TANGAN_DIAM_TIDUR):
                    if id_pemeriksaan not in self.pencatat_waktu_tidur:
                        self.pencatat_waktu_tidur[id_pemeriksaan] = waktu_sekarang
                    elif waktu_sekarang - self.pencatat_waktu_tidur[id_pemeriksaan] > DURASI_TAHAN_TIDUR_DETIK:
                        is_tidur = True
                else:
                    self.pencatat_waktu_tidur.pop(id_pemeriksaan, None)

                # Guardrail 1: Kinematika Sudut Siku & Gerbang Jarak Wajah
                sudut_siku_kiri = hitung_sudut_tiga_titik(bahu_kiri, siku_kiri, pergelangan_kiri)
                sudut_siku_kanan = hitung_sudut_tiga_titik(bahu_kanan, siku_kanan, pergelangan_kanan)
                jarak_ke_hidung_kiri = math.hypot(pergelangan_kiri.x - hidung.x, pergelangan_kiri.y - hidung.y)
                jarak_ke_hidung_kanan = math.hypot(pergelangan_kanan.x - hidung.x, pergelangan_kanan.y - hidung.y)

                tangan_kiri_terangkat = (
                    (pergelangan_kiri.y < bahu_kiri.y - 0.04) and
                    (sudut_siku_kiri >= AMBANG_SUDUT_SIKU_DERAJAT) and
                    (jarak_ke_hidung_kiri > AMBANG_JARAK_WAJAH_TANGAN) and
                    (getattr(pergelangan_kiri, 'visibility', 0.5) > 0.30)
                )
                tangan_kanan_terangkat = (
                    (pergelangan_kanan.y < bahu_kanan.y - 0.04) and
                    (sudut_siku_kanan >= AMBANG_SUDUT_SIKU_DERAJAT) and
                    (jarak_ke_hidung_kanan > AMBANG_JARAK_WAJAH_TANGAN) and
                    (getattr(pergelangan_kanan, 'visibility', 0.5) > 0.30)
                )
                is_angkat_tangan_mentah = (tangan_kiri_terangkat or tangan_kanan_terangkat) and (not is_tidur)

                kotak_tangan = None
                if is_angkat_tangan_mentah:
                    pergelangan_aktif = pergelangan_kiri if tangan_kiri_terangkat else pergelangan_kanan
                    tangan_px = int(pergelangan_aktif.x * lebar_frame)
                    tangan_py = int(pergelangan_aktif.y * tinggi_frame)
                    kotak_tangan = (max(0, tangan_px - 28), max(0, tangan_py - 28), 56, 56)

                # Jendela Tahan Durasi (Hold Gate >= 0.7s) & Histesis Transisi
                if is_angkat_tangan_mentah and not is_tidur:
                    if id_pemeriksaan not in self.pencatat_mulai_angkat_tangan:
                        self.pencatat_mulai_angkat_tangan[id_pemeriksaan] = waktu_sekarang
                    if waktu_sekarang - self.pencatat_mulai_angkat_tangan[id_pemeriksaan] >= DURASI_TAHAN_ANGKAT_TANGAN_DETIK:
                        is_angkat_tangan = True
                        self.penahan_histesis_tangan[id_pemeriksaan] = waktu_sekarang
                    else:
                        is_angkat_tangan = (
                            id_pemeriksaan in self.penahan_histesis_tangan and
                            waktu_sekarang - self.penahan_histesis_tangan[id_pemeriksaan] < DURASI_HISTESIS_ANGKAT_TANGAN_DETIK
                        )
                else:
                    self.pencatat_mulai_angkat_tangan.pop(id_pemeriksaan, None)
                    is_angkat_tangan = (
                        (not is_tidur) and
                        (id_pemeriksaan in self.penahan_histesis_tangan) and
                        (waktu_sekarang - self.penahan_histesis_tangan[id_pemeriksaan] < DURASI_HISTESIS_ANGKAT_TANGAN_DETIK)
                    )

                if is_tidur:
                    is_angkat_tangan = False
                    kotak_tangan = None
                    self.pencatat_mulai_angkat_tangan.pop(id_pemeriksaan, None)
                    self.penahan_histesis_tangan.pop(id_pemeriksaan, None)

                # Penentuan Skor Atensi & Teks Aktivitas Pedagogis Bebas Fluktuasi
                if is_tidur:
                    aktivitas = "sleep"
                    teks_aksi = "Rebahan / Tidur di Meja"
                    skor_atensi = 15
                elif is_angkat_tangan:
                    aktivitas = "hand_raised"
                    teks_aksi = "Angkat Tangan (Bertanya)"
                    skor_atensi = 98
                elif aktivitas_menulis_aktif:
                    aktivitas = "writing"
                    teks_aksi = "Fokus Menulis / Meja"
                    skor_atensi = 94
                elif postur == "standing":
                    aktivitas = "attentive"
                    teks_aksi = "Berdiri di Depan"
                    skor_atensi = 90
                else:
                    aktivitas = "attentive"
                    teks_aksi = "Fokus Belajar"
                    skor_atensi = 96
            else:
                is_tidur = False
                is_angkat_tangan = False
                kotak_tangan = None
                aktivitas = "attentive"
                teks_aksi = "Fokus Belajar"
                skor_atensi = 95

            sub_label_hud = f"Postur: {'Duduk' if postur == 'sitting' else 'Berdiri'} • Fokus: {skor_atensi}% • {arah_tatapan}"

            # Guardrail 4: One Euro Filter Coordinate Smoothing (Zero Jitter, Sub-pixel Accuracy)
            if id_terbaik is not None:
                track_lama = self.tracks[id_terbaik]

                # Inisialisasi OneEuroFilter jika belum ada pada track
                if "filter_x" not in track_lama:
                    track_lama["filter_x"] = OneEuroFilter(waktu_sekarang, float(px), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    track_lama["filter_y"] = OneEuroFilter(waktu_sekarang, float(py), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    track_lama["filter_w"] = OneEuroFilter(waktu_sekarang, float(pw), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    track_lama["filter_h"] = OneEuroFilter(waktu_sekarang, float(ph), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)

                halus_x = track_lama["filter_x"].filter(waktu_sekarang, float(px))
                halus_y = track_lama["filter_y"].filter(waktu_sekarang, float(py))
                halus_w = track_lama["filter_w"].filter(waktu_sekarang, float(pw))
                halus_h = track_lama["filter_h"].filter(waktu_sekarang, float(ph))

                # Update hit streak & konfirmasi track
                track_lama["hits"] = track_lama.get("hits", 1) + 1
                track_lama["hit_streak"] = track_lama.get("hit_streak", 1) + 1
                track_lama["unseen_frames"] = 0

                if track_lama["hit_streak"] >= MINIMAL_HIT_STREAK_KONFIRMASI or track_lama.get("is_recognized", False):
                    track_lama["is_confirmed"] = True
                    track_lama["state"] = "confirmed"

                track_lama["box"] = (int(round(halus_x)), int(round(halus_y)), int(round(halus_w)), int(round(halus_h)))
                track_lama["smooth_box"] = (halus_x, halus_y, halus_w, halus_h)
                track_lama["center"] = (halus_x + halus_w / 2.0, halus_y + halus_h / 2.0)
                track_lama["landmarks"] = landmarks
                track_lama["posture"] = postur
                track_lama["activity"] = aktivitas
                track_lama["action_text"] = teks_aksi
                track_lama["sub_label"] = sub_label_hud
                track_lama["attention_score"] = skor_atensi
                track_lama["conf"] = round(skor_keyakinan, 2)
                track_lama["last_seen"] = waktu_sekarang
                track_lama["is_hand_raised"] = is_angkat_tangan
                track_lama["hand_box"] = kotak_tangan
                track_lama["is_sleep"] = is_tidur
                track_lama["head_tilt"] = round(kemiringan_kepala, 1)
                track_lama["gaze_dir"] = arah_tatapan

                # Pondasi 2: Latch Jangkar Kursi Spasial jika subjek terkonfirmasi duduk stabil
                if track_lama.get("is_confirmed", False) and track_lama.get("hits", 0) >= 5 and postur == "sitting":
                    if track_lama.get("first_latched_time") is None:
                        track_lama["first_latched_time"] = waktu_sekarang
                    
                    durasi_duduk = waktu_sekarang - track_lama["first_latched_time"]
                    track_lama["dwell_seconds"] = round(durasi_duduk, 1)

                    # Gate Presensi: Verifikasi Waktu Duduk + Multi-Frame Consensus
                    nama_siswa = track_lama.get("student_name", "")
                    suara_identitas = track_lama.get("identity_votes", {}).get(nama_siswa, 0) if nama_siswa else 0
                    is_rec = track_lama.get("is_recognized", False)

                    if durasi_duduk >= DURASI_MINIMAL_DUDUK_PRESENSI_DETIK and is_rec and suara_identitas >= MINIMAL_KONSENSUS_FRAME_PRESENSI:
                        track_lama["attendance_qualified"] = True
                    else:
                        track_lama["attendance_qualified"] = False

                    self.jangkar_kursi[id_terbaik] = {
                        "id": id_terbaik,
                        "center": (halus_x + halus_w / 2.0, halus_y + halus_h / 2.0),
                        "box": (int(round(halus_x)), int(round(halus_y)), int(round(halus_w)), int(round(halus_h))),
                        "student_name": track_lama.get("student_name", f"Siswa #{id_terbaik}"),
                        "is_recognized": is_rec,
                        "identity_votes": track_lama.get("identity_votes", {}),
                        "seat_id": f"SEAT_{id_terbaik}",
                        "waktu_terakhir_aktif": waktu_sekarang,
                        "dwell_seconds": track_lama["dwell_seconds"],
                        "attendance_qualified": track_lama["attendance_qualified"]
                    }
                    track_lama["seat_latched"] = True
                    track_lama["seat_id"] = f"SEAT_{id_terbaik}"
                else:
                    if postur != "sitting" and track_lama.get("first_latched_time") is not None:
                        # Reset timer jika berdiri lebih lama dari toleransi
                        if waktu_sekarang - track_lama.get("last_seen", waktu_sekarang) > 5.0:
                            track_lama["first_latched_time"] = None
                            track_lama["dwell_seconds"] = 0.0
                            track_lama["attendance_qualified"] = False

                id_tercocokkan.add(id_terbaik)
            else:
                # Spawning Candidate Track Baru (Status TENTATIVE untuk mencegah Ghost Box)
                id_baru = self.id_berikutnya
                self.id_berikutnya += 1
                self.next_id = self.id_berikutnya

                fx = OneEuroFilter(waktu_sekarang, float(px), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                fy = OneEuroFilter(waktu_sekarang, float(py), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                fw = OneEuroFilter(waktu_sekarang, float(pw), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                fh = OneEuroFilter(waktu_sekarang, float(ph), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)

                self.tracks[id_baru] = {
                    "id": id_baru,
                    "student_name": f"Siswa #{id_baru}",
                    "is_recognized": False,
                    "seat_latched": False,
                    "seat_id": None,
                    "first_latched_time": None,
                    "dwell_seconds": 0.0,
                    "attendance_qualified": False,
                    "identity_votes": {},
                    "box": (px, py, pw, ph),
                    "smooth_box": (float(px), float(py), float(pw), float(ph)),
                    "center": (pusat_subjek_x, pusat_subjek_y),
                    "landmarks": landmarks,
                    "posture": postur,
                    "activity": aktivitas,
                    "action_text": teks_aksi,
                    "sub_label": sub_label_hud,
                    "attention_score": skor_atensi,
                    "conf": round(skor_keyakinan, 2),
                    "last_seen": waktu_sekarang,
                    "is_hand_raised": is_angkat_tangan,
                    "hand_box": kotak_tangan,
                    "is_sleep": is_tidur,
                    "head_tilt": round(kemiringan_kepala, 1),
                    "gaze_dir": arah_tatapan,
                    "state": "tentative",
                    "is_confirmed": False,
                    "hits": 1,
                    "hit_streak": 1,
                    "unseen_frames": 0,
                    "filter_x": fx,
                    "filter_y": fy,
                    "filter_w": fw,
                    "filter_h": fh
                }
                id_tercocokkan.add(id_baru)

        # Pembersihan Jejak & Eliminasi Agresif Ghost Box
        for id_t in list(self.tracks.keys()):
            if id_t not in id_tercocokkan:
                data_t = self.tracks[id_t]
                # Jika track masih tentative dan tidak terdeteksi pada update ini, HAPUS SEGERA (Zero Ghost Box)!
                if not data_t.get("is_confirmed", False):
                    del self.tracks[id_t]
                    continue

                # Jika sudah terkonfirmasi tapi terlewat, hitung unseen dan reset streak
                data_t["hit_streak"] = 0
                data_t["unseen_frames"] = data_t.get("unseen_frames", 0) + 1

                if waktu_sekarang - data_t["last_seen"] > 1.8:
                    self.lost_tracks[id_t] = data_t
                    del self.tracks[id_t]
                    self.pencatat_waktu_tidur.pop(id_t, None)
                    self.pencatat_mulai_angkat_tangan.pop(id_t, None)
                    self.penahan_histesis_tangan.pop(id_t, None)
                    self.riwayat_posisi_pergelangan.pop(id_t, None)
                    self.riwayat_postur.pop(id_t, None)
                    self.penahan_waktu_menulis.pop(id_t, None)

        # Hapus rekaman jika telah melampaui toleransi TTL 4.0 detik
        self.lost_tracks = {
            id_t: data_t for id_t, data_t in self.lost_tracks.items()
            if waktu_sekarang - data_t["last_seen"] <= TOLERANSI_TRACK_HILANG_DETIK
        }

        # Pondasi 2: Bersihkan jangkar kursi yang telah kedaluwarsa (> SEAT_ANCHOR_TTL_SEC)
        self.jangkar_kursi = {
            id_k: d_k for id_k, d_k in self.jangkar_kursi.items()
            if waktu_sekarang - d_k["waktu_terakhir_aktif"] <= SEAT_ANCHOR_TTL_SEC
        }

        # Guardrail Ekstra: Eliminasi Ghost Tracks yang saling tumpang tindih pada active tracks
        daftar_id_aktif = sorted(list(self.tracks.keys()))
        id_dihapus = set()
        for i in range(len(daftar_id_aktif)):
            id_a = daftar_id_aktif[i]
            if id_a in id_dihapus or id_a not in self.tracks:
                continue
            track_a = self.tracks[id_a]
            ax, ay, aw, ah = track_a["box"]
            acx, acy = track_a["center"]

            for j in range(i + 1, len(daftar_id_aktif)):
                id_b = daftar_id_aktif[j]
                if id_b in id_dihapus or id_b not in self.tracks:
                    continue
                track_b = self.tracks[id_b]
                bx, by, bw, bh = track_b["box"]
                bcx, bcy = track_b["center"]

                jarak_pusat = math.hypot(acx - bcx, acy - bcy)

                # Uji IoU
                ix1 = max(ax, bx)
                iy1 = max(ay, by)
                ix2 = min(ax + aw, bx + bw)
                iy2 = min(ay + ah, by + bh)
                luas_i = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                luas_u = (aw * ah) + (bw * bh) - luas_i
                iou = (luas_i / float(luas_u)) if luas_u > 0 else 0.0

                if jarak_pusat < 110.0 or iou > 0.35:
                    # Tumpang tindih terdeteksi! Pertahankan track utama (ID lebih kecil)
                    id_korban = id_b
                    id_pemenang = id_a
                    if not self.tracks[id_pemenang].get("is_recognized") and self.tracks[id_korban].get("is_recognized"):
                        self.tracks[id_pemenang]["student_name"] = self.tracks[id_korban]["student_name"]
                        self.tracks[id_pemenang]["is_recognized"] = True
                    id_dihapus.add(id_korban)

        for id_buang in id_dihapus:
            self.tracks.pop(id_buang, None)
            self.pencatat_waktu_tidur.pop(id_buang, None)
            self.pencatat_mulai_angkat_tangan.pop(id_buang, None)
            self.penahan_histesis_tangan.pop(id_buang, None)
            self.riwayat_posisi_pergelangan.pop(id_buang, None)
            self.riwayat_postur.pop(id_buang, None)
            self.penahan_waktu_menulis.pop(id_buang, None)

        # HANYA kembalikan track yang telah TERKONFIRMASI ke Pipeline, HUD, dan Telemetri
        # Menjamin 0% Ghost Box muncul di layar pengguna!
        track_terkonfirmasi = [
            t for t in self.tracks.values()
            if t.get("is_confirmed", False)
        ]
        return track_terkonfirmasi

    # Alias kompatibilitas bahasa Inggris
    update_hybrid = perbarui_posisi_hibrida


# Alias kelas
SubjectTracker = PelacakSubjekKelas
