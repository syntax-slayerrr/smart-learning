"""
AI Classroom Intelligence — ArcFace 512-d Biometric Engine & Face Pipeline
==========================================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform
"""

import os
from typing import Optional, Tuple, Any, List
import cv2
import numpy as np

from cv_engine.config import ARCFACE_MBF_PATH, YUNET_ONNX_PATH, SFACE_ONNX_PATH


class ArcFaceEngine:
    """
    InsightFace ArcFace 512-dimension Deep Feature Extractor (MobileFaceNet ONNX).
    Industry standard in Asian EduAI (SenseTime/Megvii) for robust student identity recognition.
    Extracts L2-normalized 512-dimensional embeddings via 5-point affine facial alignment.
    """
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            model_path = ARCFACE_MBF_PATH
        self.model_path = model_path
        self.session = None

        # Standard InsightFace 112x112 5-point reference landmarks
        self.ref_pts = np.array([
            [38.2946, 51.6963],  # Left eye
            [73.5318, 51.5014],  # Right eye
            [56.0252, 71.7366],  # Nose tip
            [41.5493, 92.3655],  # Left mouth corner
            [70.7299, 92.2041]   # Right mouth corner
        ], dtype=np.float32)

        if os.path.exists(model_path):
            try:
                import onnxruntime as ort
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                self.session = ort.InferenceSession(model_path, opts, providers=['CPUExecutionProvider'])
                self.input_name = self.session.get_inputs()[0].name
                self.output_name = self.session.get_outputs()[0].name
                print(f"[+] ArcFace 512-d Biometric Engine (InsightFace w600k_mbf) Active!")
            except Exception as e:
                print(f"[!] Warning: Failed to initialize ArcFace: {e}")

    def is_available(self) -> bool:
        return self.session is not None

    def align_face(self, img: np.ndarray, landmarks_5: np.ndarray) -> Optional[np.ndarray]:
        """
        Warps and aligns facial region to canonical 112x112 coordinate space using similarity transform.
        """
        try:
            tform, _ = cv2.estimateAffinePartial2D(landmarks_5, self.ref_pts)
            if tform is None:
                return None
            return cv2.warpAffine(img, tform, (112, 112), borderValue=0.0)
        except Exception:
            return None

    def extract_feature(self, aligned_bgr: Optional[np.ndarray]) -> Optional[np.ndarray]:
        """
        Extracts L2-normalized 512-d embedding vector.
        """
        if self.session is None or aligned_bgr is None:
            return None
        try:
            rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
            norm = (rgb - 127.5) / 128.0
            chw = np.transpose(norm, (2, 0, 1))[np.newaxis, ...]
            feat = self.session.run([self.output_name], {self.input_name: chw})[0][0]
            norm_val = np.linalg.norm(feat)
            if norm_val > 1e-6:
                feat = feat / norm_val
            return feat
        except Exception:
            return None

    @staticmethod
    def compute_similarity(feat1: Any, feat2: Any) -> float:
        """
        Cosine similarity between two biometric feature vectors (range -1.0 to 1.0).
        """
        if feat1 is None or feat2 is None:
            return 0.0
        f1 = np.asarray(feat1, dtype=np.float32)
        f2 = np.asarray(feat2, dtype=np.float32)
        if f1.shape != f2.shape:
            return 0.0
        return float(np.dot(f1, f2))


class FacePipeline:
    """
    Orchestrates YuNet Face Detector + ArcFace / SFace Feature Extractor.
    """
    def __init__(
        self,
        arcface_path: Optional[str] = None,
        yunet_path: Optional[str] = None,
        sface_path: Optional[str] = None
    ):
        self.arcface = ArcFaceEngine(arcface_path)

        # YuNet Face Detector
        yp = yunet_path or YUNET_ONNX_PATH
        self.yunet = None
        if os.path.exists(yp) and hasattr(cv2, "FaceDetectorYN"):
            try:
                self.yunet = cv2.FaceDetectorYN.create(
                    model=yp,
                    config="",
                    input_size=(320, 240),
                    score_threshold=0.38,
                    nms_threshold=0.30
                )
                print("[+] Face Detector: YuNet Facial Landmark Detector Ready!")
            except Exception as e:
                print(f"[!] Warning: Failed to initialize YuNet: {e}")

        # Fallback SFace Recognizer
        sp = sface_path or SFACE_ONNX_PATH
        self.sface = None
        if os.path.exists(sp) and hasattr(cv2, "FaceRecognizerSF"):
            try:
                self.sface = cv2.FaceRecognizerSF.create(model=sp, config="")
            except Exception:
                pass

    def is_available(self) -> bool:
        return self.yunet is not None and (self.arcface.is_available() or self.sface is not None)

    def detect_and_extract(
        self,
        frame: np.ndarray,
        infer_width: int = 400
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Detects faces in frame and extracts biometric feature vectors.
        Returns: List of tuples (detected_face_rect_and_landmarks, feature_vector).
        """
        if self.yunet is None or frame is None:
            return []

        h, w = frame.shape[:2]
        fw_infer = min(w, infer_width)
        fh_infer = int(fw_infer * h / float(w))
        small_f = cv2.resize(frame, (fw_infer, fh_infer))
        scale_x = w / float(fw_infer)
        scale_y = h / float(fh_infer)

        self.yunet.setInputSize((fw_infer, fh_infer))
        _, d_faces = self.yunet.detect(small_f)

        results = []
        if d_faces is None or len(d_faces) == 0:
            return results

        for rf in d_faces:
            if float(rf[-1]) < 0.38:
                continue

            sf = rf.copy()
            sf[0] *= scale_x
            sf[1] *= scale_y
            sf[2] *= scale_x
            sf[3] *= scale_y
            for lk in range(4, 14, 2):
                sf[lk] *= scale_x
                sf[lk + 1] *= scale_y

            feat = None
            if self.arcface.is_available():
                lms5 = np.array([
                    [sf[4], sf[5]],
                    [sf[6], sf[7]],
                    [sf[8], sf[9]],
                    [sf[10], sf[11]],
                    [sf[12], sf[13]]
                ], dtype=np.float32)
                aligned_face = self.arcface.align_face(frame, lms5)
                feat = self.arcface.extract_feature(aligned_face)

            if feat is None and self.sface is not None:
                aligned_face = self.sface.alignCrop(frame, sf)
                feat = self.sface.feature(aligned_face).flatten()

            if feat is not None:
                results.append((sf, feat))

        return results
