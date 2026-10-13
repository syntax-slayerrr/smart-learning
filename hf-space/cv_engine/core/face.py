"""
AI Classroom Intelligence — Mesin Biometrik ArcFace 512-Dimensi & Detektor Wajah
================================================================================
Syntax Slayer — Smart Learning Platform

Modul ini mengelola pengenalan identitas siswa menggunakan ekstraksi fitur
biometrik 512-dimensi InsightFace MobileFaceNet ArcFace yang distandarisasi
dengan perataan afinitas 5 titik wajah kanonis.
"""

import os
from typing import Optional, Tuple, Any, List
import cv2
import numpy as np

from cv_engine.config import ARCFACE_MBF_PATH, YUNET_ONNX_PATH, SFACE_ONNX_PATH


def normalisasi_cahaya_clahe(citra_bgr: np.ndarray, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Pondasi 4: Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Menyeimbangkan kontras pada ruang warna LAB (kanal Luminance L) secara lokal.
    Menyelamatkan wajah siswa dari bayangan gelap atau silau proyektor tanpa merusak rona warna alami.
    """
    if citra_bgr is None or citra_bgr.size == 0:
        return citra_bgr
    try:
        lab = cv2.cvtColor(citra_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    except Exception:
        return citra_bgr


class MesinBiometrikArcFace:
    """
    Ekstraktor Fitur Wajah 512-Dimensi ArcFace berbasis MobileFaceNet ONNX.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data Masukan: Matriks Wajah Terpotong 112x112 piksel berorientasi lurus.
    - Struktur Data Keluaran: Vektor V berdimensi 512 Float32 ternormalisasi L2 (||V|| = 1.0).
    - Algoritma: 
        1. Estimasi Matriks Afinitas Parsial 2D (Umeyama Similarity Transform) memetakan
           5 landmark wajah ke koordinat kanonis.
        2. Inferensi Deep Feature Projection via MobileFaceNet.
        3. Cosine Dot Product Scoring: sim = V1 . V2 (rentang -1.0 hingga +1.0).
    - Kompleksitas Waktu: O(D) di mana D=512 operasi perkalian titik per pencocokan.
    - Kompleksitas Ruang: O(D) ruang penyimpanan memori sangat ringkas (~2 KB per profil).
    """
    def __init__(self, jalur_model: Optional[str] = None):
        if jalur_model is None:
            jalur_model = ARCFACE_MBF_PATH
        self.jalur_model = jalur_model
        self.session = None

        # 5 Titik Landmark Referensi Standar InsightFace (Ukuran 112 x 112 piksel)
        self.titik_referensi_kanonis = np.array([
            [38.2946, 51.6963],  # Mata Kiri
            [73.5318, 51.5014],  # Mata Kanan
            [56.0252, 71.7366],  # Ujung Hidung
            [41.5493, 92.3655],  # Sudut Bibir Kiri
            [70.7299, 92.2041]   # Sudut Bibir Kanan
        ], dtype=np.float32)

        if os.path.exists(jalur_model):
            try:
                import onnxruntime as ort
                opsi = ort.SessionOptions()
                opsi.intra_op_num_threads = 2
                opsi.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                self.session = ort.InferenceSession(jalur_model, opsi, providers=['CPUExecutionProvider'])
                self.nama_input = self.session.get_inputs()[0].name
                self.nama_output = self.session.get_outputs()[0].name
                print(f"[+] ArcFace 512-d Biometric Engine Aktif ({os.path.basename(jalur_model)})!")
            except Exception as e:
                print(f"[!] Peringatan: Gagal memuat model ArcFace: {e}")

    def apakah_siap(self) -> bool:
        """Memeriksa kesiapan sesi ONNX ArcFace."""
        return self.session is not None

    def ratakan_wajah(self, frame: np.ndarray, lima_titik_landmark: np.ndarray) -> Optional[np.ndarray]:
        """
        Mentransformasikan dan memotong area wajah ke ruang kanonis 112x112 menggunakan
        transformasi afinitas parsial (rotasi + penskalaan + translasi).
        """
        try:
            matriks_transformasi, _ = cv2.estimateAffinePartial2D(lima_titik_landmark, self.titik_referensi_kanonis)
            if matriks_transformasi is None:
                return None
            return cv2.warpAffine(frame, matriks_transformasi, (112, 112), borderValue=0.0)
        except Exception:
            return None

    def ekstraksi_fitur_vektor(self, citra_wajah_112x112: Optional[np.ndarray]) -> Optional[np.ndarray]:
        """
        Mengekstrak representasi vektor biometrik 512-dimensi yang telah ternormalisasi L2.
        Dilengkapi normalisasi kontras adaptif CLAHE untuk ketahanan terhadap bayangan/silau.
        """
        if self.session is None or citra_wajah_112x112 is None:
            return None
        try:
            # Pondasi 4: Normalisasi pencahayaan dinamis CLAHE
            wajah_terkoreksi = normalisasi_cahaya_clahe(citra_wajah_112x112)
            citra_rgb = cv2.cvtColor(wajah_terkoreksi, cv2.COLOR_BGR2RGB).astype(np.float32)
            ternormalisasi = (citra_rgb - 127.5) / 128.0
            tensor_chw = np.transpose(ternormalisasi, (2, 0, 1))[np.newaxis, ...]

            vektor_keluaran = self.session.run([self.nama_output], {self.nama_input: tensor_chw})[0][0]
            norma_vektor = np.linalg.norm(vektor_keluaran)
            if norma_vektor > 1e-6:
                vektor_keluaran = vektor_keluaran / norma_vektor
            return vektor_keluaran
        except Exception:
            return None

    @staticmethod
    def hitung_kemiripan_kosinus(vektor_a: Any, vektor_b: Any) -> float:
        """
        Menghitung kesamaan kosinus (Cosine Similarity) antara 2 vektor biometrik.
        Rentang: -1.0 (sangat berbeda) hingga 1.0 (identik sempurna).
        """
        if vektor_a is None or vektor_b is None:
            return 0.0
        v1 = np.asarray(vektor_a, dtype=np.float32)
        v2 = np.asarray(vektor_b, dtype=np.float32)
        if v1.shape != v2.shape:
            return 0.0
        return float(np.dot(v1, v2))

    # Alias kompatibilitas bahasa Inggris
    is_available = apakah_siap
    align_face = ratakan_wajah
    extract_feature = ekstraksi_fitur_vektor
    compute_similarity = hitung_kemiripan_kosinus


# Alias kelas
ArcFaceEngine = MesinBiometrikArcFace


class SaluranPipaDeteksiWajah:
    """
    Penyedia layanan terpadu: Detektor Wajah YuNet + Ekstraktor Fitur ArcFace / SFace.
    """
    def __init__(
        self,
        jalur_arcface: Optional[str] = None,
        jalur_yunet: Optional[str] = None,
        jalur_sface: Optional[str] = None
    ):
        self.mesin_arcface = MesinBiometrikArcFace(jalur_arcface)

        # Inisialisasi Detektor Wajah YuNet (OpenCV C++ Native)
        yp = jalur_yunet or YUNET_ONNX_PATH
        self.detektor_yunet = None
        if os.path.exists(yp) and hasattr(cv2, "FaceDetectorYN"):
            try:
                self.detektor_yunet = cv2.FaceDetectorYN.create(
                    model=yp,
                    config="",
                    input_size=(320, 240),
                    score_threshold=0.38,
                    nms_threshold=0.30
                )
                print("[+] Detektor Wajah YuNet Siap!")
            except Exception as e:
                print(f"[!] Peringatan: Gagal memuat YuNet: {e}")

        # Inisialisasi Cadangan SFace (128-d)
        sp = jalur_sface or SFACE_ONNX_PATH
        self.pengenal_sface = None
        if os.path.exists(sp) and hasattr(cv2, "FaceRecognizerSF"):
            try:
                self.pengenal_sface = cv2.FaceRecognizerSF.create(model=sp, config="")
            except Exception:
                pass

    def apakah_siap(self) -> bool:
        return self.detektor_yunet is not None and (self.mesin_arcface.apakah_siap() or self.pengenal_sface is not None)

    def deteksi_dan_ekstraksi_wajah(
        self,
        frame: np.ndarray,
        lebar_inferensi: int = 400
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Mendeteksi seluruh wajah pada frame dan mengekstrak vektor fiturnya.
        
        Mengembalikan:
        --------------
        Daftar tuple: (data_kotak_dan_5_landmark, vektor_fitur_biometrik)
        """
        if self.detektor_yunet is None or frame is None:
            return []

        tinggi_asli, lebar_asli = frame.shape[:2]
        lebar_resize = min(lebar_asli, lebar_inferensi)
        tinggi_resize = int(lebar_resize * tinggi_asli / float(lebar_asli))
        citra_kecil = cv2.resize(frame, (lebar_resize, tinggi_resize))

        skala_x = lebar_asli / float(lebar_resize)
        skala_y = tinggi_asli / float(tinggi_resize)

        self.detektor_yunet.setInputSize((lebar_resize, tinggi_resize))
        _, wajah_terdeteksi = self.detektor_yunet.detect(citra_kecil)

        daftar_hasil = []
        if wajah_terdeteksi is None or len(wajah_terdeteksi) == 0:
            return daftar_hasil

        for wajah_mentah in wajah_terdeteksi:
            if float(wajah_mentah[-1]) < 0.38:
                continue

            wajah_skala = wajah_mentah.copy()
            wajah_skala[0] *= skala_x
            wajah_skala[1] *= skala_y
            wajah_skala[2] *= skala_x
            wajah_skala[3] *= skala_y
            for idx_titik in range(4, 14, 2):
                wajah_skala[idx_titik] *= skala_x
                wajah_skala[idx_titik + 1] *= skala_y

            vektor_fitur = None
            if self.mesin_arcface.apakah_siap():
                lima_titik = np.array([
                    [wajah_skala[4], wajah_skala[5]],
                    [wajah_skala[6], wajah_skala[7]],
                    [wajah_skala[8], wajah_skala[9]],
                    [wajah_skala[10], wajah_skala[11]],
                    [wajah_skala[12], wajah_skala[13]]
                ], dtype=np.float32)
                wajah_terkalibrasi = self.mesin_arcface.ratakan_wajah(frame, lima_titik)
                vektor_fitur = self.mesin_arcface.ekstraksi_fitur_vektor(wajah_terkalibrasi)

            if vektor_fitur is None and self.pengenal_sface is not None:
                wajah_terpotong = self.pengenal_sface.alignCrop(frame, wajah_skala)
                vektor_fitur = self.pengenal_sface.feature(wajah_terpotong).flatten()

            if vektor_fitur is not None:
                daftar_hasil.append((wajah_skala, vektor_fitur))

        return daftar_hasil

    # Alias kompatibilitas bahasa Inggris
    is_available = apakah_siap
    detect_and_extract = deteksi_dan_ekstraksi_wajah


# Alias kelas
FacePipeline = SaluranPipaDeteksiWajah
