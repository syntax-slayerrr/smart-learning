"""
AI Classroom Intelligence — MediaPipe 33-Keypoint 3D Pose Detector
===================================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform
"""

import os
from typing import List, Any, Optional
import cv2
import numpy as np

from cv_engine.config import POSE_HEAVY_TASK_PATH, POSE_LITE_TASK_PATH


class MediaPipePoseDetector:
    """
    Google Research MediaPipe BlazePose 33-Keypoint 3D Anatomical Landmarker.
    Uses the Heavy model (pose_landmarker_heavy.task) for maximum joint coordinate fidelity.
    Automatically falls back to Lite model if Heavy is unavailable.
    """
    def __init__(self, model_path: Optional[str] = None):
        self.detector = None
        self.mp = None
        self.model_path = model_path

        if self.model_path is None:
            if os.path.exists(POSE_HEAVY_TASK_PATH):
                self.model_path = POSE_HEAVY_TASK_PATH
            elif os.path.exists(POSE_LITE_TASK_PATH):
                self.model_path = POSE_LITE_TASK_PATH

        if self.model_path and os.path.exists(self.model_path):
            try:
                import mediapipe as mp
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision as mp_vision
                self.mp = mp

                base_opts = mp_python.BaseOptions(model_asset_path=self.model_path)
                pose_opts = mp_vision.PoseLandmarkerOptions(
                    base_options=base_opts,
                    running_mode=mp_vision.RunningMode.IMAGE,
                    num_poses=4,
                    min_pose_detection_confidence=0.35,
                    min_pose_presence_confidence=0.35,
                    min_tracking_confidence=0.35
                )
                self.detector = mp_vision.PoseLandmarker.create_from_options(pose_opts)
                print(f"[+] Deep Learning Pose: MediaPipe ({os.path.basename(self.model_path)}) 33-Keypoint Engine Active!")
            except Exception as e:
                print(f"[!] Warning: Failed to initialize MediaPipe Pose: {e}")
                self.detector = None

    def is_available(self) -> bool:
        return self.detector is not None

    def detect_poses(self, frame: np.ndarray, infer_width: int = 360) -> List[Any]:
        """
        Runs anatomical pose detection on downsampled frame for CPU efficiency.
        Returns: List of landmark collections (each with 33 normalized points).
        """
        if self.detector is None or frame is None:
            return []

        h, w = frame.shape[:2]
        ai_w = infer_width
        ai_h = int(ai_w * h / float(w))
        small = cv2.resize(frame, (ai_w, ai_h))
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

        try:
            mp_img = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb)
            result = self.detector.detect(mp_img)
            if result and result.pose_landmarks:
                return result.pose_landmarks
        except Exception:
            pass

        return []
