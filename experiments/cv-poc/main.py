#!/usr/bin/env python3
"""
AI Classroom Intelligence — Engine Entry Point
==============================================
Syntax Slayer — Smart Learning Platform
"""

import argparse
import sys
import os

# Add parent directory to sys.path so cv_engine can be imported anywhere
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cv_engine.config import EngineConfig
from cv_engine.pipeline import run_pipeline


def parse_args() -> EngineConfig:
    parser = argparse.ArgumentParser(
        description="AI Classroom Intelligence — Edge CV Telemetry Engine (Syntax Slayer)"
    )
    parser.add_argument("--source", type=str, default="http://10.10.10.33:8080/video",
                        help="Camera source: index (e.g. 0), RTSP URL, or HTTP IP Webcam URL")
    parser.add_argument("--port", type=int, default=5000,
                        help="Port for MJPEG live streamer and control API (default: 5000)")
    parser.add_argument("--interval", type=int, default=2,
                        help="Telemetry dispatch interval in seconds (default: 2)")
    parser.add_argument("--session-id", type=str, default="00000000-0000-0000-0000-000000000001",
                        help="Active classroom session UUID")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:3000/api/telemetry/ingest",
                        help="Local Next.js ingest API endpoint")
    parser.add_argument("--device-key", type=str, default="dev-edge-secret-key-2026",
                        help="Security secret key for x-edge-device-key header")
    parser.add_argument("--rotate", type=str, default="auto", choices=["auto", "0", "90", "180", "270"],
                        help="Camera rotation: auto, 0, 90, 180, 270")
    parser.add_argument("--flip-h", action="store_true",
                        help="Mirror frame horizontally")
    parser.add_argument("--headless", action="store_true",
                        help="Run in headless server mode (no desktop GUI popup)")

    args = parser.parse_args()

    return EngineConfig(
        source=args.source,
        port=args.port,
        interval=args.interval,
        session_id=args.session_id,
        api_url=args.api_url,
        device_key=args.device_key,
        rotate=args.rotate,
        flip_h=args.flip_h,
        headless=args.headless
    )


def main():
    config = parse_args()
    run_pipeline(config)


if __name__ == "__main__":
    main()
