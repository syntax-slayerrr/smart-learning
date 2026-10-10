"""
AI Classroom Intelligence — Saluran Pipa Utama (Master Pipeline Orchestrator)
=============================================================================
Syntax Slayer — Smart Learning Platform
Menghubungkan Core AI Vision (Dev 1), Telemetri & Kontrak (Dev 2), dan Server Streaming (Dev 3).

Alur Algoritma Pipeline Spasio-Temporal:
1. Penangkapan Bingkai Kamera Multi-Sumber (ThreadedCamera)
2. Inferensi Asinkronus Paralel (YOLO26n + MediaPipe Heavy 3D + ArcFace 512-d)
3. Fusi Pelacakan Spasio-Temporal & 5 Enterprise Guardrails (PelacakSubjekKelas)
4. Rasterisasi Antarmuka HUD & Kerangka Anatomi Neon (Streaming HUD)
5. Distribusi Video MJPEG Multi-Klien 45 FPS (ThreadingHTTPServer)
6. Pengiriman Asinkronus Telemetri JSON ke Next.js & Supabase Cloud (Bounded Queue)
"""

from datetime import datetime, timezone
import math
import threading
import time
from typing import Optional, Dict, Any, List
import cv2
import numpy as np

from cv_engine.config import (
    KonfigurasiEngine,
    EngineConfig,
    WARNA_MERAH,
    WARNA_AMBER,
    WARNA_LANGIT_SKY,
    WARNA_BIRU,
    WARNA_EMERALD,
    MINIMAL_VOTING_IDENTITAS
)
from cv_engine.core import (
    DetektorYOLO26,
    DetektorPoseMediaPipe,
    SaluranPipaDeteksiWajah,
    PelacakSubjekKelas
)
from cv_engine.telemetry import (
    ManajerGaleriWajah,
    PengirimTelemetriAsinkron,
    MuatanTelemetri
)
from cv_engine.streaming import (
    KameraUtasTerpisah,
    terapkan_orientasi,
    gambar_kerangka_neon,
    gambar_kotak_cerdas,
    gambar_banner_hud
)
from cv_engine.server import (
    StatusServerStreaming,
    jalankan_server_mjpeg
)


def jalankan_saluran_pipa_cv(konfigurasi: KonfigurasiEngine) -> None:
    """
    Fungsi orkestrasi utama yang menjalankan loop pemrosesan video berkecepatan tinggi.
    """
    print(f"[*] Menginisialisasi AI Classroom Intelligence Engine (SYNTAX SLAYER)...")
    print(f"[*] Konfigurasi: Sumber={konfigurasi.source}, Port={konfigurasi.port}, Interval={konfigurasi.interval}s, Rotasi={konfigurasi.rotate}")

    # ==========================================================================
    # 1. Inisialisasi Subsistem Core AI & Vision (Developer 1)
    # ==========================================================================
    detektor_yolo = DetektorYOLO26()
    detektor_pose = DetektorPoseMediaPipe()
    saluran_wajah = SaluranPipaDeteksiWajah()
    pelacak_subjek = PelacakSubjekKelas()

    # ==========================================================================
    # 2. Inisialisasi Subsistem Telemetri & Galeri Wajah (Developer 2)
    # ==========================================================================
    manajer_galeri = ManajerGaleriWajah()
    pengirim_telemetri = PengirimTelemetriAsinkron(
        url_primer=konfigurasi.api_url,
        url_cloud=konfigurasi.cloud_url,
        kunci_perangkat=konfigurasi.device_key
    ).mulai()

    # ==========================================================================
    # 3. Inisialisasi Subsistem Kamera, Streaming & Server (Developer 3)
    # ==========================================================================
    status_server = StatusServerStreaming(
        manajer_galeri=manajer_galeri,
        fungsi_status_sinkronisasi=pengirim_telemetri.ambil_status_sinkronisasi
    )
    status_server.atur_orientasi(rotasi=konfigurasi.rotate, cermin_h=konfigurasi.flip_h)

    server_http = jalankan_server_mjpeg(konfigurasi.port, status_server)
    kamera_aliran = KameraUtasTerpisah(sumber=konfigurasi.source, fps_target=konfigurasi.target_fps).mulai()
    status_server.tautkan_kamera(kamera_aliran)

    # ==========================================================================
    # 4. Utas Pekerja Inferensi Asinkronus (Decoupled Multi-Threaded Inference)
    # Menghindari penurunan frame rate kamera saat model deep learning berjalan
    # ==========================================================================
    # 1. Pekerja Inferensi Spasial Asinkron (YOLO + MediaPipe Pose) - Frekuensi Tinggi (30 FPS)
    kunci_pose_bersama = threading.Lock()
    daftar_landmark_terkini: List[Any] = []
    daftar_kotak_yolo_terkini: List[Any] = []
    latensi_inferensi_ms: float = 25.0
    status_pekerja_aktif: bool = True
    bingkai_siap_inferensi: Optional[np.ndarray] = None
    sinyal_inferensi = threading.Event()
    inferensi_sedang_berjalan: bool = False

    def lingkaran_kerja_inferensi_ai():
        nonlocal daftar_landmark_terkini, daftar_kotak_yolo_terkini, latensi_inferensi_ms, bingkai_siap_inferensi, inferensi_sedang_berjalan
        while status_pekerja_aktif:
            sinyal_inferensi.wait(timeout=0.1)
            sinyal_inferensi.clear()

            with kunci_pose_bersama:
                frame_ai = None if bingkai_siap_inferensi is None else bingkai_siap_inferensi.copy()

            if frame_ai is None:
                inferensi_sedang_berjalan = False
                continue

            waktu_mulai = time.perf_counter()
            try:
                # 1. Deteksi Spasial Makro YOLO26n (NMS-Free Head)
                kotak_yolo = []
                if detektor_yolo.apakah_siap():
                    kotak_yolo = detektor_yolo.deteksi_subjek_manusia(
                        frame_ai,
                        ambang_keyakinan=konfigurasi.yolo_conf_thresh,
                        dimensi_input=konfigurasi.yolo_imgsz
                    )

                # 2. Estimasi Sendi Mikro Anatomi MediaPipe Heavy (33 Points 3D)
                pose_mediapipe = []
                if detektor_pose.apakah_siap():
                    pose_mediapipe = detektor_pose.deteksi_kerangka_anatomi(frame_ai, lebar_inferensi_target=540)

                # 3. Ekspansi Spasial Wajah YuNet -> Kotak Tubuh Siswa (Zero-Drop untuk Siswa Samping / Berhijab)
                # Siswa yang duduk menyamping, menopang dagu, atau berhijab seringkali tidak memicu deteksi pose tubuh penuh,
                # namun wajahnya selalu terdeteksi 100% oleh YuNet. Kita proyeksikan kotak tubuh dari koordinat wajah.
                if saluran_wajah.detektor_yunet is not None:
                    h_frame, w_frame = frame_ai.shape[:2]
                    wajah_terdeteksi = saluran_wajah.deteksi_kotak_wajah_saja(frame_ai, lebar_inferensi=480)
                    for (fx, fy, fw, fh, f_conf) in wajah_terdeteksi:
                        pusat_wajah_x = fx + fw / 2.0
                        pusat_wajah_y = fy + fh / 2.0

                        # Periksa apakah wajah ini sudah dicakup oleh salah satu pose MediaPipe
                        sudah_ada_pose = False
                        for p in pose_mediapipe:
                            if len(p) >= 1:
                                hx = p[0].x * w_frame
                                hy = p[0].y * h_frame
                                if math.hypot(pusat_wajah_x - hx, pusat_wajah_y - hy) < max(fw * 0.85, 24.0):
                                    sudah_ada_pose = True
                                    break

                        # Periksa juga apakah wajah ini sudah berada di dalam kotak makro YOLO yang sudah terdeteksi
                        sudah_ada_yolo = False
                        if not sudah_ada_pose and len(kotak_yolo) > 0:
                            for (yx, yy, yw, yh, _) in kotak_yolo:
                                if (yx - 15 <= pusat_wajah_x <= yx + yw + 15) and (yy - 15 <= pusat_wajah_y <= yy + yh * 0.75):
                                    sudah_ada_yolo = True
                                    break

                        # Jika belum dicakup pose MediaPipe maupun kotak YOLO mana pun, buat proyeksi kotak tubuh siswa
                        if not sudah_ada_pose and not sudah_ada_yolo:
                            lebar_tubuh = int(fw * 2.2)
                            tinggi_tubuh = int(fh * 3.4)
                            bx = max(0, int(pusat_wajah_x - lebar_tubuh / 2.0))
                            by = max(0, int(fy - fh * 0.15))
                            bw = min(w_frame - bx, lebar_tubuh)
                            bh = min(h_frame - by, tinggi_tubuh)
                            if bw >= 20 and bh >= 30:
                                kotak_yolo.append((bx, by, bw, bh, max(0.92, float(f_conf))))

                waktu_durasi_ms = (time.perf_counter() - waktu_mulai) * 1000.0

                with kunci_pose_bersama:
                    daftar_kotak_yolo_terkini = kotak_yolo
                    daftar_landmark_terkini = pose_mediapipe
                    latensi_inferensi_ms = waktu_durasi_ms
            except Exception:
                pass
            finally:
                inferensi_sedang_berjalan = False

    utas_inferensi = threading.Thread(target=lingkaran_kerja_inferensi_ai, daemon=True)
    utas_inferensi.start()

    # 2. Pekerja Inferensi Biometrik Asinkron (ArcFace Multi-Rate Pipeline)
    # Berjalan pada frekuensi terpisah (1x per 2.0s per siswa) dan otomatis tidur jika semua kursi telah terkunci
    kunci_biometrik_bersama = threading.Lock()
    bingkai_siap_biometrik: Optional[np.ndarray] = None
    sinyal_biometrik = threading.Event()
    hasil_biometrik_terkini: List[Dict[str, Any]] = []
    apakah_perlu_pemindaian_biometrik: bool = True

    def lingkaran_kerja_inferensi_biometrik():
        nonlocal hasil_biometrik_terkini, bingkai_siap_biometrik
        waktu_scan_terakhir = 0.0

        while status_pekerja_aktif:
            sinyal_biometrik.wait(timeout=0.25)
            sinyal_biometrik.clear()

            waktu_saat_ini = time.time()
            ada_pemicu_daftar = manajer_galeri.peristiwa_pemicu.is_set()

            # Throttle frekuensi: cukup jalan per interval (default 2s), kecuali dipicu tombol UI web
            if not ada_pemicu_daftar and (waktu_saat_ini - waktu_scan_terakhir < konfigurasi.face_interval_sec):
                continue

            with kunci_biometrik_bersama:
                frame_wajah = None if bingkai_siap_biometrik is None else bingkai_siap_biometrik.copy()
                perlu_scan = apakah_perlu_pemindaian_biometrik

            if frame_wajah is None or (not perlu_scan and not ada_pemicu_daftar):
                continue

            try:
                if saluran_wajah.apakah_siap():
                    hasil_wajah = saluran_wajah.deteksi_dan_ekstraksi_wajah(frame_wajah, lebar_inferensi=400)
                    daftar_cocok = []

                    # 1. Pendaftaran Profil Wajah Baru (Pilih Wajah Terbesar / Paling Fokus di Kamera)
                    if manajer_galeri.peristiwa_pemicu.is_set() and len(hasil_wajah) > 0:
                        nama_siswa = manajer_galeri.ambil_nama_tertunda() or "Zaldy (Siswa)"
                        wajah_terpilih = max(hasil_wajah, key=lambda hw: hw[0][2] * hw[0][3])
                        manajer_galeri.daftarkan_wajah(nama_siswa, wajah_terpilih[1])
                        manajer_galeri.bersihkan_pemicu()

                    # 2. Pencocokan Biometrik Kemiripan Kosinus Terhadap Galeri
                    for (kotak_landmark_5, vektor_fitur) in hasil_wajah:
                        nama_cocok, skor_cocok = manajer_galeri.cari_kemiripan_wajah(
                            vektor_fitur,
                            ambang_batas=konfigurasi.face_sim_thresh
                        )

                        if nama_cocok:
                            meta = manajer_galeri.ambil_metadata_identitas(nama_cocok)
                            daftar_cocok.append({
                                "box": kotak_landmark_5,
                                "name": nama_cocok,
                                "score": skor_cocok,
                                "student_id": meta.get("student_id"),
                                "nis": meta.get("nis"),
                                "role": meta.get("role", "student"),
                            })

                    with kunci_biometrik_bersama:
                        hasil_biometrik_terkini = daftar_cocok
                    waktu_scan_terakhir = waktu_saat_ini
            except Exception:
                pass

    utas_biometrik = threading.Thread(target=lingkaran_kerja_inferensi_biometrik, daemon=True)
    utas_biometrik.start()

    waktu_sebelumnya = time.time()
    waktu_telemetri_terakhir = time.time()
    pencacah_frame = 0

    print(f"[+] Engine Berjalan Sempurna! Siaran Live Stream: http://localhost:{konfigurasi.port}/video_feed")

    try:
        while True:
            berhasil, frame_mentah = kamera_aliran.baca_bingkai()
            if not berhasil or frame_mentah is None:
                time.sleep(0.005)
                continue

            pencacah_frame += 1
            waktu_sekarang = time.time()
            laju_fps = 1.0 / max(1e-5, (waktu_sekarang - waktu_sebelumnya))
            waktu_sebelumnya = waktu_sekarang

            # Terapkan rotasi spasial frame jika diatur
            setelan_rotasi, setelan_cermin = status_server.ambil_orientasi()
            frame = terapkan_orientasi(frame_mentah, setelan_rotasi, setelan_cermin)
            tinggi_frame, lebar_frame = frame.shape[:2]

            # Kirim frame ke pekerja inferensi asinkronus (Drop frame jika worker sedang sibuk)
            with kunci_pose_bersama:
                if not inferensi_sedang_berjalan:
                    inferensi_sedang_berjalan = True
                    bingkai_siap_inferensi = frame.copy()
                    sinyal_inferensi.set()
                pose_aktif = list(daftar_landmark_terkini)
                kotak_yolo_aktif = list(daftar_kotak_yolo_terkini)
                latensi_saat_ini = latensi_inferensi_ms

            # Penjejakan Hibrida & Penerapan 5 Guardrails Enterprise
            subjek_aktif = pelacak_subjek.perbarui_posisi_hibrida(
                kotak_yolo_aktif,
                pose_aktif,
                frame.shape,
                waktu_sekarang
            )

            # Multi-Rate Biometrik: Kirim sinyal ke pekerja biometrik jika ada siswa belum teridentifikasi / belum terkunci
            ada_siswa_perlu_verifikasi = (
                manajer_galeri.peristiwa_pemicu.is_set() or
                any(not s.get("is_recognized", False) or not s.get("seat_latched", False) for s in subjek_aktif)
            ) if len(subjek_aktif) > 0 else manajer_galeri.peristiwa_pemicu.is_set()

            with kunci_biometrik_bersama:
                apakah_perlu_pemindaian_biometrik = ada_siswa_perlu_verifikasi
                if ada_siswa_perlu_verifikasi:
                    bingkai_siap_biometrik = frame.copy()
                    sinyal_biometrik.set()

                # Ambil hasil pencocokan biometrik non-blocking dari worker
                antrean_wajah_selesai = list(hasil_biometrik_terkini)
                hasil_biometrik_terkini.clear()

            # Terapkan hasil pencocokan biometrik ke subjek yang relevan tanpa lag
            for item_wajah in antrean_wajah_selesai:
                kotak_landmark_5 = item_wajah["box"]
                nama_cocok = item_wajah["name"]
                if len(subjek_aktif) > 0:
                    wajah_pusat_x = kotak_landmark_5[0] + kotak_landmark_5[2] / 2.0
                    wajah_pusat_y = kotak_landmark_5[1] + kotak_landmark_5[3] / 2.0

                    subjek_terdekat = None
                    jarak_terdekat = 350.0
                    for data_siswa in subjek_aktif:
                        sx, sy, sw, sh = data_siswa["box"]
                        # Prioritas 1: Titik pusat wajah berada di dalam atau dekat dengan kotak tubuh siswa
                        if (sx - 35 <= wajah_pusat_x <= sx + sw + 35) and (sy - 35 <= wajah_pusat_y <= sy + sh * 0.85):
                            subjek_terdekat = data_siswa
                            break
                        tcx, tcy = data_siswa["center"]
                        jarak_wajah = math.hypot(wajah_pusat_x - tcx, wajah_pusat_y - tcy)
                        if jarak_wajah < jarak_terdekat:
                            jarak_terdekat = jarak_wajah
                            subjek_terdekat = data_siswa

                    if subjek_terdekat is not None:
                        # Guardrail 3: Buffer Voting Identitas & Penguncian Kursi Permanen (Permanent Seat-Identity Latching)
                        subjek_terdekat.setdefault("identity_votes", {})
                        subjek_terdekat["identity_votes"][nama_cocok] = subjek_terdekat["identity_votes"].get(nama_cocok, 0) + 1
                        
                        skor_kemiripan = float(item_wajah.get("similarity", 0.0))
                        # Kunci permanen jika kemiripan tinggi (>= 0.36) atau voting tercapai (>= MINIMAL_VOTING_IDENTITAS)
                        if skor_kemiripan >= 0.36 or subjek_terdekat["identity_votes"][nama_cocok] >= MINIMAL_VOTING_IDENTITAS:
                            is_guru = item_wajah.get("role") == "teacher" or any(k in nama_cocok.lower() for k in ("guru", "pengajar", "ustadz", "pak ", "bu "))
                            self.pelacak.kunci_identitas_subjek(
                                id_subjek=subjek_terdekat["id"],
                                nama_siswa=nama_cocok,
                                student_id=item_wajah.get("student_id"),
                                nis=item_wajah.get("nis"),
                                role="teacher" if is_guru else item_wajah.get("role", "student"),
                                is_teacher=is_guru
                            )
                            # Sinkronkan nilai ke dict subjek_terdekat di subjek_aktif untuk frame saat ini
                            subjek_terdekat["student_name"] = nama_cocok
                            subjek_terdekat["is_recognized"] = True
                            subjek_terdekat["seat_latched"] = True
                            subjek_terdekat["student_id"] = item_wajah.get("student_id")
                            subjek_terdekat["nis"] = item_wajah.get("nis")
                            subjek_terdekat["role"] = "teacher" if is_guru else item_wajah.get("role", "student")
                            subjek_terdekat["is_teacher"] = is_guru
                            subjek_terdekat["attendance_qualified"] = True

            # Agregasi Ringkasan Statistik Kelas (P3: Memisahkan Guru vs Siswa)
            subjek_siswa = [s for s in subjek_aktif if not s.get("is_teacher", False)]
            ada_guru = any(s.get("is_teacher", False) for s in subjek_aktif)

            statistik_kelas = {
                "total": len(subjek_siswa),
                "sitting": sum(1 for s in subjek_siswa if s["posture"] == "sitting"),
                "standing": sum(1 for s in subjek_siswa if s["posture"] == "standing"),
                "hands_raised": sum(1 for s in subjek_siswa if s["is_hand_raised"]),
                "desk_focused": sum(1 for s in subjek_siswa if s["activity"] in ("attentive", "writing")),
                "sleep_detected": sum(1 for s in subjek_siswa if s["is_sleep"]),
                "active_clusters": 1 if len(subjek_siswa) > 0 else 0,
                "teacher_present": ada_guru,
                "teacher_zone": "zone-podium" if ada_guru else "zone-front"
            }

            rekaman_telemetri = []
            for subjek in subjek_aktif:
                id_subjek = subjek["id"]
                raw_b = subjek.get("smooth_box", subjek["box"])
                bx, by, bw, bh = (int(round(raw_b[0])), int(round(raw_b[1])), int(round(raw_b[2])), int(round(raw_b[3])))
                postur = subjek["posture"]
                aktivitas = subjek["activity"]
                keyakinan = subjek["conf"]
                sub_label = subjek.get("sub_label", "")
                kotak_tangan = subjek.get("hand_box")
                landmarks = subjek.get("landmarks", [])
                nama_siswa = subjek.get("student_name", f"Siswa #{id_subjek}")
                terkenal = subjek.get("is_recognized", False)

                # Kalibrasi Warna Indikator HUD Kontras Tinggi (P3: Label Khusus Guru vs Siswa)
                is_guru = subjek.get("is_teacher", False) or subjek.get("role") == "teacher" or any(k in nama_siswa.lower() for k in ("guru", "pengajar", "ustadz"))
                if is_guru:
                    warna_indikator = (220, 140, 40)   # Deep Amber / Indigo BGR (Guru / Pengajar)
                    tag_aktivitas = "teaching"
                    label_tampilan = "teaching"
                    sub_label_tampilan = f"[GURU] {nama_siswa}" if terkenal else "[GURU] Mengajar"
                elif subjek["is_sleep"]:
                    warna_indikator = (50, 50, 245)    # Crimson Red BGR (Tidur/Distracted)
                    tag_aktivitas = "sleep"
                    label_tampilan = tag_aktivitas
                    sub_label_tampilan = f"[ID] {nama_siswa}" if terkenal else f"Siswa #{id_subjek}"
                elif subjek["is_hand_raised"]:
                    warna_indikator = (0, 210, 255)    # Amber Gold BGR (Angkat Tangan)
                    tag_aktivitas = "hand_raised"
                    label_tampilan = tag_aktivitas
                    sub_label_tampilan = f"[ID] {nama_siswa}" if terkenal else f"Siswa #{id_subjek}"
                elif aktivitas == "writing":
                    warna_indikator = (235, 145, 20)   # Sky Blue / Cyan BGR (Fokus Menulis)
                    tag_aktivitas = "writing"
                    label_tampilan = tag_aktivitas
                    sub_label_tampilan = f"[ID] {nama_siswa}" if terkenal else f"Siswa #{id_subjek}"
                elif postur == "standing":
                    warna_indikator = (200, 80, 160)   # Vivid Purple BGR (Berdiri)
                    tag_aktivitas = "standing"
                    label_tampilan = tag_aktivitas
                    sub_label_tampilan = f"[ID] {nama_siswa}" if terkenal else f"Siswa #{id_subjek}"
                else:
                    warna_indikator = (95, 205, 70)    # Emerald Green BGR (Fokus Menyimak)
                    tag_aktivitas = "attentive"
                    label_tampilan = tag_aktivitas
                    sub_label_tampilan = f"[ID] {nama_siswa}" if terkenal else f"Siswa #{id_subjek}"

                # 1. Gambar Kerangka Anatomi Neon Bercahaya (MediaPipe Heavy 3D)
                if landmarks:
                    gambar_kerangka_neon(
                        frame,
                        landmarks,
                        warna=warna_indikator,
                        tangan_terangkat=subjek["is_hand_raised"] if not is_guru else False,
                        status_tidur=subjek["is_sleep"] if not is_guru else False
                    )

                # 2. Gambar Kotak Pembatas Cerdas (Surveillance Style)
                gambar_kotak_cerdas(
                    frame,
                    bx, by, bw, bh,
                    warna_indikator,
                    label_tampilan,
                    keyakinan,
                    sub_label=sub_label_tampilan,
                    kotak_tangan=kotak_tangan
                )

                rekaman_telemetri.append({
                    "id": f"P-{id_subjek}",
                    "anonymous_id": f"P{id_subjek}",
                    "track_id": id_subjek,
                    "student_id": subjek.get("student_id"),
                    "nis": subjek.get("nis"),
                    "role": "teacher" if is_guru else "student",
                    "label": nama_siswa,
                    "student_name": nama_siswa,
                    "is_recognized": terkenal,
                    "posture": postur,
                    "activity": tag_aktivitas,
                    "action_text": "Mengajar di Kelas" if is_guru else subjek.get("action_text", ""),
                    "confidence": round(keyakinan, 2),
                    "hand_raised": False if is_guru else subjek["is_hand_raised"],
                    "sleep": False if is_guru else subjek["is_sleep"],
                    "head_tilt_deg": subjek.get("head_tilt", 0.0),
                    "gaze_direction": subjek.get("gaze_dir", "Depan"),
                    "attention_score": 100 if is_guru else subjek.get("attention_score", 95),
                    "seat_latched": subjek.get("seat_latched", False),
                    "seat_id": subjek.get("seat_id", "SEAT_UNKNOWN"),
                    "dwell_seconds": subjek.get("dwell_seconds", 0.0),
                    "attendance_qualified": False if is_guru else subjek.get("attendance_qualified", False),
                    "box": [bx, by, bw, bh]
                })

            # Gambar Bilah Status HUD Atas
            gambar_banner_hud(
                frame,
                statistik_kelas,
                laju_fps,
                konfigurasi.session_id,
                pengirim_telemetri.ambil_status_sinkronisasi(),
                f"{setelan_rotasi}°",
                latensi_inferensi_ms=latensi_saat_ini
            )

            # Kompresi Turbo JPEG untuk Streaming Video MJPEG (Downscale ke 480x270 + Quality 35 untuk Latensi Minimum)
            frame_stream = cv2.resize(frame, (480, 270), interpolation=cv2.INTER_LINEAR) if frame.shape[1] > 480 else frame
            _, jpeg_kompresi = cv2.imencode('.jpg', frame_stream, [cv2.IMWRITE_JPEG_QUALITY, 35, cv2.IMWRITE_JPEG_OPTIMIZE, 0])
            status_server.perbarui_bingkai(jpeg_kompresi.tobytes())

            # Pengiriman Telemetri Berkala ke Next.js Backend & Sinkronisasi Langsung ke Server Stream
            if waktu_sekarang - waktu_telemetri_terakhir >= konfigurasi.interval:
                muatan_telemetri = MuatanTelemetri(
                    session_id=konfigurasi.session_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    frame_id=pencacah_frame,
                    summary=statistik_kelas,
                    anonymized_tracks=rekaman_telemetri
                ).konversi_ke_dict()
                status_server.perbarui_telemetri(muatan_telemetri)
                pengirim_telemetri.masukkan_antrean(muatan_telemetri)
                waktu_telemetri_terakhir = waktu_sekarang
    except Exception as e:
        print(f"[!] Exception di Main Loop Pipeline: {e}")
        import traceback
        traceback.print_exc()
    finally:
        status_pekerja_aktif = False
        sinyal_inferensi.set()
        sinyal_biometrik.set()
        pengirim_telemetri.berhenti()
        kamera_aliran.lepaskan()
        status_server.peristiwa_berhenti.set()
        print("[*] Engine Berhenti Secara Bersih dan Aman.")


# Alias kompatibilitas bahasa Inggris
run_pipeline = jalankan_saluran_pipa_cv
