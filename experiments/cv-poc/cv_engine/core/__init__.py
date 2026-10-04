"""
AI Classroom Intelligence — Core AI Vision Subsystem
====================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform
"""

from cv_engine.core.detector import YOLO26Detector
from cv_engine.core.pose import MediaPipePoseDetector
from cv_engine.core.face import ArcFaceEngine, FacePipeline
from cv_engine.core.tracker import SubjectTracker
from cv_engine.core.kinematics import calculate_angle_3pts, filter_overlapping_poses

__all__ = [
    "YOLO26Detector",
    "MediaPipePoseDetector",
    "ArcFaceEngine",
    "FacePipeline",
    "SubjectTracker",
    "calculate_angle_3pts",
    "filter_overlapping_poses"
]
