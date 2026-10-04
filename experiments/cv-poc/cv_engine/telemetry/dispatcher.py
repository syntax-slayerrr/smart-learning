"""
AI Classroom Intelligence — Asynchronous Telemetry Dispatcher
=============================================================
Developer 2: Telemetry, Contracts & Cloud Integration Lead
Syntax Slayer — Smart Learning Platform
"""

import json
import queue
import threading
import time
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional

from cv_engine.telemetry.schemas import default_json_serializer


class TelemetryDispatcher:
    """
    Non-blocking asynchronous telemetry queue and HTTP dispatcher.
    Synchronizes edge classroom intelligence to both local Next.js backend and cloud endpoints.
    """
    def __init__(self, primary_url: str, cloud_url: str, device_key: str, max_queue: int = 100):
        self.primary_url = primary_url
        self.cloud_url = cloud_url
        self.device_key = device_key
        self.queue: queue.Queue = queue.Queue(maxsize=max_queue)
        self.stop_event = threading.Event()
        self.status_lock = threading.Lock()
        self.last_sync_status = "Standby"
        self.worker_thread: Optional[threading.Thread] = None

    def start(self) -> "TelemetryDispatcher":
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        print(f"[+] Telemetry Dispatcher active! Primary: {self.primary_url}")
        return self

    def stop(self) -> None:
        self.stop_event.set()
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=1.0)

    def enqueue(self, payload: Dict[str, Any]) -> bool:
        if not self.queue.full():
            self.queue.put_nowait(payload)
            return True
        return False

    def get_sync_status(self) -> str:
        with self.status_lock:
            return self.last_sync_status

    def _worker_loop(self) -> None:
        target_urls = [self.primary_url]
        if self.cloud_url and self.cloud_url not in target_urls and "vercel.app" not in self.primary_url:
            target_urls.append(self.cloud_url)

        while not self.stop_event.is_set():
            try:
                payload = self.queue.get(timeout=0.5)
            except queue.Empty:
                continue

            data = json.dumps(payload, default=default_json_serializer).encode("utf-8")
            statuses = []

            for url in target_urls:
                tag = "Local" if "127.0.0.1" in url or "localhost" in url else "Cloud"
                try:
                    req = urllib.request.Request(
                        url,
                        data=data,
                        headers={
                            "Content-Type": "application/json",
                            "x-edge-device-key": self.device_key
                        }
                    )
                    with urllib.request.urlopen(req, timeout=2.5) as response:
                        statuses.append(f"{tag}:{response.status}")
                except urllib.error.HTTPError as e:
                    statuses.append(f"{tag}:{e.code}")
                except Exception:
                    statuses.append(f"{tag}:off")

            with self.status_lock:
                self.last_sync_status = " | ".join(statuses) if statuses else "Standby"

            self.queue.task_done()
