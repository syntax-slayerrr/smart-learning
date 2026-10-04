"""
AI Classroom Intelligence — HUD Renderer & Anatomical Visualizer
================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform
"""

from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np

from cv_engine.config import (
    COLOR_CYAN,
    COLOR_WHITE,
    COLOR_AMBER,
    COLOR_RED,
    COLOR_DARK,
    COLOR_EMERALD,
    POSE_CONNECTIONS
)


def apply_orientation(frame: np.ndarray, rotation: str = "auto", flip_h: bool = False) -> np.ndarray:
    """
    Applies 90/180/270/auto rotation and horizontal flip to input frame.
    """
    if frame is None:
        return frame

    if rotation == "90":
        out = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
    elif rotation == "180":
        out = cv2.rotate(frame, cv2.ROTATE_180)
    elif rotation == "270":
        out = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif rotation == "auto":
        if frame.shape[1] > frame.shape[0]:
            out = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        else:
            out = frame
    else:
        out = frame

    if flip_h:
        out = cv2.flip(out, 1)

    return out


def draw_neon_skeleton(
    frame: np.ndarray,
    landmarks: List[Any],
    color: Tuple[int, int, int] = COLOR_CYAN,
    hand_raised: bool = False,
    is_sleep: bool = False
) -> None:
    """
    Renders high-visibility glowing anatomical skeleton ala SenseTime / Megvii Smart Surveillance.
    Raised arm automatically glows in vibrant amber/gold.
    """
    h, w = frame.shape[:2]

    # Draw Bone Connections (Layered Glow Effect)
    for p1_idx, p2_idx in POSE_CONNECTIONS:
        if p1_idx < len(landmarks) and p2_idx < len(landmarks):
            p1 = landmarks[p1_idx]
            p2 = landmarks[p2_idx]
            vis1 = getattr(p1, 'visibility', 0.5)
            vis2 = getattr(p2, 'visibility', 0.5)

            if vis1 > 0.22 and vis2 > 0.22:
                pt1 = (int(p1.x * w), int(p1.y * h))
                pt2 = (int(p2.x * w), int(p2.y * h))

                bone_color = color
                is_arm = (
                    (p1_idx in (11, 13, 15) and p2_idx in (11, 13, 15)) or
                    (p1_idx in (12, 14, 16) and p2_idx in (12, 14, 16))
                )

                if hand_raised and is_arm:
                    bone_color = COLOR_AMBER
                elif is_sleep:
                    bone_color = COLOR_RED

                # Outer thin white line + inner neon core line
                cv2.line(frame, pt1, pt2, COLOR_WHITE, 3, cv2.LINE_AA)
                cv2.line(frame, pt1, pt2, bone_color, 2, cv2.LINE_AA)

    # Draw Joint Nodes
    for idx, lm in enumerate(landmarks[:25]):
        vis = getattr(lm, 'visibility', 0.5)
        if vis > 0.22:
            cx, cy = int(lm.x * w), int(lm.y * h)
            node_color = color
            node_rad = 5

            if hand_raised and idx in (15, 16):
                node_color = COLOR_AMBER
                node_rad = 8  # Pulse on raised wrist
            elif is_sleep:
                node_color = COLOR_RED

            cv2.circle(frame, (cx, cy), node_rad, node_color, -1, cv2.LINE_AA)
            cv2.circle(frame, (cx, cy), max(2, node_rad - 3), COLOR_WHITE, -1, cv2.LINE_AA)


def draw_tech_box(
    frame: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    color: Tuple[int, int, int],
    label: str,
    conf: float = 0.95,
    sub_label: Optional[str] = None,
    hand_box: Optional[Tuple[int, int, int, int]] = None
) -> None:
    """
    Renders sleek cyberpunk-inspired bounding box with bracketed corners and metric badges.
    """
    corner_len = min(22, w // 4, h // 4)
    cv2.line(frame, (x, y), (x + corner_len, y), color, 2)
    cv2.line(frame, (x, y), (x, y + corner_len), color, 2)
    cv2.line(frame, (x + w, y), (x + w - corner_len, y), color, 2)
    cv2.line(frame, (x + w, y), (x + w, y + corner_len), color, 2)
    cv2.line(frame, (x, y + h), (x + corner_len, y + h), color, 2)
    cv2.line(frame, (x, y + h), (x, y + h - corner_len), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w - corner_len, y + h), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w, y + h - corner_len), color, 2)

    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 1, cv2.LINE_AA)

    tag = f"{label} {int(conf * 100)}%"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
    badge_y = max(0, y - th - 8)
    cv2.rectangle(frame, (x, badge_y), (x + tw + 12, y), COLOR_DARK, -1)
    cv2.rectangle(frame, (x, badge_y), (x + tw + 12, y), color, 1)
    cv2.putText(frame, tag, (x + 6, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, COLOR_WHITE, 1, cv2.LINE_AA)

    if sub_label:
        (stw, sth), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
        sub_y1 = y + h
        sub_y2 = sub_y1 + sth + 8
        if sub_y2 < frame.shape[0]:
            cv2.rectangle(frame, (x, sub_y1), (x + stw + 10, sub_y2), (25, 27, 32), -1)
            cv2.rectangle(frame, (x, sub_y1), (x + stw + 10, sub_y2), (60, 64, 72), 1)
            cv2.putText(frame, sub_label, (x + 5, sub_y2 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 215, 225), 1, cv2.LINE_AA)

    if hand_box is not None:
        hx, hy, hw_box, hh_box = hand_box
        cv2.rectangle(frame, (hx, hy), (hx + hw_box, hy + hh_box), COLOR_AMBER, 2, cv2.LINE_AA)
        cv2.putText(frame, "HAND [ANGKAT]", (hx, max(12, hy - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, COLOR_AMBER, 1, cv2.LINE_AA)


def draw_hud(
    frame: np.ndarray,
    stats: Dict[str, Any],
    fps: float,
    session_id: str,
    sync_status: str,
    rot_info: str,
    infer_ms: float = 0.0
) -> None:
    """
    Renders top status banner with real-time FPS, latency, headcount, and synchronization indicator.
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 36), COLOR_DARK, -1)
    cv2.addWeighted(overlay, 0.78, frame, 0.22, 0, frame)

    cv2.circle(frame, (16, 18), 5, COLOR_EMERALD, -1)
    cv2.putText(frame, "AI CLASSROOM v4.0 (YOLO26 + MediaPipe Heavy + ArcFace)", (28, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, COLOR_WHITE, 1, cv2.LINE_AA)

    detected = stats.get("total", 0)
    info = f"{fps:.1f} FPS ({infer_ms:.0f}ms) | {detected} Subjek | Rot: {rot_info} | Sync: {sync_status}"
    (iw, _), _ = cv2.getTextSize(info, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(frame, info, (max(10, w - iw - 16), 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 225, 185), 1, cv2.LINE_AA)
