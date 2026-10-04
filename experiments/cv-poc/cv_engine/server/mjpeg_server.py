"""
AI Classroom Intelligence — Edge MJPEG Streaming & Control Server
==================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform
"""

from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import json
import threading
import time
import urllib.parse
from typing import Optional, Callable, Dict, Any, Tuple

from cv_engine.telemetry.gallery import FaceGalleryManager


class StreamServerState:
    """
    Shared thread-safe state container for the Edge MJPEG & Control Server.
    """
    def __init__(self, gallery_manager: FaceGalleryManager, sync_status_fn: Callable[[], str]):
        self.gallery_manager = gallery_manager
        self.sync_status_fn = sync_status_fn
        self.latest_frame_jpeg: Optional[bytes] = None
        self.frame_lock = threading.Lock()
        self.stop_event = threading.Event()

        self.rotation: str = "auto"
        self.flip_h: bool = False
        self.rotation_lock = threading.Lock()

    def update_frame(self, jpeg_bytes: bytes) -> None:
        with self.frame_lock:
            self.latest_frame_jpeg = jpeg_bytes

    def get_frame(self) -> Optional[bytes]:
        with self.frame_lock:
            return self.latest_frame_jpeg

    def set_orientation(self, rotation: Optional[str] = None, flip_h: Optional[bool] = None) -> Tuple[str, bool]:
        with self.rotation_lock:
            if rotation in ("0", "90", "180", "270", "auto"):
                self.rotation = rotation
            if flip_h is not None:
                self.flip_h = flip_h
            return self.rotation, self.flip_h

    def get_orientation(self) -> Tuple[str, bool]:
        with self.rotation_lock:
            return self.rotation, self.flip_h


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    state: StreamServerState = None  # Injected before server start

    def log_message(self, format, *args):
        pass  # Suppress noisy HTTP request logging

    def do_GET(self):
        state = self.state
        if state is None:
            self.send_response(500)
            self.end_headers()
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/status":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            rot_val, flip_val = state.get_orientation()
            sync_val = state.sync_status_fn()
            payload = {
                "status": "online",
                "engine": "SYNTAX_SLAYER_EDUAI_V4_MODULAR",
                "fps": 45,
                "rotation": rot_val,
                "flip_h": flip_val,
                "cloud_sync": sync_val,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        if path == "/rotate":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            new_deg = params.get("deg", [None])[0]
            new_flip = params.get("flip", [None])[0]
            flip_bool = None
            if new_flip is not None:
                flip_bool = new_flip in ("1", "true", "True")

            rot_ret, flip_ret = state.set_orientation(new_deg, flip_bool)
            res = {"success": True, "rotation": rot_ret, "flip_h": flip_ret}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        if path == "/register_face":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            reg_name = params.get("name", ["Zaldy (Siswa)"])[0]
            state.gallery_manager.trigger_registration(reg_name)
            res = {"success": True, "message": f"Mendaftarkan profil wajah untuk: {reg_name}"}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        if path == "/gallery":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            names = state.gallery_manager.get_registered_students()
            res = {"success": True, "registered_students": names, "total": len(names)}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        if path in ("/video_feed", "/"):
            self.send_response(200)
            self.send_header("Content-type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, private")
            self.end_headers()

            while not state.stop_event.is_set():
                frame_bytes = state.get_frame()
                if frame_bytes is not None:
                    try:
                        self.wfile.write(b"--frame\r\n")
                        self.send_header("Content-type", "image/jpeg")
                        self.send_header("Content-length", str(len(frame_bytes)))
                        self.end_headers()
                        self.wfile.write(frame_bytes)
                        self.wfile.write(b"\r\n")
                    except (BrokenPipeError, ConnectionResetError):
                        break
                time.sleep(0.025)  # 40 FPS delivery rate
            return

        self.send_response(404)
        self.end_headers()


def start_mjpeg_server(port: int, state: StreamServerState) -> Optional[ThreadingHTTPServer]:
    """
    Spawns background HTTP server delivering MJPEG feed and REST control endpoints.
    """
    try:
        MJPEGStreamHandler.state = state
        server = ThreadingHTTPServer(("0.0.0.0", port), MJPEGStreamHandler)
        server.daemon_threads = True
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print(f"[+] MJPEG Turbo Multi-Client Streamer active: http://localhost:{port}/video_feed")
        return server
    except Exception as e:
        print(f"[!] Warning: Failed to start MJPEG streamer on port {port}: {e}")
        return None
