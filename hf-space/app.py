"""
AI Classroom Intelligence — Hugging Face Spaces Live Interactive Demo
======================================================================
Team: SYNTAX SLAYER (Smart Learning Platform)
Edge Computer Vision Engine with 5 Enterprise Guardrails
"""

import os
import sys
import time
from typing import Tuple, Dict, Any
import cv2
import numpy as np
import gradio as gr
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure current folder is in path for cv_engine
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from cv_engine.core.pose import DetektorPoseMediaPipe
from cv_engine.core.kinematics import hitung_sudut_tiga_titik, saring_pose_tumpang_tindih
from cv_engine.core.tracker import PelacakSubjekKelas
from cv_engine.telemetry.gallery import ManajerGaleriWajah
from cv_engine.streaming.hud import gambar_kerangka_neon, gambar_kotak_cerdas

# Initialize AI models once in memory
print("[+] Initializing MediaPipe Pose & Gallery on Space...")
pose_detector = DetektorPoseMediaPipe()
gallery_manager = ManajerGaleriWajah()
tracker = PelacakSubjekKelas()

# Cached telemetry state for API endpoints
latest_telemetry_cache: Dict[str, Any] = {
    "status": "online",
    "engine": "SYNTAX_SLAYER_HF_SPACE_V4",
    "detected_students_count": 0,
    "sitting_count": 0,
    "standing_count": 0,
    "hand_raise_count": 0,
    "sleep_detected_count": 0,
    "desk_focused_count": 0,
    "focus_index": 100.0,
    "timestamp": time.time(),
}


def process_classroom_frame(
    input_image: np.ndarray,
    elbow_threshold: float = 105.0,
    hand_dist_threshold: float = 0.07,
) -> Tuple[np.ndarray, str, str, str, str, str]:
    """
    Menjalankan pipeline analisis visual kelas lengkap pada sebuah frame/foto.
    """
    global latest_telemetry_cache
    if input_image is None:
        return None, "0", "0", "0", "0", "100%"

    # Konversi RGB (Gradio) ke BGR (OpenCV)
    frame_bgr = cv2.cvtColor(input_image, cv2.COLOR_RGB2BGR)
    h, w = frame_bgr.shape[:2]

    # 1. Inferensi Kerangka Anatomi 3D MediaPipe
    poses = []
    if pose_detector.apakah_siap():
        poses = pose_detector.deteksi_kerangka_anatomi(frame_bgr, lebar_inferensi_target=max(360, min(w, 640)))

    # Saring pose duplikat
    poses_valid = saring_pose_tumpang_tindih(poses, ambang_jarak_bahu=0.08)

    # 2. Pelacakan & Ekstraksi Status Siswa
    subjek_terlacak = tracker.perbarui_keadaan(
        kotak_yolo=[],
        pose_mediapipe=poses_valid,
        vektor_biometrik=[],
        frame_terkini=frame_bgr
    )

    # Render Visualisasi HUD
    annotated = frame_bgr.copy()
    if poses_valid:
        annotated = gambar_kerangka_neon(annotated, poses_valid)

    total_siswa = len(subjek_terlacak)
    duduk = sum(1 for s in subjek_terlacak if getattr(s, "status_postur", "") == "Duduk")
    berdiri = sum(1 for s in subjek_terlacak if getattr(s, "status_postur", "") == "Berdiri")
    angkat_tangan = sum(1 for s in subjek_terlacak if getattr(s, "apakah_angkat_tangan", False))
    mengantuk = sum(1 for s in subjek_terlacak if getattr(s, "apakah_tertidur", False))
    menulis = sum(1 for s in subjek_terlacak if getattr(s, "status_interaksi", "") == "Menulis")

    # Hitung Focus Index
    if total_siswa > 0:
        skor_fokus = max(0, min(100, int(100 - (mengantuk * 35) + (angkat_tangan * 10))))
    else:
        skor_fokus = 100

    # Gambar bounding box untuk setiap subjek
    for s in subjek_terlacak:
        annotated = gambar_kotak_cerdas(annotated, s)

    # Perbarui Cache Telemetri
    latest_telemetry_cache = {
        "status": "online",
        "engine": "SYNTAX_SLAYER_HF_SPACE_V4",
        "detected_students_count": total_siswa,
        "sitting_count": duduk,
        "standing_count": berdiri,
        "hand_raise_count": angkat_tangan,
        "sleep_detected_count": mengantuk,
        "desk_focused_count": menulis,
        "focus_index": skor_fokus,
        "timestamp": time.time(),
    }

    # Konversi kembali ke RGB untuk Gradio
    output_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)

    return (
        output_rgb,
        str(total_siswa),
        str(duduk),
        str(berdiri),
        str(angkat_tangan),
        f"{skor_fokus}%"
    )


# ==============================================================================
# GRADIO INTERFACE BUILDER
# ==============================================================================
with gr.Blocks(title="Syntax Slayer — AI Classroom Vision Engine") as demo:
    gr.Markdown(
        """
        # 🎓 AI Classroom Intelligence — Edge CV Telemetry Engine
        ### Tim: **SYNTAX SLAYER (Smart Learning Platform)**
        *Didukung MediaPipe 3D Keypoints, ArcFace Biometrics, dan 5 Enterprise Guardrails.*
        """
    )

    with gr.Tab("📷 Uji Coba Analisis Visual Kelas"):
        with gr.Row():
            with gr.Column(scale=3):
                input_image = gr.Image(
                    label="Unggah Foto Ruang Kelas / Ambil Foto Kamera",
                    type="numpy"
                )
                with gr.Accordion("⚙️ Parameter Kinematika Guardrails", open=False):
                    elbow_slider = gr.Slider(
                        minimum=90.0, maximum=140.0, value=105.0, step=1.0,
                        label="Ambang Batas Sudut Siku (Elbow Kinematics Threshold - Derajat)"
                    )
                    hand_dist_slider = gr.Slider(
                        minimum=0.03, maximum=0.15, value=0.07, step=0.01,
                        label="Ambang Jarak Tangan ke Wajah (Face Distance Gate)"
                    )
                run_btn = gr.Button("🚀 Jalankan Analisis AI Engine", variant="primary")

            with gr.Column(scale=4):
                output_image = gr.Image(label="Hasil Deteksi Cyber-HUD & Neon Skeleton", type="numpy")
                with gr.Row():
                    m_total = gr.Textbox(label="Siswa Terdeteksi", value="0")
                    m_duduk = gr.Textbox(label="Duduk", value="0")
                    m_berdiri = gr.Textbox(label="Berdiri", value="0")
                    m_angkat = gr.Textbox(label="Angkat Tangan", value="0")
                    m_fokus = gr.Textbox(label="Skor Fokus Kelas", value="100%")

        run_btn.click(
            fn=process_classroom_frame,
            inputs=[input_image, elbow_slider, hand_dist_slider],
            outputs=[output_image, m_total, m_duduk, m_berdiri, m_angkat, m_fokus]
        )

    with gr.Tab("🏛️ Penjelasan 5 Enterprise Guardrails"):
        gr.Markdown(
            r"""
            ### 🛡️ 5 Enterprise Guardrails Matematika & Kinematika:
            1. **Guardrail 1: Kinematika Sudut Siku (Elbow Kinematics $\ge 105^\circ$)**
               * Filter perkalian titik vektor *(Vector Dot Product)* mengukur sudut siku tangan. Mencegah gestur garuk kepala atau membetulkan kacamata salah divonis angkat tangan.
            2. **Guardrail 2: Verifikator Energi Kinetik Tangan (Writing vs Sleeping)**
               * Menghitung turunan numerik kecepatan pergelangan tangan pada sliding window ring buffer ($v = \\Delta d / \\Delta t$). Siswa yang tekun menulis dilarang divonis tertidur.
            3. **Guardrail 3: Buffer Voting Identitas Temporal (ArcFace Re-ID)**
               * Menuntut minimal 2 kecocokan wajah berturut-turut sebelum mengunci nama siswa pada kursi.
            4. **Guardrail 4: One Euro Adaptive Cutoff Filter**
               * Mereduksi getaran bounding box hingga >95% saat siswa duduk tenang tanpa menimbulkan lag saat bergerak cepat.
            5. **Guardrail 5: Seat-Anchored Re-ID Grace Period**
               * Toleransi waktu 4 detik saat siswa tertutup sementara oleh guru yang lewat di depan kamera.
            """
        )

# ==============================================================================
# FASTAPI BACKEND MOUNT (Memungkinkan HF Space Bertindak Sebagai REST API)
# ==============================================================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/status")
def get_status():
    return JSONResponse(latest_telemetry_cache)


@app.get("/api/telemetry/latest")
def get_latest_telemetry():
    return JSONResponse({
        "success": True,
        "source": "huggingface-space",
        "latest": latest_telemetry_cache
    })


# Mount Gradio app to FastAPI root
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
