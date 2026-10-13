"""
AI Classroom Intelligence — Manajemen Galeri Wajah & Biometrik Siswa
====================================================================
Syntax Slayer — Smart Learning Platform

Modul ini mengelola persistensi basis data vektor biometrik wajah siswa
secara aman (*thread-safe*) dan menjalankan pencarian kemiripan kosinus.
"""

import json
import os
import threading
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from cv_engine.config import FACE_GALLERY_PATH
from cv_engine.core.face import MesinBiometrikArcFace


class ManajerGaleriWajah:
    """
    Pengelola Galeri Biometrik Wajah Siswa Berbasis Thread-Safe Hash Map.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data: Hash Map (dict) memetakan Nama_Siswa -> Vektor_Fitur_512d.
    - Algoritma Pencarian: Linear Scan Cosine Similarity:
        sim = dot(V_query, V_siswa)
      Mencari nilai kemiripan tertinggi yang melampaui ambang batas (>= 0.38).
    - Kompleksitas Waktu: O(S * D) di mana S adalah jumlah siswa terdaftar (S <= 50)
      dan D=512. Sangat cepat (< 0.2 milidetik pada CPU).
    - Kompleksitas Ruang: O(S * D) memori JSON ringkas (~100 KB untuk 50 siswa).
    - Keamanan Utas (Thread Safety): Dilindungi oleh threading.Lock() untuk mencegah
      kondisi balapan (race condition) saat guru mendaftarkan wajah siswa baru saat streaming aktif.
    """
    def __init__(self, jalur_berkas: str = FACE_GALLERY_PATH):
        self.jalur_berkas = jalur_berkas
        self.galeri: Dict[str, List[float]] = {}
        self.kunci_utas = threading.Lock()
        self.nama_tertunda: Optional[str] = None
        self.peristiwa_pemicu = threading.Event()

        # Alias kompatibilitas
        self.gallery_file = self.jalur_berkas
        self.gallery = self.galeri
        self.lock = self.kunci_utas
        self.pending_name = self.nama_tertunda
        self.trigger_event = self.peristiwa_pemicu

        self.muat_basis_data()

    def muat_basis_data(self) -> None:
        """Memuat berkas galeri wajah JSON dari disk."""
        if os.path.exists(self.jalur_berkas):
            try:
                with open(self.jalur_berkas, "r") as berkas:
                    self.galeri = json.load(berkas)
                    self.gallery = self.galeri
                print(f"[+] Face Recognition: Berhasil memuat {len(self.galeri)} profil siswa dari galeri!")
            except Exception as e:
                print(f"[!] Peringatan: Gagal memuat berkas galeri wajah: {e}")
                self.galeri = {}
                self.gallery = self.galeri
        else:
            self.galeri = {}
            self.gallery = self.galeri

    def simpan_basis_data(self) -> bool:
        """Menyimpan basis data galeri wajah ke disk dalam format JSON terformat."""
        try:
            with open(self.jalur_berkas, "w") as berkas:
                json.dump(self.galeri, berkas, indent=2)
            return True
        except Exception as e:
            print(f"[!] Gagal menulis berkas galeri wajah: {e}")
            return False

    def daftarkan_wajah(self, nama_siswa: str, vektor_biometrik: Any) -> bool:
        """
        Mendaftarkan atau memperbarui vektor fitur biometrik siswa ke galeri.
        """
        with self.kunci_utas:
            daftar_vektor = vektor_biometrik.tolist() if hasattr(vektor_biometrik, "tolist") else list(vektor_biometrik)
            self.galeri[nama_siswa] = daftar_vektor
            self.gallery = self.galeri
            berhasil = self.simpan_basis_data()
            if berhasil:
                print(f"[+] Berhasil mendaftarkan biometrik siswa: {nama_siswa} (Dimensi: {len(daftar_vektor)})")
            return berhasil

    def picu_registrasi_wajah(self, nama_siswa: str) -> None:
        """Memicu sistem agar pada frame berikutnya wajah yang tampak didaftarkan."""
        with self.kunci_utas:
            self.nama_tertunda = nama_siswa
            self.pending_name = self.nama_tertunda
            self.peristiwa_pemicu.set()

    def ambil_nama_tertunda(self) -> Optional[str]:
        with self.kunci_utas:
            return self.nama_tertunda

    def bersihkan_pemicu(self) -> None:
        with self.kunci_utas:
            self.nama_tertunda = None
            self.pending_name = None
            self.peristiwa_pemicu.clear()

    def cari_kemiripan_wajah(self, vektor_kueri: np.ndarray, ambang_batas: float = 0.38) -> Tuple[Optional[str], float]:
        """
        Pencarian vektor biometrik terhadap seluruh siswa terdaftar menggunakan Cosine Similarity.
        """
        nama_terbaik = None
        skor_terbaik = ambang_batas

        with self.kunci_utas:
            for nama_siswa, vektor_profil in self.galeri.items():
                if len(vektor_profil) == len(vektor_kueri):
                    kemiripan = MesinBiometrikArcFace.hitung_kemiripan_kosinus(vektor_kueri, vektor_profil)
                    if kemiripan > skor_terbaik:
                        skor_terbaik = kemiripan
                        nama_terbaik = nama_siswa

        return nama_terbaik, skor_terbaik

    def ambil_daftar_siswa_terdaftar(self) -> List[str]:
        with self.kunci_utas:
            return list(self.galeri.keys())

    # Alias kompatibilitas bahasa Inggris
    load = muat_basis_data
    save = simpan_basis_data
    register_face = daftarkan_wajah
    trigger_registration = picu_registrasi_wajah
    get_pending_name = ambil_nama_tertunda
    clear_trigger = bersihkan_pemicu
    find_match = cari_kemiripan_wajah
    get_registered_students = ambil_daftar_siswa_terdaftar


# Alias kelas
FaceGalleryManager = ManajerGaleriWajah
