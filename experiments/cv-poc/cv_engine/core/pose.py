"""
AI Classroom Intelligence — Detektor Pose Anatomi 3D MediaPipe
===============================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform

Modul ini mengelola deteksi 33 titik sendi anatomi tubuh manusia (BlazePose 3D)
menggunakan model Heavy untuk akurasi maksimal dalam analisis kinematika.
"""

import os
os.environ['GLOG_minloglevel'] = '2'  # Meredam spam C++ logging framework
from typing import List, Any, Optional
import cv2
import numpy as np

from cv_engine.config import POSE_HEAVY_TASK_PATH, POSE_LITE_TASK_PATH


class DetektorPoseMediaPipe:
    """
    Detektor Pose Anatomi 33-Keypoints berbasis Google MediaPipe Tasks API.
    
    Analisis Struktur Data & Algoritma:
    ----------------------------------
    - Struktur Data Keluaran: Graf Topologi Anatomi dengan 33 titik vertex (x, y, z, visibilitas).
    - Algoritma: Regresi Koordinat Landmark 3D Berbobot XNNPACK.
    - Kompleksitas Waktu: O(P * K) di mana P adalah jumlah pose (maksimal 4) dan K=33 titik sendi.
    - Kompleksitas Ruang: O(K) representasi memori ringan untuk koordinat sendi.
    """
    def __init__(self, jalur_model: Optional[str] = None):
        self.detector = None
        self.mp = None
        self.jalur_model = jalur_model

        if self.jalur_model is None:
            if os.path.exists(POSE_HEAVY_TASK_PATH):
                self.jalur_model = POSE_HEAVY_TASK_PATH
            elif os.path.exists(POSE_LITE_TASK_PATH):
                self.jalur_model = POSE_LITE_TASK_PATH

        if self.jalur_model and os.path.exists(self.jalur_model):
            try:
                import mediapipe as mp
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision as mp_vision
                self.mp = mp

                opsi_dasar = mp_python.BaseOptions(model_asset_path=self.jalur_model)
                opsi_pose = mp_vision.PoseLandmarkerOptions(
                    base_options=opsi_dasar,
                    running_mode=mp_vision.RunningMode.IMAGE,
                    num_poses=8,
                    min_pose_detection_confidence=0.25,
                    min_pose_presence_confidence=0.25,
                    min_tracking_confidence=0.25
                )
                self.detector = mp_vision.PoseLandmarker.create_from_options(opsi_pose)
                print(f"[+] MediaPipe Pose ({os.path.basename(self.jalur_model)}) 33-Keypoints Aktif!")
            except Exception as e:
                print(f"[!] Peringatan: Gagal memuat MediaPipe Pose: {e}")
                self.detector = None

    def apakah_siap(self) -> bool:
        """Memeriksa apakah detektor MediaPipe siap digunakan."""
        return self.detector is not None

    def deteksi_kerangka_anatomi(self, frame: np.ndarray, lebar_inferensi_target: int = 540) -> List[Any]:
        """
        Mendeteksi kerangka sendi tubuh pada citra yang di-downsample agar ringan di CPU.
        
        Mengembalikan:
        --------------
        Daftar kumpulan landmark (masing-masing memuat 33 titik sendi ternormalisasi).
        """
        if self.detector is None or frame is None:
            return []

        tinggi_asli, lebar_asli = frame.shape[:2]
        lebar_inferensi = lebar_inferensi_target
        tinggi_inferensi = int(lebar_inferensi * tinggi_asli / float(lebar_asli))

        citra_kecil = cv2.resize(frame, (lebar_inferensi, tinggi_inferensi))
        citra_rgb = cv2.cvtColor(citra_kecil, cv2.COLOR_BGR2RGB)

        try:
            gambar_mediapipe = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=citra_rgb)
            hasil_inferensi = self.detector.detect(gambar_mediapipe)
            if hasil_inferensi and hasil_inferensi.pose_landmarks:
                return hasil_inferensi.pose_landmarks
        except Exception:
            pass

        return []

    # Alias kompatibilitas bahasa Inggris
    is_available = apakah_siap
    detect_poses = deteksi_kerangka_anatomi


# Alias kelas
MediaPipePoseDetector = DetektorPoseMediaPipe
