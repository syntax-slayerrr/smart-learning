"""
AI Classroom Intelligence — YOLO26 Macro Person Detector
=========================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform
"""

import os
from typing import List, Tuple, Optional
import cv2
import numpy as np

from cv_engine.config import YOLO26_ONNX_PATH, YOLO26_ROOT_PATH


class YOLO26Detector:
    """
    Ultralytics YOLO26n ONNX Macro Person Detector.
    Features a native End-to-End One-to-One Head (100% NMS-Free, Eliminates Duplicate BBoxes / Ghost Tracks).
    Optimized for multi-threaded CPU inference via ONNX Runtime with AVX2 acceleration.
    """
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            for candidate in [YOLO26_ONNX_PATH, YOLO26_ROOT_PATH]:
                if os.path.exists(candidate):
                    model_path = candidate
                    break

        self.model_path = model_path
        self.session = None

        if model_path and os.path.exists(model_path):
            try:
                import onnxruntime as ort
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                self.session = ort.InferenceSession(model_path, opts, providers=['CPUExecutionProvider'])
                self.input_name = self.session.get_inputs()[0].name
                print(f"[+] YOLO26n ONNX Macro Detector Active ({os.path.basename(model_path)})!")
            except Exception as e:
                print(f"[!] Warning: Failed to initialize YOLO26n ONNX: {e}")

    def is_available(self) -> bool:
        return self.session is not None

    def detect_persons(
        self,
        frame: np.ndarray,
        conf_thresh: float = 0.35,
        imgsz: int = 320
    ) -> List[Tuple[int, int, int, int, float]]:
        """
        Run macro person detection.
        Returns: List of (x, y, w, h, confidence) in original frame pixel coordinates.
        """
        if self.session is None or frame is None:
            return []

        h, w = frame.shape[:2]
        small = cv2.resize(frame, (imgsz, imgsz))
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        chw = np.transpose(rgb, (2, 0, 1))[np.newaxis, ...]

        out = self.session.run(None, {self.input_name: chw})[0]
        preds = out[0].T  # Shape: (num_queries, 4 + num_classes)
        boxes = preds[:, :4]
        person_scores = preds[:, 4]

        mask = person_scores >= conf_thresh
        valid_boxes = boxes[mask]
        valid_scores = person_scores[mask]

        scale_x = w / float(imgsz)
        scale_y = h / float(imgsz)
        results = []

        for (cx_s, cy_s, bw_s, bh_s), score in zip(valid_boxes, valid_scores):
            x1 = max(0, int((cx_s - bw_s / 2.0) * scale_x))
            y1 = max(0, int((cy_s - bh_s / 2.0) * scale_y))
            bw = min(w - x1, int(bw_s * scale_x))
            bh = min(h - y1, int(bh_s * scale_y))

            if bw > 30 and bh > 40:
                results.append((x1, y1, bw, bh, float(score)))

        return results
