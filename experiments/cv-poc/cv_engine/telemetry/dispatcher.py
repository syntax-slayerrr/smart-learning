"""
AI Classroom Intelligence — Pengirim Telemetri Asinkronus (Producer-Consumer)
=============================================================================
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan pola Producer-Consumer menggunakan antrean
terbatas (Bounded Blocking Queue) untuk mendistribusikan data telemetri ke
endpoint lokal Next.js dan Supabase Cloud tanpa menghentikan streaming video.
"""

import json
import queue
import threading
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
import collections

from cv_engine.telemetry.schemas import serialisasi_json_khusus


class PengirimTelemetriAsinkron:
    """
    Pekerja Antrean Pengiriman Telemetri Non-Blocking (Producer-Consumer Pattern).
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data: Bounded FIFO Queue (queue.Queue(maxsize=100)) yang aman antar-utas (thread-safe).
    - Mekanisme Batas Antrean: Mencegah penumpukan memori tak terbatas (Memory Leak / Out-Of-Memory)
      apabila jaringan internet atau server backend sedang mengalami gangguan / offline.
    - Algoritma Pengiriman: HTTP POST Dual Dispatch (sinkronisasi simultan ke Next.js lokal
      dan Vercel/Supabase Cloud).
    - Kompleksitas Waktu: O(1) untuk operasi enqueue (memasukkan antrean) dan dequeue (mengambil antrean).
    - Kompleksitas Ruang: O(B) di mana B=100 slot muatan telemetri (~200 KB RAM).
    """
    def __init__(self, url_primer: str, url_cloud: str, kunci_perangkat: str, kapasitas_maksimal: int = 100):
        self.url_primer = url_primer
        self.url_cloud = url_cloud
        self.kunci_perangkat = kunci_perangkat
        self.antrean_paket: queue.Queue = queue.Queue(maxsize=kapasitas_maksimal)
        self.spool_gagal: collections.deque = collections.deque(maxlen=40)
        self.peristiwa_berhenti = threading.Event()
        self.kunci_status = threading.Lock()
        self.status_sinkronisasi_terakhir = "Standby"
        self.utas_pekerja: Optional[threading.Thread] = None
        self.waktu_retry_berikutnya: float = 0.0
        self.jeda_backoff: float = 1.0

        # Alias kompatibilitas
        self.primary_url = self.url_primer
        self.cloud_url = self.url_cloud
        self.device_key = self.kunci_perangkat
        self.queue = self.antrean_paket
        self.stop_event = self.peristiwa_berhenti
        self.status_lock = self.kunci_status
        self.last_sync_status = self.status_sinkronisasi_terakhir
        self.worker_thread = self.utas_pekerja

    def mulai(self) -> "PengirimTelemetriAsinkron":
        """Memulai utas pekerja di latar belakang (daemon thread)."""
        self.utas_pekerja = threading.Thread(target=self._lingkaran_kerja_pengiriman, daemon=True)
        self.worker_thread = self.utas_pekerja
        self.utas_pekerja.start()
        print(f"[+] Telemetry Dispatcher Aktif! Endpoint Primer: {self.url_primer}")
        return self

    def berhenti(self) -> None:
        """Menghentikan utas pekerja dengan aman."""
        self.peristiwa_berhenti.set()
        if self.utas_pekerja and self.utas_pekerja.is_alive():
            self.utas_pekerja.join(timeout=1.0)

    def masukkan_antrean(self, muatan_json: Dict[str, Any]) -> bool:
        """
        Pondasi 3: Memasukkan payload telemetri dengan Ring-Buffer Circular Eviction (Non-Blocking).
        Jika antrean penuh akibat lag server/jaringan, item tertua dikeluarkan otomatis (FIFO Ring-Buffer)
        sehingga telemetri TERKINI selalu tersimpan dan FPS video tidak pernah terhambat!
        """
        try:
            if self.antrean_paket.full():
                try:
                    self.antrean_paket.get_nowait()
                    self.antrean_paket.task_done()
                except Exception:
                    pass
            self.antrean_paket.put_nowait(muatan_json)
            return True
        except Exception:
            return False

    def ambil_status_sinkronisasi(self) -> str:
        with self.kunci_status:
            return self.status_sinkronisasi_terakhir

    def _lingkaran_kerja_pengiriman(self) -> None:
        daftar_target_url = [self.url_primer]
        if self.url_cloud and self.url_cloud not in daftar_target_url and "vercel.app" not in self.url_primer:
            daftar_target_url.append(self.url_cloud)

        while not self.peristiwa_berhenti.is_set():
            # Cek apakah ada muatan yang perlu di-retry dari spool kegagalan jika jaringan pulih
            sekarang = time.time()
            muatan = None

            if self.spool_gagal and sekarang >= self.waktu_retry_berikutnya and self.antrean_paket.empty():
                try:
                    muatan = self.spool_gagal.popleft()
                except IndexError:
                    muatan = None

            if muatan is None:
                try:
                    muatan = self.antrean_paket.get(timeout=0.5)
                except queue.Empty:
                    continue

            data_bytes = json.dumps(muatan, default=serialisasi_json_khusus).encode("utf-8")
            daftar_status = []
            semua_sukses = True

            for target_url in daftar_target_url:
                tag_label = "Lokal" if "127.0.0.1" in target_url or "localhost" in target_url else "Cloud"
                try:
                    permintaan = urllib.request.Request(
                        target_url,
                        data=data_bytes,
                        headers={
                            "Content-Type": "application/json",
                            "x-edge-device-key": self.kunci_perangkat
                        }
                    )
                    with urllib.request.urlopen(permintaan, timeout=2.0) as respon:
                        daftar_status.append(f"{tag_label}:{respon.status}")
                except urllib.error.HTTPError as error_http:
                    daftar_status.append(f"{tag_label}:{error_http.code}")
                    semua_sukses = False
                except Exception:
                    daftar_status.append(f"{tag_label}:off")
                    semua_sukses = False

            if not semua_sukses:
                # Simpan ke spool offline untuk retry otomatis dengan exponential backoff
                self.spool_gagal.append(muatan)
                self.jeda_backoff = min(self.jeda_backoff * 1.5, 10.0)
                self.waktu_retry_berikutnya = time.time() + self.jeda_backoff
            else:
                self.jeda_backoff = 1.0

            with self.kunci_status:
                self.status_sinkronisasi_terakhir = " | ".join(daftar_status) if daftar_status else "Standby"
                self.last_sync_status = self.status_sinkronisasi_terakhir

            try:
                self.antrean_paket.task_done()
            except ValueError:
                pass

    # Alias kompatibilitas bahasa Inggris
    start = mulai
    stop = berhenti
    enqueue = masukkan_antrean
    get_sync_status = ambil_status_sinkronisasi
    _worker_loop = _lingkaran_kerja_pengiriman


# Alias kelas
TelemetryDispatcher = PengirimTelemetriAsinkron
