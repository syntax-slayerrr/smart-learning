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

        self.rotasi: str = "auto"
        self.cermin_h: bool = False
        self.kunci_rotasi = threading.Lock()

        # Alias kompatibilitas bahasa Inggris
        self.gallery_manager = self.manajer_galeri
        self.sync_status_fn = self.fungsi_status_sinkronisasi
        self.latest_frame_jpeg = self.bingkai_jpeg_terakhir
        self.frame_lock = self.kunci_bingkai
        self.stop_event = self.peristiwa_berhenti
        self.rotation = self.rotasi
        self.flip_h = self.cermin_h
        self.rotation_lock = self.kunci_rotasi

    def perbarui_bingkai(self, data_bytes_jpeg: bytes) -> None:
        """Memperbarui frame terkini untuk disiarkan ke seluruh klien yang terhubung."""
        with self.kunci_bingkai:
            self.bingkai_jpeg_terakhir = data_bytes_jpeg
            self.latest_frame_jpeg = self.bingkai_jpeg_terakhir

    def ambil_bingkai(self) -> Optional[bytes]:
        """Mengambil salinan frame terkini."""
        with self.kunci_bingkai:
            return self.bingkai_jpeg_terakhir

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
            muatan = {
                "status": "online",
                "engine": "SYNTAX_SLAYER_EDUAI_V4_MODULAR",
                "fps": 45,
                "rotation": rot_val,
                "flip_h": cermin_val,
                "cloud_sync": sinkron_val,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(muatan).encode("utf-8"))
            return

        # 2. Endpoint Kontrol Rotasi Kamera
        if jalur_url == "/rotate":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            sudut_baru = parameter.get("deg", [None])[0]
            cermin_baru = parameter.get("flip", [None])[0]
            nilai_cermin = None
            if cermin_baru is not None:
                nilai_cermin = cermin_baru in ("1", "true", "True")

            rot_ret, cermin_ret = state.atur_orientasi(sudut_baru, nilai_cermin)
            jawaban = {"success": True, "rotation": rot_ret, "flip_h": cermin_ret}
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

        # 5. Endpoint Siaran Video MJPEG (Multipart Mixed Replace)
        if jalur_url in ("/video_feed", "/"):
            self.send_response(200)
            self.send_header("Content-type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, private")
            self.end_headers()

            while not state.peristiwa_berhenti.is_set():
                bingkai_bytes = state.ambil_bingkai()
                if bingkai_bytes is not None:
                    try:
                        self.wfile.write(b"--frame\r\n")
                        self.send_header("Content-type", "image/jpeg")
                        self.send_header("Content-length", str(len(bingkai_bytes)))
                        self.end_headers()
                        self.wfile.write(bingkai_bytes)
                        self.wfile.write(b"\r\n")
                    except (BrokenPipeError, ConnectionResetError):
                        break
                time.sleep(0.025)  # Batas laju kirim stabil 40 FPS
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
