"""
AI Classroom Intelligence — Edge Server Subsystem
=================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform
"""

from cv_engine.server.mjpeg_server import (
    StreamServerState,
    MJPEGStreamHandler,
    start_mjpeg_server
)

__all__ = [
    "StreamServerState",
    "MJPEGStreamHandler",
    "start_mjpeg_server"
]
