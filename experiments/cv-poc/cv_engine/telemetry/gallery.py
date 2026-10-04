"""
AI Classroom Intelligence — Student Face Gallery & Identity Biometrics
======================================================================
Developer 2: Telemetry, Contracts & Cloud Integration Lead
Syntax Slayer — Smart Learning Platform
"""

import json
import os
import threading
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from cv_engine.config import FACE_GALLERY_PATH
from cv_engine.core.face import ArcFaceEngine


class FaceGalleryManager:
    """
    Thread-safe student face gallery storage and cosine biometric search.
    Maps enrolled student names to 512-d (ArcFace) or 128-d (SFace) feature vectors.
    """
    def __init__(self, gallery_file: str = FACE_GALLERY_PATH):
        self.gallery_file = gallery_file
        self.gallery: Dict[str, List[float]] = {}
        self.lock = threading.Lock()
        self.pending_name: Optional[str] = None
        self.trigger_event = threading.Event()
        self.load()

    def load(self) -> None:
        if os.path.exists(self.gallery_file):
            try:
                with open(self.gallery_file, "r") as f:
                    self.gallery = json.load(f)
                print(f"[+] Face Recognition: Loaded {len(self.gallery)} student profiles from gallery.")
            except Exception as e:
                print(f"[!] Warning: Failed to load face gallery: {e}")
                self.gallery = {}
        else:
            self.gallery = {}

    def save(self) -> bool:
        try:
            with open(self.gallery_file, "w") as f:
                json.dump(self.gallery, f, indent=2)
            return True
        except Exception as e:
            print(f"[!] Error saving face gallery: {e}")
            return False

    def register_face(self, name: str, embedding: Any) -> bool:
        with self.lock:
            emb_list = embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
            self.gallery[name] = emb_list
            success = self.save()
            if success:
                print(f"[+] Enrolled face biometrics for: {name} (Dim: {len(emb_list)})")
            return success

    def trigger_registration(self, name: str) -> None:
        with self.lock:
            self.pending_name = name
            self.trigger_event.set()

    def get_pending_name(self) -> Optional[str]:
        with self.lock:
            return self.pending_name

    def clear_trigger(self) -> None:
        with self.lock:
            self.pending_name = None
            self.trigger_event.clear()

    def find_match(self, query_feat: np.ndarray, thresh: float = 0.38) -> Tuple[Optional[str], float]:
        """
        Cosine similarity search against all registered student profiles.
        """
        best_name = None
        best_sim = thresh

        with self.lock:
            for sname, g_emb in self.gallery.items():
                if len(g_emb) == len(query_feat):
                    sim = ArcFaceEngine.compute_similarity(query_feat, g_emb)
                    if sim > best_sim:
                        best_sim = sim
                        best_name = sname

        return best_name, best_sim

    def get_registered_students(self) -> List[str]:
        with self.lock:
            return list(self.gallery.keys())
