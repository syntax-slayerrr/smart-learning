"""
AI Classroom Intelligence — Engine Configuration & Constants
============================================================
Syntax Slayer — Smart Learning Platform
"""

import os
from dataclasses import dataclass, field
from typing import Optional, List, Tuple


# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))

# Model asset paths
YOLO26_ONNX_PATH = os.path.join(BASE_DIR, "yolo26n.onnx")
YOLO26_ROOT_PATH = os.path.join(PROJECT_ROOT, "yolo26n.onnx")

POSE_HEAVY_TASK_PATH = os.path.join(BASE_DIR, "pose_landmarker_heavy.task")
POSE_LITE_TASK_PATH = os.path.join(BASE_DIR, "pose_landmarker_lite.task")

ARCFACE_MBF_PATH = os.path.join(BASE_DIR, "insightface_models", "w600k_mbf.onnx")
YUNET_ONNX_PATH = os.path.join(BASE_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_ONNX_PATH = os.path.join(BASE_DIR, "face_recognition_sface_2021dec.onnx")

FACE_GALLERY_PATH = os.path.join(BASE_DIR, "students_face_gallery.json")

# Color Palette (BGR for OpenCV) - Calibrated Cyberpunk & EduAI Theme
COLOR_EMERALD = (70, 205, 95)    # Attentive / Normal
COLOR_CYAN    = (235, 205, 50)   # Body skeleton lines
COLOR_SKY     = (235, 140, 20)   # Desk writing / Typing
COLOR_BLUE    = (255, 175, 45)   # Standing / Mobility
COLOR_AMBER   = (25, 165, 255)   # Hand raise interaction
COLOR_RED     = (50, 50, 245)    # Sleep / Inattention alert
COLOR_DARK    = (18, 20, 24)     # Semi-transparent HUD background
COLOR_WHITE   = (245, 245, 245)  # Text and high-contrast lines
COLOR_PURPLE  = (220, 90, 180)  # Secondary indicators

# Pose Skeleton Joint Connectivity (MediaPipe 33-point Topology)
POSE_CONNECTIONS = [
    # Arms: Left Shoulder -> Elbow -> Wrist
    (11, 13), (13, 15),
    # Arms: Right Shoulder -> Elbow -> Wrist
    (12, 14), (14, 16),
    # Clavicle / Shoulders: Left Shoulder <-> Right Shoulder
    (11, 12),
    # Torso: Shoulders to Hips
    (11, 23), (12, 24),
    (23, 24),
    # Head & Neck
    (0, 1), (1, 2), (2, 3), (3, 7),  # Left Eye & Ear
    (0, 4), (4, 5), (5, 6), (6, 8),  # Right Eye & Ear
    (9, 10),                         # Mouth
    (0, 11), (0, 12)                 # Neck Links
]

# 5 Enterprise Guardrail Thresholds
GUARDRAIL_ELBOW_ANGLE_THRESH = 105.0       # Minimum elbow angle (deg) for intentional hand raise
GUARDRAIL_FACE_DIST_THRESH = 0.07          # Minimum distance to head center (eliminates scratching head)
GUARDRAIL_HAND_HOLD_GATE_SEC = 0.7         # Continuous hold time before triggering hand raise
GUARDRAIL_HAND_LATCH_HYSTERESIS_SEC = 0.7  # Smooth off transition
GUARDRAIL_WRIST_MOTION_WRITING = 0.015     # Velocity threshold for desk writing
GUARDRAIL_WRIST_MOTION_STILL = 0.010       # Velocity threshold below which is classified as still/sleep
GUARDRAIL_SLEEP_HOLD_SEC = 3.5             # Continuous duration with dropped head & still hands for sleep
GUARDRAIL_EMA_ALPHA = 0.22                 # Exponential Moving Average factor (0.22 new + 0.78 old)
GUARDRAIL_LOST_TRACK_GRACE_SEC = 4.0       # Seat-anchored Re-ID retention period
GUARDRAIL_ARCFACE_MATCH_VOTES = 2          # Temporal identity votes required to lock student name to seat


@dataclass
class EngineConfig:
    source: str = "http://10.10.10.33:8080/video"
    port: int = 5000
    interval: int = 2
    session_id: str = "00000000-0000-0000-0000-000000000001"
    api_url: str = "http://127.0.0.1:3000/api/telemetry/ingest"
    cloud_url: str = "https://smart-learning-black.vercel.app/api/telemetry/ingest"
    device_key: str = "dev-edge-secret-key-2026"
    rotate: str = "auto"
    flip_h: bool = False
    headless: bool = True
    target_fps: int = 30
    yolo_conf_thresh: float = 0.35
    yolo_imgsz: int = 320
    face_sim_thresh: float = 0.38
