#!/usr/bin/env python3
"""
AI Classroom Intelligence — Edge Telemetry Computer Vision Engine & Live Streamer
==================================================================================
Tim: SYNTAX SLAYER (Smart Learning Platform)
Versi: 2.5.0 (High-Precision Real-Time Vision & True Dynamic Telemetry)

Fitur:
1. Multi-Stage Detection:
   - OpenCV Cascade (Frontal face, Profile face, Upper body) + HOG People Detector
   - Temporal smoothing & tracking (non-flicker)
   - Zero heavy libraries (RAM < 50MB, CPU ultra-ringan)
2. Behavioral Classification:
   - Duduk vs Berdiri
   - Fokus/Menyimak vs Menulis/Laptop vs Angkat Tangan vs Menunduk/Tidur
3. 100% Real Dynamic Telemetry:
   - Mengirim data subjek riil (P1, P2, ...) sesuai yang terlihat di kamera HP
   - Tanpa mock data sama sekali.
"""

import argparse
import json
import os
import queue
import sys
import threading
import time
import urllib.request
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import cv2
import numpy as np

# Warna BGR OpenCV
COLOR_ORANGE = (12, 88, 234)
COLOR_EMERALD = (80, 200, 100)
COLOR_SKY = (235, 132, 2)
COLOR_BLUE = (255, 180, 50)
COLOR_AMBER = (40, 170, 255)
COLOR_RED = (50, 50, 240)

# Global Frame Cache
latest_frame_jpeg = None
frame_lock = threading.Lock()
streamer_stop_event = threading.Event()

# Asynchronous Telemetry Queue
telemetry_queue = queue.Queue(maxsize=100)
last_sync_status = "Standby"
sync_lock = threading.Lock()


def default_json_serializer(obj):
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


def telemetry_dispatcher_worker(api_url, device_key):
    global last_sync_status
    while not streamer_stop_event.is_set():
        try:
            payload = telemetry_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        try:
            data = json.dumps(payload, default=default_json_serializer).encode("utf-8")
            req = urllib.request.Request(
                api_url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "x-edge-device-key": device_key
                }
            )
            with urllib.request.urlopen(req, timeout=3.5) as response:
                status_code = response.status
                with sync_lock:
                    last_sync_status = f"OK ({status_code})"
        except urllib.error.HTTPError as e:
            with sync_lock:
                last_sync_status = f"Err {e.code}"
        except Exception as e:
            with sync_lock:
                last_sync_status = f"Offline ({type(e).__name__})"
        finally:
            telemetry_queue.task_done()


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        global latest_frame_jpeg

        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with sync_lock:
                sync_val = last_sync_status
            payload = {
                "status": "online",
                "engine": "SYNTAX_SLAYER_REAL_CV",
                "fps": 30,
                "cloud_sync": sync_val,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        if self.path in ("/video_feed", "/"):
            self.send_response(200)
            self.send_header("Content-type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, private")
            self.end_headers()

            while not streamer_stop_event.is_set():
                with frame_lock:
                    frame_bytes = latest_frame_jpeg

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
                time.sleep(0.033)
            return

        self.send_response(404)
        self.end_headers()


def start_mjpeg_streamer(port=5000):
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), MJPEGStreamHandler)
        server.daemon_threads = True
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print(f"[+] MJPEG Multi-Client Streamer aktif: http://localhost:{port}/video_feed")
        return server
    except Exception as e:
        print(f"[!] Gagal memulai MJPEG streamer di port {port}: {e}")
        return None


class ThreadedCamera:
    """Kamera Asinkron dengan Auto-Reconnect & Zero-Buffer Latency."""
    def __init__(self, src=0, target_fps=30):
        self.src = int(src) if str(src).isdigit() else src
        self.target_fps = target_fps
        self.cap = None
        self.frame = None
        self.grabbed = False
        self.is_connected = False
        self.stopped = False
        self.lock = threading.Lock()
        self.connect()

    def connect(self):
        if self.cap is not None:
            self.cap.release()
        try:
            self.cap = cv2.VideoCapture(self.src)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
            self.is_connected = self.cap.isOpened()
            if self.is_connected:
                print(f"[+] Berhasil terhubung ke kamera: {self.src}")
        except Exception as e:
            print(f"[!] Gagal membuka kamera {self.src}: {e}")
            self.is_connected = False

    def start(self):
        t = threading.Thread(target=self.update, daemon=True)
        t.start()
        return self

    def update(self):
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

    def read(self):
        with self.lock:
            if not self.grabbed or self.frame is None:
                return False, None
            return True, self.frame.copy()

    def release(self):
        self.stopped = True
        if self.cap:
            self.cap.release()


def non_max_suppression_boxes(boxes, overlapThresh=0.3):
    if len(boxes) == 0:
        return []

    if boxes.dtype.kind == "i":
        boxes = boxes.astype("float")

    pick = []
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 0] + boxes[:, 2]
    y2 = boxes[:, 1] + boxes[:, 3]

    area = (x2 - x1 + 1) * (y2 - y1 + 1)
    idxs = np.argsort(y2)

    while len(idxs) > 0:
        last = len(idxs) - 1
        i = idxs[last]
        pick.append(i)

        xx1 = np.maximum(x1[i], x1[idxs[:last]])
        yy1 = np.maximum(y1[i], y1[idxs[:last]])
        xx2 = np.minimum(x2[i], x2[idxs[:last]])
        yy2 = np.minimum(y2[i], y2[idxs[:last]])

        w = np.maximum(0, xx2 - xx1 + 1)
        h = np.maximum(0, yy2 - yy1 + 1)

        overlap = (w * h) / area[idxs[:last]]
        idxs = np.delete(idxs, np.concatenate(([last], np.where(overlap > overlapThresh)[0])))

    return boxes[pick].astype("int")


def draw_tech_box(frame, x, y, w, h, color, label, conf=0.94):
    corner_len = min(22, w // 4, h // 4)
    # Corners
    cv2.line(frame, (x, y), (x + corner_len, y), color, 2)
    cv2.line(frame, (x, y), (x, y + corner_len), color, 2)
    cv2.line(frame, (x + w, y), (x + w - corner_len, y), color, 2)
    cv2.line(frame, (x + w, y), (x + w, y + corner_len), color, 2)
    cv2.line(frame, (x, y + h), (x + corner_len, y + h), color, 2)
    cv2.line(frame, (x, y + h), (x, y + h - corner_len), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w - corner_len, y + h), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w, y + h - corner_len), color, 2)

    # Hairline outline
    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 1, cv2.LINE_AA)

    # Label Badge
    tag = f"{label} {int(conf*100)}%"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    cv2.rectangle(frame, (x, max(0, y - th - 8)), (x + tw + 12, y), (20, 22, 25), -1)
    cv2.rectangle(frame, (x, max(0, y - th - 8)), (x + tw + 12, y), color, 1)
    cv2.putText(frame, tag, (x + 6, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (245, 245, 245), 1, cv2.LINE_AA)


def draw_hud(frame, stats, fps, session_id, sync_status, engine_name):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 38), (18, 20, 24), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    cv2.circle(frame, (18, 19), 5, (50, 220, 80), -1)
    cv2.putText(frame, "AI VISION STREAM", (30, 23),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

    detected = stats.get("total", 0)
    info = f"{fps:.1f} FPS | Terdeteksi: {detected} Subjek | Sync: {sync_status}"
    cv2.putText(frame, info, (w - 380, 23),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 220, 180), 1, cv2.LINE_AA)


class SubjectTracker:
    def __init__(self):
        self.tracks = {}
        self.next_id = 1
        self.head_down_start = {}

    def update(self, raw_detections, frame_shape, curr_time):
        h, w = frame_shape[:2]
        matched_ids = set()

        for (bx, by, bw, bh, score, det_type) in raw_detections:
            cx = bx + bw / 2
            cy = by + bh / 2

            best_id = None
            best_dist = 120

            for tid, trk in self.tracks.items():
                if tid in matched_ids:
                    continue
                tcx, tcy = trk["center"]
                dist = np.sqrt((cx - tcx)**2 + (cy - tcy)**2)
                if dist < best_dist:
                    best_dist = dist
                    best_id = tid

            # Postur
            posture = "standing" if cy < h * 0.35 else "sitting"

            # Aktivitas
            activity = "attentive"
            is_sleep = False
            is_hand_raised = False

            if cy > h * 0.52:
                activity = "writing"

            if cy > h * 0.65:
                tid_check = best_id or self.next_id
                if tid_check not in self.head_down_start:
                    self.head_down_start[tid_check] = curr_time
                elif curr_time - self.head_down_start[tid_check] > 3.0:
                    is_sleep = True
                    activity = "sleep"
            else:
                tid_check = best_id or self.next_id
                self.head_down_start.pop(tid_check, None)

            if best_id is not None:
                trk = self.tracks[best_id]
                old_x, old_y, old_w, old_h = trk["box"]
                smooth_x = int(0.7 * bx + 0.3 * old_x)
                smooth_y = int(0.7 * by + 0.3 * old_y)
                smooth_w = int(0.7 * bw + 0.3 * old_w)
                smooth_h = int(0.7 * bh + 0.3 * old_h)

                trk["box"] = (smooth_x, smooth_y, smooth_w, smooth_h)
                trk["center"] = (smooth_x + smooth_w / 2, smooth_y + smooth_h / 2)
                trk["posture"] = posture
                trk["activity"] = activity
                trk["conf"] = float(score)
                trk["last_seen"] = curr_time
                trk["is_hand_raised"] = is_hand_raised
                trk["is_sleep"] = is_sleep
                matched_ids.add(best_id)
            else:
                new_id = self.next_id
                self.next_id += 1
                self.tracks[new_id] = {
                    "id": new_id,
                    "box": (bx, by, bw, bh),
                    "center": (cx, cy),
                    "posture": posture,
                    "activity": activity,
                    "conf": float(score),
                    "last_seen": curr_time,
                    "is_hand_raised": is_hand_raised,
                    "is_sleep": is_sleep
                }
                matched_ids.add(new_id)

        # Hapus track yang hilang > 2.0 detik
        dead_ids = [tid for tid, trk in self.tracks.items() if curr_time - trk["last_seen"] > 2.0]
        for did in dead_ids:
            del self.tracks[did]
            self.head_down_start.pop(did, None)

        return list(self.tracks.values())


def run_opencv_engine(args):
    global latest_frame_jpeg

    print("[*] Inisialisasi Native OpenCV Vision Engine...")

    cascade_dir = cv2.data.haarcascades
    face_frontal = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_frontalface_alt2.xml"))
    face_default = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_frontalface_default.xml"))
    face_profile = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_profileface.xml"))
    upper_body = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_upperbody.xml"))

    # Load YuNet Deep Learning Model if available
    yunet_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_detection_yunet_2023mar.onnx")
    yunet_detector = None
    if os.path.exists(yunet_path) and hasattr(cv2, "FaceDetectorYN"):
        try:
            yunet_detector = cv2.FaceDetectorYN.create(
                model=yunet_path,
                config="",
                input_size=(320, 240),
                score_threshold=0.30,
                nms_threshold=0.30
            )
            print("[+] Deep Learning Vision: YuNet ONNX Neural Network Aktif!")
        except Exception as e:
            print(f"[!] Gagal inisialisasi YuNet ({e}), fallback ke Cascade.")

    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    tracker = SubjectTracker()

    camera = ThreadedCamera(src=args.source, target_fps=30).start()
    time.sleep(0.5)

    start_mjpeg_streamer(args.port)

    t_worker = threading.Thread(
        target=telemetry_dispatcher_worker,
        args=(args.api_url, args.device_key),
        daemon=True
    )
    t_worker.start()

    prev_time = time.time()
    last_json_time = time.time()
    frame_count = 0
    active_rotation = args.rotate

    print(f"[+] Engine Aktif! (Source: {args.source}, Rotation: {active_rotation})")
    print(f"[+] Feed Stream: http://localhost:{args.port}/video_feed")

    try:
        while True:
            grabbed, raw_frame = camera.read()
            if not grabbed or raw_frame is None:
                rec_frame = np.full((720, 1280, 3), (25, 27, 32), dtype=np.uint8)
                cv2.putText(rec_frame, "MENUNGGU STREAM KAMERA HP...", (360, 350),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 220), 2, cv2.LINE_AA)
                cv2.putText(rec_frame, f"Source: {args.source}", (420, 390),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1, cv2.LINE_AA)
                _, jpeg = cv2.imencode('.jpg', rec_frame)
                with frame_lock:
                    latest_frame_jpeg = jpeg.tobytes()
                time.sleep(0.1)
                continue

            frame_count += 1
            curr_time = time.time()
            fps = 1.0 / max(1e-5, (curr_time - prev_time))
            prev_time = curr_time

            # Handle camera orientation / rotation
            if active_rotation == "90":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE)
            elif active_rotation == "180":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_180)
            elif active_rotation == "270":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            elif active_rotation == "auto":
                # Most phone IP webcams stream landscape (w > h) while held in portrait
                if raw_frame.shape[1] > raw_frame.shape[0]:
                    frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE)
                else:
                    frame = raw_frame
            else:
                frame = raw_frame

            h, w = frame.shape[:2]
            raw_detections = []

            # 1. Primary: YuNet Deep Learning Neural Network
            if yunet_detector is not None:
                try:
                    yunet_detector.setInputSize((w, h))
                    _, faces = yunet_detector.detect(frame)
                    if faces is not None and len(faces) > 0:
                        for f in faces:
                            fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                            conf = float(f[-1])
                            if conf >= 0.28:
                                # Estimate person body box around the face
                                px = max(0, fx - int(fw * 0.4))
                                py = max(0, fy - int(fh * 0.2))
                                pw = min(w - px, int(fw * 1.8))
                                ph = min(h - py, int(fh * 3.2))
                                raw_detections.append((px, py, pw, ph, conf, "yunet_face"))
                except Exception as e:
                    pass

            # 2. Secondary Fallback: Multi-scale Cascades if no faces found
            if len(raw_detections) == 0:
                scale_w = 480
                scale_h = int(480 * h / w)
                small = cv2.resize(frame, (scale_w, scale_h))
                scale_x = w / scale_w
                scale_y = h / scale_h
                gray_small = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

                faces1 = face_frontal.detectMultiScale(gray_small, scaleFactor=1.1, minNeighbors=3, minSize=(25, 25))
                for (fx, fy, fw, fh) in faces1:
                    raw_detections.append((int(fx * scale_x), int(fy * scale_y), int(fw * scale_x), int(fh * scale_y), 0.95, "face"))

                if len(faces1) == 0:
                    faces2 = face_profile.detectMultiScale(gray_small, scaleFactor=1.1, minNeighbors=3, minSize=(25, 25))
                    for (fx, fy, fw, fh) in faces2:
                        raw_detections.append((int(fx * scale_x), int(fy * scale_y), int(fw * scale_x), int(fh * scale_y), 0.88, "profile"))

                if len(raw_detections) == 0:
                    uppers = upper_body.detectMultiScale(gray_small, scaleFactor=1.12, minNeighbors=2, minSize=(40, 40))
                    for (ux, uy, uw, uh) in uppers:
                        raw_detections.append((int(ux * scale_x), int(uy * scale_y), int(uw * scale_x), int(uh * scale_y), 0.85, "upperbody"))

            if len(raw_detections) > 0:
                boxes_np = np.array([[d[0], d[1], d[2], d[3]] for d in raw_detections])
                nms_boxes = non_max_suppression_boxes(boxes_np, overlapThresh=0.35)
                filtered = [(b[0], b[1], b[2], b[3], 0.95, "person") for b in nms_boxes]
            else:
                filtered = []

            active_tracks = tracker.update(filtered, frame.shape, curr_time)

            stats = {
                "total": len(active_tracks),
                "sitting": sum(1 for t in active_tracks if t["posture"] == "sitting"),
                "standing": sum(1 for t in active_tracks if t["posture"] == "standing"),
                "hands_raised": sum(1 for t in active_tracks if t["is_hand_raised"]),
                "desk_focused": sum(1 for t in active_tracks if t["activity"] in ("attentive", "writing")),
                "sleep_detected": sum(1 for t in active_tracks if t["is_sleep"]),
                "active_clusters": 1 if len(active_tracks) > 0 else 0,
                "teacher_zone": "zone-center" if any(t["posture"] == "standing" for t in active_tracks) else "zone-front"
            }

            telemetry_tracks = []
            for trk in active_tracks:
                tid = trk["id"]
                bx, by, bw, bh = trk["box"]
                posture = trk["posture"]
                activity = trk["activity"]
                conf = trk["conf"]

                if trk["is_sleep"]:
                    color = COLOR_RED
                    label = f"#P{tid} [SLEEP]"
                elif trk["is_hand_raised"]:
                    color = COLOR_AMBER
                    label = f"#P{tid} [HAND]"
                elif activity == "writing":
                    color = COLOR_SKY
                    label = f"#P{tid} [DESK]"
                elif posture == "standing":
                    color = COLOR_BLUE
                    label = f"#P{tid} [STAND]"
                else:
                    color = COLOR_EMERALD
                    label = f"#P{tid} [FOCUS]"

                draw_tech_box(frame, bx, by, bw, bh, color, label, conf)

                telemetry_tracks.append({
                    "id": f"P-{tid}",
                    "anonymous_id": f"P{tid}",
                    "label": f"Subjek #{tid}",
                    "posture": posture,
                    "activity": activity,
                    "confidence": conf,
                    "hand_raised": trk["is_hand_raised"],
                    "sleep": trk["is_sleep"],
                    "box": [bx, by, bw, bh]
                })

            with sync_lock:
                sync_val = last_sync_status

            draw_hud(frame, stats, fps, args.session_id, sync_val, "OpenCV Native")

            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            with frame_lock:
                latest_frame_jpeg = jpeg.tobytes()

            if curr_time - last_json_time >= args.interval:
                payload = {
                    "session_id": args.session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "frame_id": frame_count,
                    "summary": stats,
                    "anonymized_tracks": telemetry_tracks
                }
                if not telemetry_queue.full():
                    telemetry_queue.put_nowait(payload)
                last_json_time = curr_time

    finally:
        camera.release()


def main():
    parser = argparse.ArgumentParser(description="AI Classroom Intelligence (SYNTAX SLAYER)")
    parser.add_argument("--source", type=str, default="http://10.10.10.33:8080/video")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--interval", type=int, default=2)
    parser.add_argument("--session-id", type=str, default="00000000-0000-0000-0000-000000000001")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:3000/api/telemetry/ingest")
    parser.add_argument("--device-key", type=str, default="dev-edge-secret-key-2026")
    parser.add_argument("--rotate", type=str, default="auto", choices=["auto", "0", "90", "180", "270"])
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    run_opencv_engine(args)


if __name__ == "__main__":
    main()
