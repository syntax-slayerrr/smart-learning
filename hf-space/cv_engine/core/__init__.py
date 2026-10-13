"""
AI Classroom Intelligence — Subsistem Vision & AI Core 
====================================================================
Syntax Slayer — Smart Learning Platform
"""

from cv_engine.core.detector import DetektorYOLO26, YOLO26Detector
from cv_engine.core.pose import DetektorPoseMediaPipe, MediaPipePoseDetector
from cv_engine.core.face import (
    MesinBiometrikArcFace,
    ArcFaceEngine,
    SaluranPipaDeteksiWajah,
    FacePipeline
)
from cv_engine.core.tracker import PelacakSubjekKelas, SubjectTracker
from cv_engine.core.kinematics import (
    hitung_sudut_tiga_titik,
    calculate_angle_3pts,
    saring_pose_tumpang_tindih,
    filter_overlapping_poses,
    saring_kandidat_spasial,
    filter_spatial_candidates
)

__all__ = [
    # Terminologi Bahasa Indonesia
    "DetektorYOLO26",
    "DetektorPoseMediaPipe",
    "MesinBiometrikArcFace",
    "SaluranPipaDeteksiWajah",
    "PelacakSubjekKelas",
    "hitung_sudut_tiga_titik",
    "saring_pose_tumpang_tindih",
    "saring_kandidat_spasial",
    # Alias Kompatibilitas
    "YOLO26Detector",
    "MediaPipePoseDetector",
    "ArcFaceEngine",
    "FacePipeline",
    "SubjectTracker",
    "calculate_angle_3pts",
    "filter_overlapping_poses",
    "filter_spatial_candidates"
]
