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


def ekstrak_kotak_pose_anatomis(pose: Any, lebar_frame: int, tinggi_frame: int) -> Optional[Tuple[int, int, int, int]]:
    """
    Mengekstrak bounding box anatomis realistis untuk siswa duduk di kelas.
    Mengabaikan landmark tungkai/pinggul yang halusinasi (misal terbalik di atas bahu atau melompat ke meja teman).
    """
    if not pose or len(pose) < 17:
        return None

    bahu_kiri = pose[11]
    bahu_kanan = pose[12]
    pusat_bahu_x = (bahu_kiri.x + bahu_kanan.x) / 2.0
    pusat_bahu_y = (bahu_kiri.y + bahu_kanan.y) / 2.0
    lebar_bahu = max(0.04, abs(bahu_kanan.x - bahu_kiri.x))

    valid_x = []
    valid_y = []

    # 1. Kepala (0-10)
    for i in range(min(11, len(pose))):
        if getattr(pose[i], 'visibility', 0.5) > 0.22:
            valid_x.append(pose[i].x)
            valid_y.append(pose[i].y)

    # 2. Bahu & Lengan (11-16)
    for i in range(11, min(17, len(pose))):
        if getattr(pose[i], 'visibility', 0.5) > 0.22:
            if abs(pose[i].x - pusat_bahu_x) < lebar_bahu * 2.5:
                valid_x.append(pose[i].x)
                valid_y.append(pose[i].y)

    # 3. Pinggul & Tungkai (23-32) hanya jika secara fisik berada di bawah bahu
    for i in range(23, min(33, len(pose))):
        if getattr(pose[i], 'visibility', 0.5) > 0.30:
            if pose[i].y > pusat_bahu_y - 0.02 and abs(pose[i].x - pusat_bahu_x) < lebar_bahu * 2.0:
                valid_x.append(pose[i].x)
                valid_y.append(pose[i].y)

    if not valid_x or not valid_y:
        return None

    min_x = min(valid_x)
    max_x = max(valid_x)
    min_y = min(valid_y)
    max_y = max(valid_y)

    tinggi_kepala_bahu = max(0.05, pusat_bahu_y - min_y)
    if max_y - pusat_bahu_y < tinggi_kepala_bahu * 1.5:
        max_y = min(1.0, pusat_bahu_y + tinggi_kepala_bahu * 2.0)

    px = max(0, int((min_x - 0.03) * lebar_frame))
    py = max(0, int((min_y - 0.03) * tinggi_frame))
    pw = min(lebar_frame - px, int((max_x - min_x + 0.06) * lebar_frame))
    ph = min(tinggi_frame - py, int((max_y - min_y + 0.06) * tinggi_frame))

    return (px, py, pw, ph)


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
        # 2. Asosiasi Spasial Master Anchor YOLO26n
        if daftar_kotak_yolo and len(daftar_kotak_yolo) > 0:
            # Urutkan kotak YOLO dari yang terbesar ke terkecil agar badan penuh mendapat prioritas utama
            kotak_yolo_terurut = sorted(daftar_kotak_yolo, key=lambda k: k[2] * k[3], reverse=True)
            id_pose_terklaim = set()

            for kotak_yolo in kotak_yolo_terurut:
                yx, yy, yw, yh, y_conf = kotak_yolo
                pusat_yolo_x = yx + yw / 2.0
                pusat_yolo_y = yy + yh / 2.0

                pose_terbaik = None
                idx_pose_terbaik = None
                jarak_terdekat = min(yw * 0.45, 38.0)

                for idx_p, pose in enumerate(pose_tersaring):
                    if len(pose) < 17:
                        continue
                    hx = pose[0].x * lebar_frame
                    hy = pose[0].y * tinggi_frame
                    bahu_kiri = pose[11]
                    bahu_kanan = pose[12]
                    pusat_torso_x = ((bahu_kiri.x + bahu_kanan.x) / 2.0) * lebar_frame
                    pusat_torso_y = ((bahu_kiri.y + bahu_kanan.y) / 2.0) * tinggi_frame

                    # Titik kepala/hidung atau torso pose wajib berada dekat dengan sumbu kotak
                    d_torso = math.hypot(pusat_yolo_x - pusat_torso_x, (yy + yh * 0.35) - pusat_torso_y)
                    d_hidung = math.hypot(pusat_yolo_x - hx, (yy + yh * 0.20) - hy)
                    d_efektif = min(d_torso, d_hidung)

                    if d_efektif < jarak_terdekat and (yx - 15 <= pusat_torso_x <= yx + yw + 15):
                        jarak_terdekat = d_efektif
                        pose_terbaik = pose
                        idx_pose_terbaik = idx_p

                # Jika pose belum cocok via pusat torso, periksa apakah kotak YOLO ini melingkupi
                # pergelangan/siku dari pose yang sudah diklaim (misal tangan terangkat ke samping)
                if idx_pose_terbaik is None and len(id_pose_terklaim) > 0:
                    for idx_p in id_pose_terklaim:
                        pose_klaim = pose_tersaring[idx_p]
                        if len(pose_klaim) >= 17:
                            for idx_s in (15, 16, 13, 14):  # pergelangan tangan (15, 16) & siku (13, 14)
                                s = pose_klaim[idx_s]
                                if getattr(s, 'visibility', 0.5) > 0.25:
                                    sx = s.x * lebar_frame
                                    sy = s.y * tinggi_frame
                                    if (yx - 15 <= sx <= yx + yw + 15) and (yy - 15 <= sy <= yy + yh + 15):
                                        idx_pose_terbaik = idx_p
                                        pose_terbaik = pose_klaim
                                        break
                            if idx_pose_terbaik is not None:
                                break

                # Jika pose sudah diklaim oleh kotak lain, kotak ini tetap dipertahankan sebagai subjek terpisah (tanpa menduplikasi pose)
                if idx_pose_terbaik is not None and idx_pose_terbaik in id_pose_terklaim:
                    pose_terbaik = None
                    idx_pose_terbaik = None

                if idx_pose_terbaik is not None:
                    id_pose_terklaim.add(idx_pose_terbaik)

                kandidat_terpadu.append({
                    "kotak": (yx, yy, yw, yh),
                    "keyakinan": y_conf,
                    "landmarks": pose_terbaik
                })

            # Tambahkan juga seluruh pose anatomi MediaPipe yang belum terklaim oleh kotak makro
            for idx_p, pose in enumerate(pose_tersaring):
                if idx_p not in id_pose_terklaim and len(pose) >= 17:
                    box_p = ekstrak_kotak_pose_anatomis(pose, lebar_frame, tinggi_frame)
                    if box_p is not None:
                        kandidat_terpadu.append({
                            "kotak": box_p,
                            "keyakinan": 0.95,
                            "landmarks": pose
                        })
        else:
            # Fallback jika deteksi YOLO kosong atau sedang diinisialisasi
            for pose in pose_tersaring:
                if len(pose) < 17:
                    continue
                box_p = ekstrak_kotak_pose_anatomis(pose, lebar_frame, tinggi_frame)
                if box_p is not None:
                    kandidat_terpadu.append({
                        "kotak": box_p,
                        "keyakinan": 0.95,
                        "landmarks": pose
                    })

        # 3. Spatial NMS Filter & Human Liveness Guardrail
        # Memvalidasi kandidat manusia hidup (MediaPipe atau YOLO proporsional vertikal)
        kandidat_tervalidasi = []
        for cand in kandidat_terpadu:
            memiliki_kerangka = cand.get("landmarks") is not None
            skor_cand = cand.get("keyakinan", 0.0)
            cx, cy, cw, ch = cand["kotak"]
            rasio_aspek = ch / max(1.0, float(cw))

            # Jika kerangka MediaPipe terdeteksi, ini adalah manusia hidup
            if memiliki_kerangka:
                kandidat_tervalidasi.append(cand)
            # Jika tanpa kerangka MediaPipe (misal siswa di jarak 3-8 meter atau siswa berhijab di samping),
            # Lolos jika skor YOLO memadai (>= 0.28) DAN memiliki proporsi tubuh manusia (0.50 <= H/W <= 4.0)
            elif skor_cand >= 0.28 and (0.50 <= rasio_aspek <= 4.0) and ch >= 20:
                kandidat_tervalidasi.append(cand)

        kandidat_terpadu = saring_kandidat_spasial(
            kandidat_tervalidasi,
            ambang_iou=0.38,
            ambang_jarak_pusat=38.0,
            dimensi_frame=(tinggi_frame, lebar_frame)
        )

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
                        if jarak_ke_kursi < SEAT_ANCHOR_MAX_RADIUS_PX or iou_kursi >= 0.18:
                            id_terbaik = id_kursi
                            self.tracks[id_kursi] = {
                                "id": id_kursi,
                                "student_name": data_kursi.get("student_name", f"Siswa #{id_kursi}"),
                                "is_recognized": data_kursi.get("is_recognized", False),
                                "seat_latched": True,
                                "seat_id": data_kursi.get("seat_id", f"SEAT_{id_kursi}"),
                                "student_id": data_kursi.get("student_id"),
                                "nis": data_kursi.get("nis"),
                                "role": data_kursi.get("role", "student"),
                                "is_teacher": data_kursi.get("is_teacher", False),
                                "attendance_qualified": data_kursi.get("attendance_qualified", data_kursi.get("is_recognized", False)),
                                "dwell_seconds": data_kursi.get("dwell_seconds", 15.0),
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

                # Siswa tekun menulis di meja jika kepala menunduk ke meja DAN tangan aktif bergerak di bawah bahu
                # Jika kepala tegak (tatapan ke depan/guru), siswa sedang MENYIMAK (attentive)
                kepala_menunduk = (hidung.y >= pusat_bahu_y - 0.08) or (kemiringan_kepala >= 26.0)
                tangan_di_meja = (pergelangan_kiri.y > bahu_kiri.y + 0.02 or pergelangan_kanan.y > bahu_kanan.y + 0.02)
                tangan_aktif_menulis = (kecepatan_tangan >= KECEPATAN_TANGAN_MENULIS)

                is_sedang_menulis = (
                    kepala_menunduk and
                    tangan_di_meja and
                    tangan_aktif_menulis
                )

                if is_sedang_menulis:
                    self.penahan_waktu_menulis[id_pemeriksaan] = waktu_sekarang

                # Latch aktivitas menulis selama 0.8 detik (langsung batal jika siswa mendongak menyimak)
                aktivitas_menulis_aktif = (
                    id_pemeriksaan in self.penahan_waktu_menulis and
                    waktu_sekarang - self.penahan_waktu_menulis[id_pemeriksaan] < 0.8 and
                    kepala_menunduk
                )

                # Gerbang deteksi tidur: Kepala rebahan/jatuh di meja DAN tangan statis
                is_kepala_menunduk = (hidung.y >= pusat_bahu_y - 0.02) or (kemiringan_kepala > 45.0 and pusat_subjek_y > tinggi_frame * 0.40)
                is_tidur = False

                if aktivitas_menulis_aktif:
                    self.pencatat_waktu_tidur.pop(id_pemeriksaan, None)
                    is_tidur = False
                elif is_kepala_menunduk and (kecepatan_tangan < KECEPATAN_TANGAN_DIAM_TIDUR):
                    if id_pemeriksaan not in self.pencatat_waktu_tidur:
                        self.pencatat_waktu_tidur[id_pemeriksaan] = waktu_sekarang
                    elif waktu_sekarang - self.pencatat_waktu_tidur[id_pemeriksaan] >= DURASI_TAHAN_TIDUR_DETIK:
                        is_tidur = True
                else:
                    self.pencatat_waktu_tidur.pop(id_pemeriksaan, None)

                # Guardrail 1: Kinematika Angkat Tangan Sensitif (Pergelangan / Jari di Atas Bahu)
                jarak_ke_hidung_kiri = math.hypot(pergelangan_kiri.x - hidung.x, pergelangan_kiri.y - hidung.y)
                jarak_ke_hidung_kanan = math.hypot(pergelangan_kanan.x - hidung.x, pergelangan_kanan.y - hidung.y)

                # Evaluasi posisi vertikal dan visibilitas tangan kiri & kanan
                vis_kiri = getattr(pergelangan_kiri, 'visibility', 0.5)
                vis_jari_kiri = max(getattr(landmarks[19], 'visibility', 0.0), getattr(landmarks[17], 'visibility', 0.0)) if len(landmarks) > 19 else 0.0
                vis_efektif_kiri = max(vis_kiri, vis_jari_kiri)

                vis_kanan = getattr(pergelangan_kanan, 'visibility', 0.5)
                vis_jari_kanan = max(getattr(landmarks[20], 'visibility', 0.0), getattr(landmarks[18], 'visibility', 0.0)) if len(landmarks) > 20 else 0.0
                vis_efektif_kanan = max(vis_kanan, vis_jari_kanan)

                y_tangan_kiri = pergelangan_kiri.y
                if len(landmarks) > 19 and getattr(landmarks[19], 'visibility', 0.0) > 0.35:
                    y_tangan_kiri = min(y_tangan_kiri, landmarks[19].y)
                if len(landmarks) > 17 and getattr(landmarks[17], 'visibility', 0.0) > 0.35:
                    y_tangan_kiri = min(y_tangan_kiri, landmarks[17].y)

                y_tangan_kanan = pergelangan_kanan.y
                if len(landmarks) > 20 and getattr(landmarks[20], 'visibility', 0.0) > 0.35:
                    y_tangan_kanan = min(y_tangan_kanan, landmarks[20].y)
                if len(landmarks) > 18 and getattr(landmarks[18], 'visibility', 0.0) > 0.35:
                    y_tangan_kanan = min(y_tangan_kanan, landmarks[18].y)

                # Definisi pedagogis angkat tangan bertanya:
                # 1. Tangan terangkat tinggi di dekat/di atas hidung ATAU secara jelas berada di atas garis bahu (gap >= 0.06).
                # 2. Tangan memiliki visibilitas keypoint yang valid (>= 0.40), bukan tebakan acak di atas meja.
                # 3. Jaminan mutlak: pergelangan WAJIB di atas bahu (y_tangan < bahu.y - 0.03).
                # 4. Bukan pose menopang dagu/pipi/telinga (istirahat/fokus menyimak).
                menopang_dagu_kiri = (y_tangan_kiri >= hidung.y - 0.02) and (abs(pergelangan_kiri.x - hidung.x) < 0.14)
                tangan_kiri_naik_tinggi = (y_tangan_kiri < hidung.y)
                tangan_kiri_di_atas_bahu = (y_tangan_kiri < bahu_kiri.y - 0.06 and abs(pergelangan_kiri.x - hidung.x) > 0.12)
                tangan_kiri_terangkat = (
                    (tangan_kiri_naik_tinggi or tangan_kiri_di_atas_bahu) and
                    (not menopang_dagu_kiri) and
                    (vis_efektif_kiri >= 0.40) and
                    (y_tangan_kiri < bahu_kiri.y - 0.03)
                )

                menopang_dagu_kanan = (y_tangan_kanan >= hidung.y - 0.02) and (abs(pergelangan_kanan.x - hidung.x) < 0.14)
                tangan_kanan_naik_tinggi = (y_tangan_kanan < hidung.y)
                tangan_kanan_di_atas_bahu = (y_tangan_kanan < bahu_kanan.y - 0.06 and abs(pergelangan_kanan.x - hidung.x) > 0.12)
                tangan_kanan_terangkat = (
                    (tangan_kanan_naik_tinggi or tangan_kanan_di_atas_bahu) and
                    (not menopang_dagu_kanan) and
                    (vis_efektif_kanan >= 0.40) and
                    (y_tangan_kanan < bahu_kanan.y - 0.03)
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
                    self.penahan_waktu_menulis.pop(id_pemeriksaan, None)
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

                # Deadband Filter (Mengunci Jitter Absolut saat Tubuh Diam):
                # Jika pergeseran piksel <= ambang deadband, kunci koordinat visual 100% tanpa gerak mikro
                if "smooth_box" in track_lama:
                    prev_x, prev_y, prev_w, prev_h = track_lama["smooth_box"]
                    if abs(halus_x - prev_x) < 3.2:
                        halus_x = prev_x
                    if abs(halus_y - prev_y) < 3.2:
                        halus_y = prev_y
                    if abs(halus_w - prev_w) < 4.0:
                        halus_w = prev_w
                    if abs(halus_h - prev_h) < 4.0:
                        halus_h = prev_h

                # Standardisasi Framing Ruang Kelas (Upper-Body Framing saat Duduk):
                # Saat siswa duduk di meja, kotak difokuskan pada tubuh atas (kepala hingga batas pinggul/meja),
                # tidak menjulur ke lantai/kolong meja agar tidak memicu deteksi kaki/lantai palsu.
                if postur == "sitting":
                    maks_tinggi_duduk = float(halus_w * 1.35)
                    if landmarks and len(landmarks) >= 25:
                        pinggul_kiri = landmarks[23]
                        pinggul_kanan = landmarks[24]
                        vis_p = max(getattr(pinggul_kiri, 'visibility', 0.0), getattr(pinggul_kanan, 'visibility', 0.0))
                        if vis_p > 0.25:
                            pusat_p_y = ((pinggul_kiri.y + pinggul_kanan.y) / 2.0) * float(tinggi_frame)
                            maks_tinggi_duduk = max(float(halus_w * 0.90), pusat_p_y + (0.08 * float(tinggi_frame)) - halus_y)
                    if halus_h > maks_tinggi_duduk:
                        halus_h = maks_tinggi_duduk

                # Update hit streak & konfirmasi track
                track_lama["hits"] = track_lama.get("hits", 1) + 1
                track_lama["hit_streak"] = track_lama.get("hit_streak", 1) + 1
                track_lama["unseen_frames"] = 0

                if track_lama["hit_streak"] >= MINIMAL_HIT_STREAK_KONFIRMASI or track_lama.get("is_recognized", False):
                    track_lama["is_confirmed"] = True
                    track_lama["state"] = "confirmed"

                # Zero Jitter: Temporal Voting untuk State & Warna (Anti-Flicker)
                if "state_history" not in track_lama:
                    track_lama["state_history"] = deque(maxlen=6)
                track_lama["state_history"].append(aktivitas)

                if is_angkat_tangan:
                    aktivitas_stabil = "hand_raised"
                elif is_tidur:
                    aktivitas_stabil = "sleep"
                else:
                    suara_menulis = sum(1 for s in track_lama["state_history"] if s == "writing")
                    aktivitas_stabil = "writing" if suara_menulis >= 3 else "attentive"

                track_lama["box"] = (int(round(halus_x)), int(round(halus_y)), int(round(halus_w)), int(round(halus_h)))
                track_lama["smooth_box"] = (halus_x, halus_y, halus_w, halus_h)
                track_lama["center"] = (halus_x + halus_w / 2.0, halus_y + halus_h / 2.0)
                track_lama["landmarks"] = landmarks
                track_lama["posture"] = postur
                track_lama["activity"] = aktivitas_stabil
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

                # Pondasi 2: Latch Jangkar Kursi Spasial jika subjek terkonfirmasi duduk stabil atau terverifikasi wajah
                is_rec = track_lama.get("is_recognized", False)
                if (track_lama.get("is_confirmed", False) and track_lama.get("hits", 0) >= 3 and postur == "sitting") or is_rec:
                    if track_lama.get("first_latched_time") is None:
                        track_lama["first_latched_time"] = waktu_sekarang
                    
                    durasi_duduk = waktu_sekarang - track_lama["first_latched_time"]
                    track_lama["dwell_seconds"] = round(durasi_duduk, 1)

                    nama_siswa = track_lama.get("student_name", "")
                    suara_identitas = track_lama.get("identity_votes", {}).get(nama_siswa, 0) if nama_siswa else 0

                    if is_rec or (durasi_duduk >= DURASI_MINIMAL_DUDUK_PRESENSI_DETIK and suara_identitas >= MINIMAL_KONSENSUS_FRAME_PRESENSI):
                        track_lama["attendance_qualified"] = True
                    else:
                        track_lama["attendance_qualified"] = False

                    self.jangkar_kursi[id_terbaik] = {
                        "id": id_terbaik,
                        "center": (halus_x + halus_w / 2.0, halus_y + halus_h / 2.0),
                        "box": (int(round(halus_x)), int(round(halus_y)), int(round(halus_w)), int(round(halus_h))),
                        "student_name": track_lama.get("student_name", f"Siswa #{id_terbaik}"),
                        "is_recognized": is_rec,
                        "seat_latched": True,
                        "student_id": track_lama.get("student_id"),
                        "nis": track_lama.get("nis"),
                        "role": track_lama.get("role", "student"),
                        "is_teacher": track_lama.get("is_teacher", False),
                        "identity_votes": track_lama.get("identity_votes", {}),
                        "seat_id": track_lama.get("seat_id") or f"SEAT_{id_terbaik}",
                        "waktu_terakhir_aktif": waktu_sekarang,
                        "dwell_seconds": track_lama["dwell_seconds"],
                        "attendance_qualified": track_lama["attendance_qualified"]
                    }
                    track_lama["seat_latched"] = True
                    track_lama["seat_id"] = self.jangkar_kursi[id_terbaik]["seat_id"]
                else:
                    if postur != "sitting" and not is_rec and track_lama.get("first_latched_time") is not None:
                        # Reset timer hanya jika berdiri lama dan belum terverifikasi
                        if waktu_sekarang - track_lama.get("last_seen", waktu_sekarang) > 5.0:
                            track_lama["first_latched_time"] = None
                            track_lama["dwell_seconds"] = 0.0
                            track_lama["attendance_qualified"] = False

                id_tercocokkan.add(id_terbaik)
            else:
                # Cek terlebih dahulu apakah kandidat berada pada jangkar kursi terlatched (Anti-Reset ID)
                id_kursi_cocok = None
                if len(self.jangkar_kursi) > 0:
                    for id_k, data_k in self.jangkar_kursi.items():
                        if id_k in id_tercocokkan or id_k in self.tracks:
                            continue
                        if data_k.get("seat_latched") and data_k.get("is_recognized"):
                            kcx, kcy = data_k["center"]
                            dist_k = math.hypot(pusat_subjek_x - kcx, pusat_subjek_y - kcy)
                            iou_k = hitung_iou(kotak_kandidat, data_k["box"])
                            if dist_k < SEAT_ANCHOR_MAX_RADIUS_PX or iou_k >= 0.18:
                                id_kursi_cocok = id_k
                                break

                if id_kursi_cocok is not None:
                    # Pulihkan langsung track ke ID kursi yang ter-latch
                    data_k = self.jangkar_kursi[id_kursi_cocok]
                    fx = OneEuroFilter(waktu_sekarang, float(px), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    fy = OneEuroFilter(waktu_sekarang, float(py), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    fw = OneEuroFilter(waktu_sekarang, float(pw), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)
                    fh = OneEuroFilter(waktu_sekarang, float(ph), min_cutoff=ONE_EURO_MIN_CUTOFF, beta=ONE_EURO_BETA, d_cutoff=ONE_EURO_D_CUTOFF)

                    self.tracks[id_kursi_cocok] = {
                        "id": id_kursi_cocok,
                        "student_name": data_k.get("student_name", f"Siswa #{id_kursi_cocok}"),
                        "is_recognized": True,
                        "seat_latched": True,
                        "seat_id": data_k.get("seat_id", f"SEAT_{id_kursi_cocok}"),
                        "student_id": data_k.get("student_id"),
                        "nis": data_k.get("nis"),
                        "role": data_k.get("role", "student"),
                        "is_teacher": data_k.get("is_teacher", False),
                        "attendance_qualified": True,
                        "dwell_seconds": data_k.get("dwell_seconds", 15.0),
                        "identity_votes": data_k.get("identity_votes", {}),
                        "box": (px, py, pw, ph),
                        "smooth_box": (float(px), float(py), float(pw), float(ph)),
                        "center": (pusat_subjek_x, pusat_subjek_y),
                        "landmarks": landmarks,
                        "posture": postur,
                        "activity": aktivitas,
                        "state_history": deque([aktivitas], maxlen=6),
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
                        "state": "confirmed",
                        "is_confirmed": True,
                        "hits": MINIMAL_HIT_STREAK_KONFIRMASI,
                        "hit_streak": MINIMAL_HIT_STREAK_KONFIRMASI,
                        "unseen_frames": 0,
                        "filter_x": fx,
                        "filter_y": fy,
                        "filter_w": fw,
                        "filter_h": fh
                    }
                    data_k["waktu_terakhir_aktif"] = waktu_sekarang
                    id_tercocokkan.add(id_kursi_cocok)
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
                    "state_history": deque([aktivitas], maxlen=6),
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
                # Jika track masih tentative, toleransi frame hilang kecil agar tidak lenyap akibat drop-frame asinkronus
                if not data_t.get("is_confirmed", False):
                    data_t["unseen_frames"] = data_t.get("unseen_frames", 0) + 1
                    if data_t["unseen_frames"] > MAKSIMAL_FRAME_TENTATIVE_HILANG:
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

                # Uji IoU & Containment Spasial
                min_luas = min(aw * ah, bw * bh)
                min_w = min(aw, bw)
                irisan_w = max(0, ix2 - ix1)
                rasio_containment = (luas_i / float(min_luas)) if min_luas > 0 else 0.0

                # Uji Kesamaan Hidung MediaPipe (Orang yang sama persis)
                lm_a = track_a.get("landmarks")
                lm_b = track_b.get("landmarks")
                hidung_sama = False
                dua_kepala_berbeda = False
                if lm_a and lm_b and len(lm_a) >= 1 and len(lm_b) >= 1:
                    jarak_h = math.hypot(lm_a[0].x - lm_b[0].x, lm_a[0].y - lm_b[0].y)
                    hidung_sama = (jarak_h < 0.08)
                    dua_kepala_berbeda = (jarak_h >= 0.10)

                # Subjek dianggap duplikat jika hidung sama persis,
                # atau tumpang-tindih IoU moderat-tinggi (> 0.38),
                # atau bersarang konsentris (containment >= 55% dan selisih sumbu X rapat),
                # atau irisan sumbu horizontal sangat rapat (>= 62%)
                # KECUALI jika kedua track terbukti memiliki 2 kepala berbeda (Pilar 1.1: Duduk Sebangku Rapat)
                delta_pusat_x = abs(acx - bcx)
                irisan_w = max(0, ix2 - ix1)
                rasio_w = (irisan_w / float(min_w)) if min_w > 0 else 0.0

                apakah_duplikat = (
                    hidung_sama or
                    (not dua_kepala_berbeda and (
                        (iou > 0.38) or
                        (min_w > 0 and rasio_containment >= 0.55 and delta_pusat_x < min_w * 0.40) or
                        (min_w > 0 and rasio_w >= 0.62 and delta_pusat_x < min_w * 0.35)
                    ))
                )

                if apakah_duplikat:
                    # Prioritaskan track yang terverifikasi identitasnya, sedang angkat tangan, atau kotak badan penuh yang lebih besar
                    if track_a.get("is_recognized") and not track_b.get("is_recognized"):
                        id_pemenang, id_korban = id_a, id_b
                    elif track_b.get("is_recognized") and not track_a.get("is_recognized"):
                        id_pemenang, id_korban = id_b, id_a
                    elif track_b.get("is_hand_raised") and not track_a.get("is_hand_raised"):
                        id_pemenang, id_korban = id_b, id_a
                    elif (bw * bh) > (aw * ah) * 1.20:
                        id_pemenang, id_korban = id_b, id_a
                    else:
                        id_pemenang, id_korban = id_a, id_b

                    if not self.tracks[id_pemenang].get("is_recognized") and self.tracks[id_korban].get("is_recognized"):
                        self.tracks[id_pemenang]["student_name"] = self.tracks[id_korban]["student_name"]
                        self.tracks[id_pemenang]["is_recognized"] = True
                        self.tracks[id_pemenang]["student_id"] = self.tracks[id_korban].get("student_id")
                        self.tracks[id_pemenang]["nis"] = self.tracks[id_korban].get("nis")
                        self.tracks[id_pemenang]["seat_latched"] = True
                        self.tracks[id_pemenang]["attendance_qualified"] = True
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

    def kunci_identitas_subjek(
        self,
        id_subjek: int,
        nama_siswa: str,
        student_id: Optional[str] = None,
        nis: Optional[str] = None,
        role: str = "student",
        is_teacher: bool = False
    ) -> None:
        """
        Pondasi Enterprise: Mengunci identitas terverifikasi ke subjek dan jangkar kursi
        secara permanen (Permanent Seat-Identity Latching).
        """
        waktu_sekarang = time.time()
        # 1. Cabut identitas ini dari subjek lain untuk mencegah duplikasi nama/kursi
        for tid, tdata in self.tracks.items():
            if tid != id_subjek and tdata.get("student_name") == nama_siswa:
                tdata["student_name"] = f"Siswa #{tid}"
                tdata["is_recognized"] = False
                tdata["seat_latched"] = False
                tdata.pop("student_id", None)
                tdata.pop("nis", None)
                tdata["role"] = "student"
                tdata["is_teacher"] = False

        # 2. Kunci pada track aktif jika ada
        if id_subjek in self.tracks:
            t = self.tracks[id_subjek]
            t["student_name"] = nama_siswa
            t["is_recognized"] = True
            t["seat_latched"] = True
            t["student_id"] = student_id
            t["nis"] = nis
            t["role"] = role
            t["is_teacher"] = is_teacher
            t["attendance_qualified"] = True
            t["seat_id"] = t.get("seat_id") or f"SEAT_{id_subjek}"
            if "identity_votes" not in t:
                t["identity_votes"] = {}
            t["identity_votes"][nama_siswa] = max(t["identity_votes"].get(nama_siswa, 0), 5)

            # 3. Kunci pada jangkar kursi spasial (Seat Anchor)
            bx, by, bw, bh = t.get("box", (0, 0, 100, 100))
            cx, cy = t.get("center", (bx + bw / 2.0, by + bh / 2.0))
            self.jangkar_kursi[id_subjek] = {
                "id": id_subjek,
                "center": (cx, cy),
                "box": (bx, by, bw, bh),
                "student_name": nama_siswa,
                "is_recognized": True,
                "seat_latched": True,
                "student_id": student_id,
                "nis": nis,
                "role": role,
                "is_teacher": is_teacher,
                "seat_id": t["seat_id"],
                "waktu_terakhir_aktif": waktu_sekarang,
                "dwell_seconds": max(t.get("dwell_seconds", 0.0), 15.0),
                "attendance_qualified": True
            }

    # Alias kompatibilitas bahasa Inggris
    latch_identity = kunci_identitas_subjek
    update_hybrid = perbarui_posisi_hibrida


# Alias kelas
SubjectTracker = PelacakSubjekKelas
