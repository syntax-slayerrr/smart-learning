"""
AI Classroom Intelligence — Telemetry Data Contracts & Schemas
==============================================================
Developer 2: Telemetry, Contracts & Cloud Integration Lead
Syntax Slayer — Smart Learning Platform
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import numpy as np


def default_json_serializer(obj: Any) -> Any:
    """
    JSON serializer for NumPy primitives and non-standard objects.
    """
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


@dataclass
class ClassroomSummary:
    total: int = 0
    sitting: int = 0
    standing: int = 0
    hands_raised: int = 0
    desk_focused: int = 0
    sleep_detected: int = 0
    active_clusters: int = 0
    teacher_zone: str = "zone-front"


@dataclass
class TrackedSubject:
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


@dataclass
class TelemetryPayload:
    session_id: str
    timestamp: str
    frame_id: int
    summary: Dict[str, Any]
    anonymized_tracks: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
