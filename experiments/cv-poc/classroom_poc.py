#!/usr/bin/env python3
"""
AI Classroom Intelligence — Edge Telemetry Computer Vision Engine & Live Streamer
==================================================================================
Team: SYNTAX SLAYER (Smart Learning Platform)
Architecture: Modular Multi-Developer Pipeline v4.1.0

Backward-compatible CLI facade.
Delegates to the modular `cv_engine` package:
  -   -   - Developer 3: Ingestion, Streaming Server & Cyber-HUD UI (MJPEG 45 FPS + REST Controls)
"""

import argparse
import os
import sys

# Ensure cv_engine is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cv_engine.config import EngineConfig
from cv_engine.pipeline import run_pipeline

# Backward-compatibility symbol exports
from cv_engine.core import (
    YOLO26Detector,
    MediaPipePoseDetector,
    ArcFaceEngine,
    FacePipeline,
    SubjectTracker,
    calculate_angle_3pts,
    filter_overlapping_poses
)
from cv_engine.telemetry import (
    FaceGalleryManager,
    TelemetryDispatcher,
    TelemetryPayload
)
from cv_engine.streaming import (
    ThreadedCamera,
    apply_orientation,
    draw_neon_skeleton,
    draw_tech_box,
    draw_hud
)
from cv_engine.server import (
    StreamServerState,
    start_mjpeg_server
)


def run_opencv_engine(args):
    """
    Backward-compatible adapter for legacy callers.
    """
    config = EngineConfig(
        source=args.source,
        port=args.port,
        interval=args.interval,
        session_id=args.session_id,
        api_url=args.api_url,
        device_key=args.device_key,
        rotate=args.rotate,
        headless=getattr(args, "headless", True)
    )
    run_pipeline(config)


def main():
    parser = argparse.ArgumentParser(description="AI Classroom Intelligence (SYNTAX SLAYER)")
    parser.add_argument("--source", type=str, default="http://10.10.10.33:8080/video",
                        help="Camera source: integer webcam index or RTSP / HTTP IP Webcam URL")
    parser.add_argument("--port", type=int, default=5000,
                        help="Port for live MJPEG stream and HTTP controls (default: 5000)")
    parser.add_argument("--interval", type=int, default=2,
                        help="Interval in seconds for telemetry JSON dispatch")
    parser.add_argument("--session-id", type=str, default="00000000-0000-0000-0000-000000000001",
                        help="UUID session ID for attendance and telemetry sync")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:3000/api/telemetry/ingest",
                        help="Primary ingest endpoint")
    parser.add_argument("--device-key", type=str, default="dev-edge-secret-key-2026",
                        help="Edge device authorization key")
    parser.add_argument("--rotate", type=str, default="auto", choices=["auto", "0", "90", "180", "270"],
                        help="Rotation angle: auto, 0, 90, 180, 270")
    parser.add_argument("--headless", action="store_true",
                        help="Run without local GUI window (for edge servers and background daemons)")
    parser.add_argument("--simulate", action="store_true",
                        help="Simulation mode flag")
    args = parser.parse_args()

    run_opencv_engine(args)


if __name__ == "__main__":
    main()
