"""
AI Classroom Intelligence — Kamera Utas Terpisah Berkecepatan Tinggi (Zero Lag)
==============================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengimplementasikan penangkapan aliran video secara terpisah pada utas
khusus dengan teknik Single-Frame Buffer Swap untuk menjamin latensi streaming 0ms.
"""

import threading
import time
from typing import Tuple, Optional, Union
import cv2
import numpy as np


class KameraUtasTerpisah:
    """
    Penangkap Aliran Video Multi-Sumber dengan Re-koneksi Otomatis.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data: Single-Slot Atomic Buffer yang dilindungi oleh threading.Lock().
    - Kebijakan Pembuangan Frame Usang (Drop-Frame Policy): Menetapkan CAP_PROP_BUFFERSIZE = 1
      sehingga jika pemrosesan AI lebih lambat dari laju frame kamera (30 FPS), buffer kamera
      tidak menumpuk frame lama (tidak ada efek slow-motion atau lag video).
    - Kompleksitas Waktu: O(1) untuk operasi read (membaca salinan frame terakhir).
    - Kompleksitas Ruang: O(1) hanya menyimpan tepat 1 citra frame aktif (~2.7 MB untuk 1080p BGR).
    """
    def __init__(self, sumber: Union[int, str] = 0, fps_target: int = 30):
        self.sumber = int(sumber) if str(sumber).isdigit() else sumber
        self.fps_target = fps_target
        self.penangkap: Optional[cv2.VideoCapture] = None
        self.bingkai: Optional[np.ndarray] = None
        self.apakah_terambil: bool = False
        self.apakah_terhubung: bool = False
        self.apakah_berhenti: bool = False
        self.kunci_utas = threading.Lock()

        # Alias kompatibilitas bahasa Inggris
        self.src = self.sumber
        self.cap = self.penangkap
        self.frame = self.bingkai
        self.grabbed = self.apakah_terambil
        self.is_connected = self.apakah_terhubung
        self.stopped = self.apakah_berhenti
        self.lock = self.kunci_utas

        self.hubungkan()

    def hubungkan(self) -> None:
        """Membuka atau menyambung ulang koneksi ke sumber video."""
        if self.penangkap is not None:
            try:
                self.penangkap.release()
            except Exception:
                pass

        try:
            self.penangkap = cv2.VideoCapture(self.sumber)
            self.cap = self.penangkap
            self.penangkap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.penangkap.set(cv2.CAP_PROP_FPS, self.fps_target)
            self.apakah_terhubung = self.penangkap.isOpened()
            self.is_connected = self.apakah_terhubung
            if self.apakah_terhubung:
                print(f"[+] Berhasil terhubung ke sumber video: {self.sumber}")
        except Exception as e:
            print(f"[!] Gagal menghubungkan ke kamera {self.sumber}: {e}")
            self.apakah_terhubung = False
            self.is_connected = False

    def mulai(self) -> "KameraUtasTerpisah":
        """Memulai utas penangkapan bingkai video (background worker)."""
        utas = threading.Thread(target=self._perbarui_aliran, daemon=True)
        utas.start()
        return self

    def _perbarui_aliran(self) -> None:
        jeda_reconnect = 2.0
        waktu_reconnect_terakhir = time.time()

        while not self.apakah_berhenti:
            if not self.apakah_terhubung or self.penangkap is None or not self.penangkap.isOpened():
                sekarang = time.time()
                if sekarang - waktu_reconnect_terakhir > jeda_reconnect:
                    waktu_reconnect_terakhir = sekarang
                    self.hubungkan()
                time.sleep(0.1)
                continue

            berhasil, frame = self.penangkap.read()
            if not berhasil or frame is None:
                self.apakah_terhubung = False
                self.is_connected = False
                time.sleep(0.1)
                continue

            with self.kunci_utas:
                self.apakah_terambil = berhasil
                self.grabbed = berhasil
                self.bingkai = frame
                self.frame = frame

            time.sleep(1.0 / (self.fps_target * 1.5))

    def baca_bingkai(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Membaca salinan bingkai terkini secara aman."""
        with self.kunci_utas:
            if not self.apakah_terambil or self.bingkai is None:
                return False, None
            return True, self.bingkai.copy()

    def lepaskan(self) -> None:
        """Menghentikan penangkapan dan membebaskan sumber daya hardware kamera."""
        self.apakah_berhenti = True
        self.stopped = True
        if self.penangkap:
            try:
                self.penangkap.release()
            except Exception:
                pass

    # Alias kompatibilitas bahasa Inggris
    connect = hubungkan
    start = mulai
    _update = _perbarui_aliran
    read = baca_bingkai
    release = lepaskan


# Alias kelas
ThreadedCamera = KameraUtasTerpisah
