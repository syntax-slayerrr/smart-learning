"""
AI Classroom Intelligence — Server Streaming MJPEG & Pengontrol REST (Developer 3)
==================================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan server HTTP multi-utas berbasis ThreadingHTTPServer:
1. Endpoint video real-time /video_feed (MJPEG 40-45 FPS).
2. Endpoint pemantauan kesehatan & performa /status.
3. Endpoint kontrol dinamis /rotate (rotasi kamera tanpa restart).
4. Endpoint pendaftaran biometrik /register_face dan galeri /gallery.
"""

from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import json
import threading
import time
import urllib.parse
from typing import Optional, Callable, Dict, Any, Tuple
import cv2
import numpy as np

from cv_engine.telemetry.gallery import ManajerGaleriWajah


class StatusServerStreaming:
    """
    Wadah Status Bersama (Shared State) yang Aman Antar-Utas untuk Server Streaming.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data: Buffer Byte Matriks JPEG terkini yang dilindungi threading.Lock().
    - Model Konkurensi: Thread-Per-Connection (Multi-Klien Simultan). Setiap klien
      browser dashboard yang membuka /video_feed dilayani oleh utas independen.
    - Kompleksitas Waktu: O(1) untuk pembaruan frame pointer dan pembacaan frame.
    - Kompleksitas Ruang: O(1) buffer JPEG terkompresi (~80-120 KB per frame).
    """
    def __init__(self, manajer_galeri: ManajerGaleriWajah, fungsi_status_sinkronisasi: Callable[[], str]):
        self.manajer_galeri = manajer_galeri
        self.fungsi_status_sinkronisasi = fungsi_status_sinkronisasi
        self.bingkai_jpeg_terakhir: Optional[bytes] = None
        self.kunci_bingkai = threading.Lock()
        self.peristiwa_berhenti = threading.Event()
        self.kamera: Any = None

        self._standby_cache: Optional[bytes] = None
        self._waktu_standby_terakhir: float = 0.0

        # Penampung Multi-Kamera / Multi-Kelas
        self.bingkai_per_kelas: Dict[str, bytes] = {}
        self.waktu_frame_per_kelas: Dict[str, float] = {}
        self.urutan_frame_per_kelas: Dict[str, int] = {}
        self.baterai_per_kelas: Dict[str, Dict[str, Any]] = {}
        self.rotasi_per_kelas: Dict[str, str] = {}
        self.cermin_per_kelas: Dict[str, bool] = {}

        self.rotasi: str = "auto"
        self.cermin_h: bool = False
        self.kunci_rotasi = threading.Lock()

        # Alias kompatibilitas bahasa Inggris
        self.camera = self.kamera
        self.gallery_manager = self.manajer_galeri
        self.sync_status_fn = self.fungsi_status_sinkronisasi
        self.latest_frame_jpeg = self.bingkai_jpeg_terakhir
        self.frame_lock = self.kunci_bingkai
        self.stop_event = self.peristiwa_berhenti
        self.rotation = self.rotasi
        self.flip_h = self.cermin_h
        self.rotation_lock = self.kunci_rotasi

    def _buat_bingkai_standby(self, label_kelas: str = "UTAMA") -> bytes:
        """Menghasilkan citra standby gelap dengan teks status ketika kamera belum terhubung."""
        w, h = 640, 360
        kanvas = np.zeros((h, w, 3), dtype=np.uint8)
        kanvas[:] = (24, 20, 18)  # Warna gelap zinc-950

        # Garis aksen oranye Syntax Slayer di atas (BGR: 12, 88, 234)
        cv2.line(kanvas, (0, 0), (w, 0), (12, 88, 234), 4)

        waktu_str = datetime.now().strftime("%H:%M:%S")
        judul = f"SYNTAX SLAYER AI - {str(label_kelas).upper()}"
        cv2.putText(kanvas, judul, (36, 110),
                    cv2.FONT_HERSHEY_DUPLEX, 0.62, (245, 245, 245), 1, cv2.LINE_AA)
        cv2.putText(kanvas, "[ STANDBY - MENUNGGU PEMANCAR HP ]", (36, 150),
                    cv2.FONT_HERSHEY_DUPLEX, 0.50, (25, 165, 255), 1, cv2.LINE_AA)
        cv2.putText(kanvas, "Buka /kamera-hp di HP lalu pilih kelas ini", (36, 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (170, 170, 170), 1, cv2.LINE_AA)
        cv2.putText(kanvas, f"Port 5000 Online  |  Jam: {waktu_str}", (36, 310),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (110, 110, 110), 1, cv2.LINE_AA)

        _, enc = cv2.imencode('.jpg', kanvas, [cv2.IMWRITE_JPEG_QUALITY, 50])
        return enc.tobytes()

    def tautkan_kamera(self, kamera: Any) -> None:
        """Menautkan instans KameraUtasTerpisah agar endpoint REST dapat mengontrol sumber secara dinamis."""
        self.kamera = kamera
        self.camera = kamera

    def perbarui_bingkai(self, data_bytes_jpeg: bytes) -> None:
        """Memperbarui frame terkini untuk disiarkan ke seluruh klien yang terhubung."""
        with self.kunci_bingkai:
            self.bingkai_jpeg_terakhir = data_bytes_jpeg
            self.latest_frame_jpeg = self.bingkai_jpeg_terakhir
            for k in list(self.bingkai_per_kelas.keys()):
                self.bingkai_per_kelas[k] = data_bytes_jpeg
                self.waktu_frame_per_kelas[k] = time.time()

    def perbarui_bingkai_kelas(self, id_kelas: str, data_bytes_jpeg: bytes) -> None:
        """Memperbarui frame untuk channel / kelas tertentu."""
        with self.kunci_bingkai:
            self.bingkai_per_kelas[id_kelas] = data_bytes_jpeg
            self.waktu_frame_per_kelas[id_kelas] = time.time()
            self.bingkai_jpeg_terakhir = data_bytes_jpeg
            self.latest_frame_jpeg = data_bytes_jpeg

    def ambil_bingkai(self) -> Optional[bytes]:
        """Mengambil salinan frame terkini atau menghasilkan frame standby jika kamera belum terhubung."""
        return self.ambil_bingkai_kelas("main")

    def ambil_bingkai_kelas(self, id_kelas: str = "main") -> bytes:
        """Mengambil salinan frame untuk channel / kelas tertentu."""
        with self.kunci_bingkai:
            frame = self.bingkai_per_kelas.get(id_kelas)
            waktu_kini = time.time()
            waktu_terakhir = self.waktu_frame_per_kelas.get(id_kelas, 0.0)

            if frame is not None and (waktu_kini - waktu_terakhir) < 4.0:
                return frame
            if self.bingkai_jpeg_terakhir is not None:
                return self.bingkai_jpeg_terakhir
            return self._buat_bingkai_standby(id_kelas)

    def atur_orientasi(self, rotasi: Optional[str] = None, cermin_h: Optional[bool] = None) -> Tuple[str, bool]:
        """Mengubah sudut rotasi atau pencerminan secara dinamis."""
        with self.kunci_rotasi:
            if rotasi in ("0", "90", "180", "270", "auto"):
                self.rotasi = rotasi
                self.rotation = self.rotasi
            if cermin_h is not None:
                self.cermin_h = cermin_h
                self.flip_h = self.cermin_h
            return self.rotasi, self.cermin_h

    def atur_orientasi_kelas(self, id_kelas: str, rotasi: Optional[str] = None, cermin_h: Optional[bool] = None) -> Tuple[str, bool]:
        """Mengubah sudut rotasi atau pencerminan khusus untuk kelas/channel tertentu."""
        with self.kunci_rotasi:
            if rotasi in ("0", "90", "180", "270", "auto"):
                self.rotasi_per_kelas[id_kelas] = rotasi
            if cermin_h is not None:
                self.cermin_per_kelas[id_kelas] = cermin_h
            rot = self.rotasi_per_kelas.get(id_kelas, self.rotasi)
            cerm = self.cermin_per_kelas.get(id_kelas, self.cermin_h)
            return rot, cerm

    def ambil_orientasi(self) -> Tuple[str, bool]:
        with self.kunci_rotasi:
            return self.rotasi, self.cermin_h

    # Alias kompatibilitas bahasa Inggris
    update_frame = perbarui_bingkai
    get_frame = ambil_bingkai
    set_orientation = atur_orientasi
    get_orientation = ambil_orientasi


# Alias kelas
StreamServerState = StatusServerStreaming


class PengendaliStreamMJPEG(BaseHTTPRequestHandler):
    """
    Penangan Permintaan HTTP untuk Streaming Video MJPEG dan Endpoint Kontrol REST.
    """
    state: StatusServerStreaming = None  # Diinjeksikan saat inisialisasi server

    def log_message(self, format, *args):
        # Meredam logging berlebih pada terminal
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-edge-device-key")
        self.end_headers()

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-edge-device-key")
        self.end_headers()

    def do_POST(self):
        diurai = urllib.parse.urlparse(self.path)
        jalur_url = diurai.path

        # Endpoint terima frame kamera langsung dari browser web (HP / PWA)
        if jalur_url in ("/push_frame", "/camera/push"):
            try:
                parameter = urllib.parse.parse_qs(diurai.query)
                id_kelas = parameter.get("class_id", [None])[0] or parameter.get("kelas", [None])[0] or parameter.get("channel", ["main"])[0]
                seq_str = parameter.get("seq", [None])[0]
                bat_val = parameter.get("battery", [None])[0]
                chg_val = parameter.get("charging", [None])[0]
                if bat_val is not None and self.state:
                    try:
                        self.state.baterai_per_kelas[id_kelas] = {
                            "level": int(bat_val),
                            "charging": chg_val in ("1", "true", "True"),
                            "updated_at": time.time(),
                        }
                    except Exception:
                        pass

                # Guard Out-of-Order Pipelining: Drop frame usang yang tiba terlambat akibat variasi latensi WAN
                if seq_str is not None and self.state:
                    try:
                        seq_num = int(seq_str)
                        terakhir_seq = self.state.urutan_frame_per_kelas.get(id_kelas, 0)
                        if seq_num <= terakhir_seq and (terakhir_seq - seq_num) < 100000:
                            # Frame usang tiba belakangan -> drop langsung tanpa decode demi menjaga kelancaran 20+ FPS
                            self.send_response(200)
                            self.send_header("Content-type", "application/json")
                            self.send_header("Access-Control-Allow-Origin", "*")
                            self.end_headers()
                            self.wfile.write(b'{"success":true,"dropped":true}')
                            return
                        self.state.urutan_frame_per_kelas[id_kelas] = seq_num
                    except (ValueError, TypeError):
                        pass

                panjang_konten = int(self.headers.get("Content-Length", 0))
                if panjang_konten > 0:
                    data_mentah = self.rfile.read(panjang_konten)
                    # Simpan ke cache per-kelas
                    if self.state:
                        self.state.perbarui_bingkai_kelas(id_kelas, data_mentah)
                    arr = np.frombuffer(data_mentah, dtype=np.uint8)
                    frame_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if frame_bgr is not None and self.state and self.state.kamera:
                        if hasattr(self.state.kamera, "terima_bingkai_eksternal"):
                            self.state.kamera.terima_bingkai_eksternal(frame_bgr)
                        self.send_response(200)
                        self.send_header("Content-type", "application/json")
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": True, "class_id": id_kelas}).encode("utf-8"))
                        return
            except Exception:
                pass
            self.send_response(400)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"success":false,"error":"Data frame tidak valid"}')
            return

        # Ekstrak muatan JSON jika dikirim oleh klien
        self._muatan_json = {}
        try:
            panjang_konten = int(self.headers.get("Content-Length", 0))
            if panjang_konten > 0:
                data_mentah = self.rfile.read(panjang_konten)
                self._muatan_json = json.loads(data_mentah.decode("utf-8"))
        except Exception:
            pass
        return self.do_GET()

    def do_GET(self):
        state = self.state
        if state is None:
            self.send_response(500)
            self.end_headers()
            return

        diurai = urllib.parse.urlparse(self.path)
        jalur_url = diurai.path
        parameter = urllib.parse.parse_qs(diurai.query)

        # 1. Endpoint Status Sistem
        if jalur_url == "/status":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            rot_val, cermin_val = state.ambil_orientasi()
            sinkron_val = state.fungsi_status_sinkronisasi()
            sumber_aktif = state.kamera.sumber if (state.kamera and hasattr(state.kamera, "sumber")) else 0
            kamera_konek = state.kamera.apakah_terhubung if (state.kamera and hasattr(state.kamera, "apakah_terhubung")) else False

            muatan = {
                "status": "online",
                "engine": "SYNTAX_SLAYER_EDUAI_V4_MODULAR",
                "fps": 45,
                "rotation": rot_val,
                "flip_h": cermin_val,
                "cloud_sync": sinkron_val,
                "current_source": sumber_aktif,
                "camera_connected": kamera_konek,
                "active_classes": list(state.bingkai_per_kelas.keys()),
                "batteries": state.baterai_per_kelas,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(muatan).encode("utf-8"))
            return

        # 2a. Endpoint Daftar Perangkat Kamera Fisik & Status Sumber
        if jalur_url in ("/camera_sources", "/camera/sources"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            from cv_engine.streaming.camera import KameraUtasTerpisah
            daftar_kamera = KameraUtasTerpisah.deteksi_kamera_tersedia()
            sumber_aktif = state.kamera.sumber if (state.kamera and hasattr(state.kamera, "sumber")) else 0
            kamera_konek = state.kamera.apakah_terhubung if (state.kamera and hasattr(state.kamera, "apakah_terhubung")) else False

            jawaban = {
                "success": True,
                "current_source": sumber_aktif,
                "camera_connected": kamera_konek,
                "available_cameras": daftar_kamera,
            }
            self.wfile.write(json.dumps(jawaban).encode("utf-8"))
            return

        # 2b. Endpoint Pemindai Kamera Jaringan WiFi (Network Scanner)
        if jalur_url in ("/scan_network_cameras", "/camera/scan_network"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            from cv_engine.streaming.camera import KameraUtasTerpisah
            hasil_pindai = KameraUtasTerpisah.pindai_kamera_jaringan()
            self.wfile.write(json.dumps(hasil_pindai).encode("utf-8"))
            return

        # 2c. Endpoint Alihkan Sumber Kamera Secara Dinamis
        if jalur_url in ("/switch_camera", "/camera/switch"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            sumber_baru = parameter.get("source", [None])[0] or parameter.get("src", [None])[0]
            # Cek jika sumber_baru dikirim via JSON body (POST)
            if sumber_baru is None and hasattr(self, "_muatan_json") and isinstance(self._muatan_json, dict):
                sumber_baru = self._muatan_json.get("source") or self._muatan_json.get("src")

            if sumber_baru is not None and state.kamera and hasattr(state.kamera, "ganti_sumber"):
                sukses, pesan = state.kamera.ganti_sumber(sumber_baru)
                jawaban = {
                    "success": sukses,
                    "message": pesan,
                    "current_source": state.kamera.sumber,
                    "camera_connected": state.kamera.apakah_terhubung
                }
            else:
                jawaban = {
                    "success": False,
                    "message": "Parameter 'source' tidak ditemukan atau modul kamera belum ditautkan",
                    "current_source": state.kamera.sumber if state.kamera else 0
                }
            self.wfile.write(json.dumps(jawaban).encode("utf-8"))
            return

        # 2c. Endpoint Kontrol Rotasi Kamera
        if jalur_url == "/rotate":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            sudut_baru = parameter.get("deg", [None])[0]
            cermin_baru = parameter.get("flip", [None])[0]
            id_kelas = parameter.get("class_id", [None])[0] or parameter.get("kelas", [None])[0]
            nilai_cermin = None
            if cermin_baru is not None:
                nilai_cermin = cermin_baru in ("1", "true", "True")

            if id_kelas:
                rot_ret, cermin_ret = state.atur_orientasi_kelas(id_kelas, sudut_baru, nilai_cermin)
            else:
                rot_ret, cermin_ret = state.atur_orientasi(sudut_baru, nilai_cermin)

            jawaban = {"success": True, "class_id": id_kelas, "rotation": rot_ret, "flip_h": cermin_ret}
            self.wfile.write(json.dumps(jawaban).encode("utf-8"))
            return

        # 3. Endpoint Registrasi Wajah Siswa
        if jalur_url == "/register_face":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            nama_siswa = parameter.get("name", ["Zaldy (Siswa)"])[0]
            state.manajer_galeri.picu_registrasi_wajah(nama_siswa)
            jawaban = {"success": True, "message": f"Mendaftarkan profil wajah untuk: {nama_siswa}"}
            self.wfile.write(json.dumps(jawaban).encode("utf-8"))
            return

        # 4. Endpoint Galeri Siswa Terdaftar
        if jalur_url == "/gallery":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            daftar_nama = state.manajer_galeri.ambil_daftar_siswa_terdaftar()
            jawaban = {"success": True, "registered_students": daftar_nama, "total": len(daftar_nama)}
            self.wfile.write(json.dumps(jawaban).encode("utf-8"))
            return

        # 5. Endpoint Snapshot Frame Tunggal (JPEG Standar / Anti Buffering Proxy)
        if jalur_url in ("/snapshot", "/shot.jpg", "/snapshot.jpg"):
            id_kelas = parameter.get("class_id", [None])[0] or parameter.get("kelas", [None])[0] or parameter.get("channel", ["main"])[0]
            bingkai_bytes = state.ambil_bingkai_kelas(id_kelas)
            if bingkai_bytes is None:
                bingkai_bytes = state._buat_bingkai_standby(id_kelas)
            self.send_response(200)
            self.send_header("Content-type", "image/jpeg")
            self.send_header("Content-length", str(len(bingkai_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            self.wfile.write(bingkai_bytes)
            return

        # 6. Endpoint Siaran Video MJPEG (Multipart Mixed Replace)
        if jalur_url in ("/video_feed", "/"):
            id_kelas = parameter.get("class_id", [None])[0] or parameter.get("kelas", [None])[0] or parameter.get("channel", ["main"])[0]
            self.send_response(200)
            self.send_header("Content-type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            terakhir_dikirim = None
            while not state.peristiwa_berhenti.is_set():
                bingkai_bytes = state.ambil_bingkai_kelas(id_kelas)
                if bingkai_bytes is not None and bingkai_bytes is not terakhir_dikirim:
                    try:
                        self.wfile.write(b"--frame\r\n")
                        self.send_header("Content-type", "image/jpeg")
                        self.send_header("Content-length", str(len(bingkai_bytes)))
                        self.end_headers()
                        self.wfile.write(bingkai_bytes)
                        self.wfile.write(b"\r\n")
                        self.wfile.flush()
                        terakhir_dikirim = bingkai_bytes
                    except (BrokenPipeError, ConnectionResetError):
                        break
                time.sleep(0.005)  # Respon instan tanpa tidur 20ms
            return

        self.send_response(404)
        self.end_headers()


# Alias kelas
MJPEGStreamHandler = PengendaliStreamMJPEG


def jalankan_server_mjpeg(port: int, state: StatusServerStreaming) -> Optional[ThreadingHTTPServer]:
    """
    Meluncurkan server HTTP streaming MJPEG pada utas terpisah (daemon).
    """
    try:
        PengendaliStreamMJPEG.state = state
        server = ThreadingHTTPServer(("0.0.0.0", port), PengendaliStreamMJPEG)
        server.daemon_threads = True
        utas = threading.Thread(target=server.serve_forever, daemon=True)
        utas.start()
        print(f"[+] Server MJPEG Turbo Aktif: http://localhost:{port}/video_feed")
        return server
    except Exception as e:
        print(f"[!] Peringatan: Gagal menjalankan server MJPEG pada port {port}: {e}")
        return None


# Alias kompatibilitas
start_mjpeg_server = jalankan_server_mjpeg
