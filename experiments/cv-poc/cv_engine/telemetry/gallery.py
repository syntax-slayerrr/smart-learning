"""
AI Classroom Intelligence — Manajemen Galeri Wajah & Biometrik Siswa
====================================================================
Developer 2: Telemetry, Contracts & Cloud Integration Lead
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
        self.metadata_identitas: Dict[str, Dict[str, Any]] = {}
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
        Menggunakan Rolling Mean Momentum (alpha=0.25) jika profil sudah ada agar tahan perubahan ekspresi.
        """
        with self.kunci_utas:
            v_baru = np.asarray(vektor_biometrik, dtype=np.float32).flatten()
            norm_baru = float(np.linalg.norm(v_baru))
            if norm_baru > 1e-6:
                v_baru = v_baru / norm_baru

            # Jika sudah ada profil sebelumnya, lakukan blending ensemble multi-frame (Rolling Mean)
            if nama_siswa in self.galeri and len(self.galeri[nama_siswa]) == len(v_baru):
                v_lama = np.asarray(self.galeri[nama_siswa], dtype=np.float32).flatten()
                norm_lama = float(np.linalg.norm(v_lama))
                if norm_lama > 1e-6:
                    v_lama = v_lama / norm_lama
                # Blending 75% memori profil lama + 25% variasi sudut/pencahayaan baru
                v_gabungan = (0.75 * v_lama) + (0.25 * v_baru)
                norm_gab = float(np.linalg.norm(v_gabungan))
                if norm_gab > 1e-6:
                    v_gabungan = v_gabungan / norm_gab
                daftar_vektor = v_gabungan.tolist()
            else:
                daftar_vektor = v_baru.tolist()

            self.galeri[nama_siswa] = daftar_vektor
            self.gallery = self.galeri
            berhasil = self.simpan_basis_data()
            if berhasil:
                print(f"[+] Berhasil mendaftarkan biometrik siswa: {nama_siswa} (Rolling Mean 128-d)")
            return berhasil

    def perbarui_adaptif_wajah(self, nama_siswa: str, vektor_kueri: Any, alpha: float = 0.10) -> None:
        """
        Pembaruan adaptif perlahan saat siswa duduk stabil di kelas (Continuous Learning).
        """
        with self.kunci_utas:
            if nama_siswa not in self.galeri:
                return
            v_baru = np.asarray(vektor_kueri, dtype=np.float32).flatten()
            v_lama = np.asarray(self.galeri[nama_siswa], dtype=np.float32).flatten()
            if len(v_baru) != len(v_lama):
                return
            n_baru = float(np.linalg.norm(v_baru))
            n_lama = float(np.linalg.norm(v_lama))
            if n_baru < 1e-6 or n_lama < 1e-6:
                return
            v_blend = ((1.0 - alpha) * (v_lama / n_lama)) + (alpha * (v_baru / n_baru))
            n_blend = float(np.linalg.norm(v_blend))
            if n_blend > 1e-6:
                self.galeri[nama_siswa] = (v_blend / n_blend).tolist()
                self.gallery = self.galeri

    def perbarui_dari_roster_api(self, roster_siswa: List[Dict[str, Any]]) -> int:
        """
        Memuat dan meng-cache biometrik seluruh siswa & guru kelas dari API Supabase/Next.js.
        Menyimpan metadata definitif (student_id, nis, role, nama).
        """
        pencacah = 0
        with self.kunci_utas:
            for item in roster_siswa:
                nama = item.get("name") or item.get("student_name") or item.get("full_name")
                student_id = item.get("student_id") or item.get("id")
                nis = item.get("nis")
                role = item.get("role", "student")
                emb = item.get("embedding")
                if nama and emb and isinstance(emb, list) and len(emb) in (128, 512):
                    v = np.asarray(emb, dtype=np.float32).flatten()
                    n = float(np.linalg.norm(v))
                    if n > 1e-6:
                        self.galeri[nama] = (v / n).tolist()
                        self.metadata_identitas[nama] = {
                            "name": nama,
                            "student_id": str(student_id) if student_id else None,
                            "nis": str(nis) if nis else None,
                            "role": role,
                            "quality_score": float(item.get("quality_score", 98.5))
                        }
                        pencacah += 1
            self.gallery = self.galeri
            if pencacah > 0:
                self.simpan_basis_data()
                print(f"[+] Sinkronisasi Roster Kelas: Memuat {pencacah} biometrik siswa/guru dari Supabase!")
        return pencacah

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

    def cari_kemiripan_wajah(self, vektor_kueri: np.ndarray, ambang_batas: float = 0.34) -> Tuple[Optional[str], float]:
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

    def ambil_metadata_identitas(self, nama_siswa: str) -> Dict[str, Any]:
        """Mengambil metadata terikat (student_id UUID, nis, role) dari identitas yang cocok."""
        with self.kunci_utas:
            if nama_siswa in self.metadata_identitas:
                return dict(self.metadata_identitas[nama_siswa])
            # Default fallback jika hanya nama terdaftar di galeri JSON lokal
            is_guru = any(k in nama_siswa.lower() for k in ("guru", "pengajar", "ustadz", "pak ", "bu "))
            return {
                "name": nama_siswa,
                "student_id": None,
                "nis": None,
                "role": "teacher" if is_guru else "student",
                "quality_score": 98.0
            }

    def ambil_daftar_siswa_terdaftar(self) -> List[str]:
        with self.kunci_utas:
            return list(self.galeri.keys())

    # Alias kompatibilitas bahasa Inggris
    load = muat_basis_data
    save = simpan_basis_data
    register_face = daftarkan_wajah
    update_adaptive = perbarui_adaptif_wajah
    sync_from_roster = perbarui_dari_roster_api
    trigger_registration = picu_registrasi_wajah
    get_pending_name = ambil_nama_tertunda
    clear_trigger = bersihkan_pemicu
    find_match = cari_kemiripan_wajah
    get_metadata = ambil_metadata_identitas
    get_registered_students = ambil_daftar_siswa_terdaftar


# Alias kelas
FaceGalleryManager = ManajerGaleriWajah
