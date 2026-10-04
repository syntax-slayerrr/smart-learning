"""
AI Classroom Intelligence — Kinematics, Spatial Geometry & Filters
===================================================================
Developer 1: AI / Computer Vision Core Lead
Syntax Slayer — Smart Learning Platform
"""

import math
from typing import List, Tuple, Any
import numpy as np


def calculate_angle_3pts(p1: Any, p2: Any, p3: Any) -> float:
    """
    Calculate the joint angle in degrees for 3 points (p2 is the vertex/joint).
    Used for elbow angle kinematics: shoulder (p1) -> elbow (p2) -> wrist (p3).
    Differentiates scratching head / resting face (< 90 deg) from intentional hand raise (> 105 deg).
    """
    v1 = np.array([p1.x - p2.x, p1.y - p2.y], dtype=np.float32)
    v2 = np.array([p3.x - p2.x, p3.y - p2.y], dtype=np.float32)
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 < 1e-4 or n2 < 1e-4:
        return 0.0
    cosine = np.dot(v1, v2) / (n1 * n2)
    return float(math.degrees(math.acos(np.clip(cosine, -1.0, 1.0))))


def filter_overlapping_poses(
    pose_landmarks_list: List[Any],
    frame_shape: Tuple[int, int, ...],
    iou_thresh: float = 0.30,
    center_dist_thresh: float = 95.0
) -> List[Any]:
    """
    Eliminates duplicate poses (ghost tracks) caused by reflections or multi-person pose overlaps.
    Ensures that each physical human receives exactly one pose skeleton and one tracker ID.
    """
    if len(pose_landmarks_list) <= 1:
        return pose_landmarks_list

    h, w = frame_shape[:2]
    boxes = []
    scores = []

    for lms in pose_landmarks_list:
        xs = [lm.x for lm in lms[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
        ys = [lm.y for lm in lms[:25] if getattr(lm, 'visibility', 0.5) > 0.22]
        if len(xs) < 8:
            continue
        x1 = min(xs) * w
        y1 = min(ys) * h
        x2 = max(xs) * w
        y2 = max(ys) * h
        boxes.append((x1, y1, x2, y2, lms))
        scores.append(sum(getattr(lm, 'visibility', 0.5) for lm in lms[:25]))

    keep = []
    indices = sorted(range(len(boxes)), key=lambda i: scores[i], reverse=True)

    for i in indices:
        x1_a, y1_a, x2_a, y2_a, lms_a = boxes[i]
        area_a = max(0, x2_a - x1_a) * max(0, y2_a - y1_a)
        cx_a = (x1_a + x2_a) / 2.0
        cy_a = (y1_a + y2_a) / 2.0

        overlap = False
        for (x1_b, y1_b, x2_b, y2_b, _) in keep:
            cx_b = (x1_b + x2_b) / 2.0
            cy_b = (y1_b + y2_b) / 2.0

            if math.hypot(cx_a - cx_b, cy_a - cy_b) < center_dist_thresh:
                overlap = True
                break

            inter_x1 = max(x1_a, x1_b)
            inter_y1 = max(y1_a, y1_b)
            inter_x2 = min(x2_a, x2_b)
            inter_y2 = min(y2_a, y2_b)
            inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
            area_b = max(0, x2_b - x1_b) * max(0, y2_b - y1_b)
            union_area = area_a + area_b - inter_area
            if union_area > 0 and (inter_area / union_area) > iou_thresh:
                overlap = True
                break

        if not overlap:
            keep.append((x1_a, y1_a, x2_a, y2_a, lms_a))

    return [item[4] for item in keep]
