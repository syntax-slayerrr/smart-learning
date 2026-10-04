"""
AI Classroom Intelligence — Multi-Source Threaded Camera Streamer
==================================================================
Developer 3: Edge Server, Ingestion, Streaming & Live HUD UI Lead
Syntax Slayer — Smart Learning Platform
"""

import threading
import time
from typing import Tuple, Optional, Union
import cv2
import numpy as np


class ThreadedCamera:
    """
    High-speed decoupled video stream reader with automatic reconnection.
    Supports laptop webcams (0, 1), RTSP network cameras, and HTTP IP Webcam streams.
    Enforces a 1-frame buffer to ensure zero latency (never trails behind live action).
    """
    def __init__(self, src: Union[int, str] = 0, target_fps: int = 30):
        self.src = int(src) if str(src).isdigit() else src
        self.target_fps = target_fps
        self.cap: Optional[cv2.VideoCapture] = None
        self.frame: Optional[np.ndarray] = None
        self.grabbed: bool = False
        self.is_connected: bool = False
        self.stopped: bool = False
        self.lock = threading.Lock()
        self.connect()

    def connect(self) -> None:
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass

        try:
            self.cap = cv2.VideoCapture(self.src)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
            self.is_connected = self.cap.isOpened()
            if self.is_connected:
                print(f"[+] Camera feed connected successfully: {self.src}")
        except Exception as e:
            print(f"[!] Failed to open camera source {self.src}: {e}")
            self.is_connected = False

    def start(self) -> "ThreadedCamera":
        t = threading.Thread(target=self._update, daemon=True)
        t.start()
        return self

    def _update(self) -> None:
        reconnect_interval = 2.0
        last_reconnect_attempt = time.time()

        while not self.stopped:
            if not self.is_connected or self.cap is None or not self.cap.isOpened():
                now = time.time()
                if now - last_reconnect_attempt > reconnect_interval:
                    last_reconnect_attempt = now
                    self.connect()
                time.sleep(0.1)
                continue

            grabbed, frame = self.cap.read()
            if not grabbed or frame is None:
                self.is_connected = False
                time.sleep(0.1)
                continue

            with self.lock:
                self.grabbed = grabbed
                self.frame = frame

            time.sleep(1.0 / (self.target_fps * 1.5))

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        with self.lock:
            if not self.grabbed or self.frame is None:
                return False, None
            return True, self.frame.copy()

    def release(self) -> None:
        self.stopped = True
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
