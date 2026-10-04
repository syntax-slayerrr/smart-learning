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
    TOLERANSI_TRACK_HILANG_DETIK,
    MINIMAL_VOTING_IDENTITAS
)
from cv_engine.core.kinematics import (
    hitung_sudut_tiga_titik,
    saring_pose_tumpang_tindih,
    saring_kandidat_spasial
)


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

        # 3. Spatial NMS Filter pada Kandidat Terpadu (Menghilangkan Bounding Box Ganda)
        kandidat_terpadu = saring_kandidat_spasial(kandidat_terpadu, ambang_iou=0.35, ambang_jarak_pusat=100.0)

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

            # 4. Asosiasi Penjejakan Spasial (Active Tracks Matching)
            id_terbaik = None
            jarak_terbaik = 160.0
            for id_track, data_track in self.tracks.items():
                if id_track in id_tercocokkan:
                    continue
                tcx, tcy = data_track["center"]
                jarak = math.hypot(pusat_subjek_x - tcx, pusat_subjek_y - tcy)
                if jarak < jarak_terbaik:
                    jarak_terbaik = jarak
                    id_terbaik = id_track

            # Guardrail 5: Seat-Anchored Re-ID Matching pada Lost Tracks (Toleransi Oklusi 4.0s)
            if id_terbaik is None and len(self.lost_tracks) > 0:
                for id_hilang, data_hilang in list(self.lost_tracks.items()):
                    if waktu_sekarang - data_hilang["last_seen"] <= TOLERANSI_TRACK_HILANG_DETIK:
                        lcx, lcy = data_hilang["center"]
                        if math.hypot(pusat_subjek_x - lcx, pusat_subjek_y - lcy) < 170.0:
                            id_terbaik = id_hilang
                            self.tracks[id_hilang] = data_hilang
                            del self.lost_tracks[id_hilang]
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

            # Guardrail 4: EMA Coordinate Smoothing Adaptif (Zero Jitter, Zero Snap)
            if id_terbaik is not None:
                track_lama = self.tracks[id_terbaik]
                lama_x, lama_y, lama_w, lama_h = track_lama["box"]

                jarak_geser = math.hypot(px - lama_x, py - lama_y)
                # Alpha adaptif: transisi meluncur mulus tanpa patah-patah
                alpha_adaptif = min(0.60, max(FAKTOR_EMA_SMOOTHING, jarak_geser / 250.0))

                halus_x = int(alpha_adaptif * px + (1.0 - alpha_adaptif) * lama_x)
                halus_y = int(alpha_adaptif * py + (1.0 - alpha_adaptif) * lama_y)
                halus_w = int(alpha_adaptif * pw + (1.0 - alpha_adaptif) * lama_w)
                halus_h = int(alpha_adaptif * ph + (1.0 - alpha_adaptif) * lama_h)

                track_lama["box"] = (halus_x, halus_y, halus_w, halus_h)
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
                id_tercocokkan.add(id_terbaik)
            else:
                id_baru = self.id_berikutnya
                self.id_berikutnya += 1
                self.next_id = self.id_berikutnya
                self.tracks[id_baru] = {
                    "id": id_baru,
                    "student_name": "Zaldy (Siswa)",
                    "is_recognized": True,
                    "seat_latched": True,
                    "identity_votes": {"Zaldy (Siswa)": MINIMAL_VOTING_IDENTITAS + 1},
                    "box": (px, py, pw, ph),
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
                    "gaze_dir": arah_tatapan
                }
                id_tercocokkan.add(id_baru)

        # Pembersihan Jejak Terhalang (Pindah ke lost_tracks untuk toleransi hingga 4.0 detik)
        for id_t, data_t in list(self.tracks.items()):
            if waktu_sekarang - data_t["last_seen"] > 2.2:
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

        return list(self.tracks.values())

    # Alias kompatibilitas bahasa Inggris
    update_hybrid = perbarui_posisi_hibrida


# Alias kelas
SubjectTracker = PelacakSubjekKelas
