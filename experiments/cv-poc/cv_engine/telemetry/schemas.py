"""
AI Classroom Intelligence — Kontrak Data Telemetri & Skema 
========================================================================
Syntax Slayer — Smart Learning Platform

Modul ini mendefinisikan struktur data strongly-typed untuk payload JSON
yang dikirimkan secara berkala ke API Ingest Next.js dan Supabase Cloud.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import numpy as np


def serialisasi_json_khusus(objek: Any) -> Any:
    """
    Serialisasi tipe data primitif khusus NumPy (int64, float32, ndarray)
    menjadi tipe standar Python yang dapat di-encode ke JSON secara aman.
    
    Analisis Algoritma:
    -------------------
    - Kompleksitas Waktu: O(1) untuk skalar, O(K) untuk array berdimensi K.
    - Menghindari TypeError: Object of type int64/float32 is not JSON serializable.
    """
    if isinstance(objek, (np.integer, int)):
        return int(objek)
    if isinstance(objek, (np.floating, float)):
        return float(objek)
    if isinstance(objek, np.ndarray):
        return objek.tolist()
    return str(objek)


# Alias kompatibilitas
default_json_serializer = serialisasi_json_khusus


@dataclass
class RingkasanKelas:
    """
    Struktur data ringkasan statistik agregat kelas saat ini.
    """
    total: int = 0
    sitting: int = 0
    standing: int = 0
    hands_raised: int = 0
    desk_focused: int = 0
    sleep_detected: int = 0
    active_clusters: int = 0
    teacher_zone: str = "zone-front"


# Alias kompatibilitas
ClassroomSummary = RingkasanKelas


@dataclass
class SubjekTerlacak:
    """
    Struktur data entitas individual seorang siswa/guru dalam ruang kelas.
    """
    id: str
    anonymous_id: str
    label: str
    student_name: str
    is_recognized: bool
    posture: str
    activity: str
    action_text: str
    confidence: float
    hand_raised: bool
    sleep: bool
    head_tilt_deg: float
    gaze_direction: str
    attention_score: int
    box: List[int]


# Alias kompatibilitas
TrackedSubject = SubjekTerlacak


@dataclass
class MuatanTelemetri:
    """
    Payload utama data time-series yang di-POST setiap interval waktu ke backend.
    """
    session_id: str
    timestamp: str
    frame_id: int
    summary: Dict[str, Any]
    anonymized_tracks: List[Dict[str, Any]]

    def konversi_ke_dict(self) -> Dict[str, Any]:
        return asdict(self)

    # Alias kompatibilitas
    to_dict = konversi_ke_dict


# Alias kompatibilitas
TelemetryPayload = MuatanTelemetri
