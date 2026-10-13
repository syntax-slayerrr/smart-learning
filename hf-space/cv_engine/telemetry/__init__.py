"""
AI Classroom Intelligence — Subsistem Telemetri & Cloud 
=====================================================================
Syntax Slayer — Smart Learning Platform
"""

from cv_engine.telemetry.schemas import (
    MuatanTelemetri,
    TelemetryPayload,
    SubjekTerlacak,
    TrackedSubject,
    RingkasanKelas,
    ClassroomSummary,
    serialisasi_json_khusus,
    default_json_serializer
)
from cv_engine.telemetry.gallery import ManajerGaleriWajah, FaceGalleryManager
from cv_engine.telemetry.dispatcher import PengirimTelemetriAsinkron, TelemetryDispatcher

__all__ = [
    # Terminologi Bahasa Indonesia
    "MuatanTelemetri",
    "SubjekTerlacak",
    "RingkasanKelas",
    "serialisasi_json_khusus",
    "ManajerGaleriWajah",
    "PengirimTelemetriAsinkron",
    # Alias Kompatibilitas
    "TelemetryPayload",
    "TrackedSubject",
    "ClassroomSummary",
    "default_json_serializer",
    "FaceGalleryManager",
    "TelemetryDispatcher"
]
