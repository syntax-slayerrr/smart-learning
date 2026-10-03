#!/usr/bin/env python3
"""
AI Classroom Intelligence — Edge Telemetry Computer Vision Engine & Live Streamer
==================================================================================
Tim: SYNTAX SLAYER (Smart Learning Platform)
Versi: 2.6.0 (High-Precision Multi-Parameter Vision, Dynamic Orientation & Cloud-Sync)

Fitur:
1. Multi-Parameter Deep Detection:
   - YuNet Deep Learning ONNX Neural Network (5 Facial Landmarks: mata, hidung, mulut)
   - Analisa Kemiringan Kepala (Head Roll/Tilt Angle) & Gaze Direction
   - Deteksi Angkat Tangan (Skin Blob Contour Analysis di atas bahu/wajah)
   - Klasifikasi Aktivitas Akurat:
     * FOKUS BELAJAR (Emerald)
     * MENGETIK / LAPTOP (Emerald/Sky)
     * MENULIS DI MEJA (Sky)
     * ANGKAT TANGAN / BERTANYA (Amber)
     * BERDIRI (Blue)
     * TIDUR DI MEJA (Red - Hanya jika kepala rebah > 55° atau menempel meja > 4 detik)
2. Live Orientation & Rotation:
   - Dynamic rotation via HTTP endpoint: /rotate?deg=0|90|180|270|auto&flip=0|1
   - Bekerja mulus untuk kamera HP portrait tanpa perlu restart script!
3. Dual-Dispatch Telemetry:
   - Sinkronisasi real-time simultan ke Localhost (:3000) dan Vercel Production Cloud.
"""

import argparse
import json
import math
import os
import queue
import sys
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import cv2
import numpy as np

# Warna BGR OpenCV (Palette Kalibrasi Tajam)
COLOR_EMERALD = (70, 205, 95)
COLOR_SKY = (235, 140, 20)
COLOR_BLUE = (255, 175, 45)
COLOR_AMBER = (25, 165, 255)
COLOR_RED = (50, 50, 245)
COLOR_DARK = (18, 20, 24)
COLOR_WHITE = (245, 245, 245)

# Global Frame Cache & Server Control
latest_frame_jpeg = None
frame_lock = threading.Lock()
streamer_stop_event = threading.Event()

# Rotation Control
current_rotation = "auto"
current_flip_h = False
rotation_lock = threading.Lock()

# Asynchronous Telemetry Queue & Dual Dispatch
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


def telemetry_dispatcher_worker(primary_url, device_key):
    global last_sync_status

    # Target URLs: Primary Local + Cloud Production Vercel
    target_urls = [primary_url]
    cloud_url = "https://smart-learning-black.vercel.app/api/telemetry/ingest"
    if cloud_url not in target_urls and "vercel.app" not in primary_url:
        target_urls.append(cloud_url)

    while not streamer_stop_event.is_set():
        try:
            payload = telemetry_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        data = json.dumps(payload, default=default_json_serializer).encode("utf-8")
        statuses = []

        for url in target_urls:
            try:
                req = urllib.request.Request(
                    url,
                    data=data,
                    headers={
                        "Content-Type": "application/json",
                        "x-edge-device-key": device_key
                    }
                )
                with urllib.request.urlopen(req, timeout=2.5) as response:
                    tag = "Local" if "127.0.0.1" in url or "localhost" in url else "Cloud"
                    statuses.append(f"{tag}:{response.status}")
            except urllib.error.HTTPError as e:
                tag = "Local" if "127.0.0.1" in url or "localhost" in url else "Cloud"
                statuses.append(f"{tag}:{e.code}")
            except Exception:
                tag = "Local" if "127.0.0.1" in url or "localhost" in url else "Cloud"
                statuses.append(f"{tag}:off")

        with sync_lock:
            last_sync_status = " | ".join(statuses) if statuses else "Standby"

        telemetry_queue.task_done()


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        global latest_frame_jpeg, current_rotation, current_flip_h

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # 1. API Status Endpoint
        if path == "/status":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with sync_lock:
                sync_val = last_sync_status
            with rotation_lock:
                rot_val = current_rotation
                flip_val = current_flip_h
            payload = {
                "status": "online",
                "engine": "SYNTAX_SLAYER_YUNET_V2",
                "fps": 30,
                "rotation": rot_val,
                "flip_h": flip_val,
                "cloud_sync": sync_val,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        # 2. Live Dynamic Rotation & Orientation Endpoint
        if path == "/rotate":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            new_deg = params.get("deg", [None])[0]
            new_flip = params.get("flip", [None])[0]

            with rotation_lock:
                if new_deg in ("0", "90", "180", "270", "auto"):
                    current_rotation = new_deg
                if new_flip is not None:
                    current_flip_h = new_flip in ("1", "true", "True")
                ret_rot = current_rotation
                ret_flip = current_flip_h

            res = {"success": True, "rotation": ret_rot, "flip_h": ret_flip}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # 3. MJPEG Video Stream
        if path in ("/video_feed", "/"):
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


def detect_hand_raised(frame, person_box, face_box):
    """
    Mendeteksi tangan yang terangkat di atas bahu atau di samping kepala.
    Menggunakan analisa kontur warna kulit (YCrCb) pada region di atas/samping bahu.
    """
    px, py, pw, ph = person_box
    fx, fy, fw, fh = face_box
    h, w = frame.shape[:2]

    # Area pencarian tangan: Dari atas kepala hingga setengah dada, melebar ke kiri-kanan
    roi_y1 = max(0, fy - int(fh * 1.4))
    roi_y2 = min(h, fy + int(fh * 1.1))
    roi_x1 = max(0, fx - int(fw * 1.2))
    roi_x2 = min(w, fx + int(fw * 2.2))

    roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]
    if roi.size == 0 or roi.shape[0] < 20 or roi.shape[1] < 20:
        return False, None

    # Konversi ke YCrCb untuk segmentasi warna kulit
    ycrcb = cv2.cvtColor(roi, cv2.COLOR_BGR2YCrCb)
    skin_mask = cv2.inRange(
        ycrcb,
        np.array([0, 133, 77], dtype=np.uint8),
        np.array([255, 173, 127], dtype=np.uint8)
    )

    # Hilangkan area wajah dari mask agar wajah tidak dikira tangan yang terangkat
    face_in_roi_y1 = max(0, fy - roi_y1)
    face_in_roi_y2 = min(roi.shape[0], (fy + fh) - roi_y1)
    face_in_roi_x1 = max(0, fx - roi_x1)
    face_in_roi_x2 = min(roi.shape[1], (fx + fw) - roi_x1)

    skin_mask[face_in_roi_y1:face_in_roi_y2, face_in_roi_x1:face_in_roi_x2] = 0

    # Morphological cleaning
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    skin_mask = cv2.dilate(skin_mask, kernel, iterations=1)

    contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_hand_area = max(400, int(fw * fh * 0.15))

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_hand_area:
            hx, hy, hw_box, hh_box = cv2.boundingRect(cnt)
            global_hy = roi_y1 + hy
            # Tangan terangkat jika puncak kontur berada di atas dagu / sejajar hidung-dahi
            if global_hy < (fy + int(fh * 0.6)):
                hand_global_box = (roi_x1 + hx, global_hy, hw_box, hh_box)
                return True, hand_global_box

    return False, None


def draw_tech_box(frame, x, y, w, h, color, label, conf=0.95, sub_label=None, hand_box=None):
    corner_len = min(22, w // 4, h // 4)
    # Hairline tech corners
    cv2.line(frame, (x, y), (x + corner_len, y), color, 2)
    cv2.line(frame, (x, y), (x, y + corner_len), color, 2)
    cv2.line(frame, (x + w, y), (x + w - corner_len, y), color, 2)
    cv2.line(frame, (x + w, y), (x + w, y + corner_len), color, 2)
    cv2.line(frame, (x, y + h), (x + corner_len, y + h), color, 2)
    cv2.line(frame, (x, y + h), (x, y + h - corner_len), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w - corner_len, y + h), color, 2)
    cv2.line(frame, (x + w, y + h), (x + w, y + h - corner_len), color, 2)

    # Hairline box boundary
    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 1, cv2.LINE_AA)

    # Top Label Badge
    tag = f"{label} {int(conf*100)}%"
    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
    badge_y = max(0, y - th - 8)
    cv2.rectangle(frame, (x, badge_y), (x + tw + 12, y), COLOR_DARK, -1)
    cv2.rectangle(frame, (x, badge_y), (x + tw + 12, y), color, 1)
    cv2.putText(frame, tag, (x + 6, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, COLOR_WHITE, 1, cv2.LINE_AA)

    # Bottom Multi-Parameter Telemetry Pill
    if sub_label:
        (stw, sth), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
        sub_y1 = y + h
        sub_y2 = sub_y1 + sth + 8
        if sub_y2 < frame.shape[0]:
            cv2.rectangle(frame, (x, sub_y1), (x + stw + 10, sub_y2), (25, 27, 32), -1)
            cv2.rectangle(frame, (x, sub_y1), (x + stw + 10, sub_y2), (60, 64, 72), 1)
            cv2.putText(frame, sub_label, (x + 5, sub_y2 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 215, 225), 1, cv2.LINE_AA)

    # Draw raised hand box if present
    if hand_box is not None:
        hx, hy, hw_box, hh_box = hand_box
        cv2.rectangle(frame, (hx, hy), (hx + hw_box, hy + hh_box), COLOR_AMBER, 1, cv2.LINE_AA)
        cv2.putText(frame, "HAND", (hx, hy - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.36, COLOR_AMBER, 1, cv2.LINE_AA)


def draw_hud(frame, stats, fps, session_id, sync_status, rot_info):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 36), COLOR_DARK, -1)
    cv2.addWeighted(overlay, 0.78, frame, 0.22, 0, frame)

    cv2.circle(frame, (16, 18), 5, (50, 220, 80), -1)
    cv2.putText(frame, "AI VISION ENGINE", (28, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, COLOR_WHITE, 1, cv2.LINE_AA)

    detected = stats.get("total", 0)
    info = f"{fps:.1f} FPS | {detected} Subjek | Rot: {rot_info} | Sync: {sync_status}"
    (iw, _), _ = cv2.getTextSize(info, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(frame, info, (max(10, w - iw - 16), 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 225, 185), 1, cv2.LINE_AA)


class SubjectTracker:
    def __init__(self):
        self.tracks = {}
        self.next_id = 1
        self.sleep_timer = {}

    def update(self, detected_items, frame_shape, curr_time, frame_bgr):
        """
        detected_items: list of dicts with:
        {
          "person_box": (px, py, pw, ph),
          "face_box": (fx, fy, fw, fh),
          "landmarks": { ... } or None,
          "head_tilt_deg": float,
          "gaze_dir": str,
          "pitch_ratio": float,
          "conf": float
        }
        """
        h, w = frame_shape[:2]
        matched_ids = set()

        for item in detected_items:
            px, py, pw, ph = item["person_box"]
            fx, fy, fw, fh = item["face_box"]
            head_tilt = item.get("head_tilt_deg", 0.0)
            pitch_ratio = item.get("pitch_ratio", 0.0)
            gaze_dir = item.get("gaze_dir", "Depan")
            score = item.get("conf", 0.95)

            cx = px + pw / 2
            cy = py + ph / 2

            best_id = None
            best_dist = 140

            for tid, trk in self.tracks.items():
                if tid in matched_ids:
                    continue
                tcx, tcy = trk["center"]
                dist = np.hypot(cx - tcx, cy - tcy)
                if dist < best_dist:
                    best_dist = dist
                    best_id = tid

            # 1. Deteksi Angkat Tangan
            is_hand_raised, hand_box = detect_hand_raised(frame_bgr, (px, py, pw, ph), (fx, fy, fw, fh))

            # 2. Postur (Duduk vs Berdiri)
            posture = "standing" if fy < h * 0.32 and ph > h * 0.40 else "sitting"

            # 3. Klasifikasi Perilaku & Aktivitas Multi-Parameter
            # Aturan SLEEP: HANYA jika kepala miring rebah > 55° secara konstan ATAU menunduk rebah menempel meja
            is_sleep = False
            tid_check = best_id or self.next_id

            is_head_resting_flat = (head_tilt > 55.0 and cy > h * 0.60) or (fy > h * 0.85)

            if is_head_resting_flat:
                if tid_check not in self.sleep_timer:
                    self.sleep_timer[tid_check] = curr_time
                elif curr_time - self.sleep_timer[tid_check] > 4.5:
                    is_sleep = True
            else:
                self.sleep_timer.pop(tid_check, None)

            # Tentukan aktivitas berdasarkan parameter multimodal
            if is_sleep:
                activity = "sleep"
                action_text = "Rebahan / Tidur di Meja"
                attention_score = 15
            elif is_hand_raised:
                activity = "hand_raised"
                action_text = "Angkat Tangan (Bertanya)"
                attention_score = 98
            elif posture == "standing":
                activity = "attentive"
                action_text = "Berdiri di Depan"
                attention_score = 90
            elif pitch_ratio > 0.35 or cy > h * 0.40:
                # Menatap laptop atau meja
                activity = "writing"
                action_text = "Fokus Mengetik / Meja"
                attention_score = 92
            else:
                activity = "attentive"
                action_text = "Fokus Menyimak"
                attention_score = 95

            # Multi-parameter summary pill text
            sub_label = f"Postur: {'Duduk' if posture == 'sitting' else 'Berdiri'} • Fokus: {attention_score}% • {gaze_dir}"

            if best_id is not None:
                trk = self.tracks[best_id]
                old_x, old_y, old_w, old_h = trk["box"]
                smooth_x = int(0.75 * px + 0.25 * old_x)
                smooth_y = int(0.75 * py + 0.25 * old_y)
                smooth_w = int(0.75 * pw + 0.25 * old_w)
                smooth_h = int(0.75 * ph + 0.25 * old_h)

                trk["box"] = (smooth_x, smooth_y, smooth_w, smooth_h)
                trk["center"] = (smooth_x + smooth_w / 2, smooth_y + smooth_h / 2)
                trk["face_box"] = (fx, fy, fw, fh)
                trk["posture"] = posture
                trk["activity"] = activity
                trk["action_text"] = action_text
                trk["sub_label"] = sub_label
                trk["attention_score"] = attention_score
                trk["conf"] = float(score)
                trk["last_seen"] = curr_time
                trk["is_hand_raised"] = is_hand_raised
                trk["hand_box"] = hand_box
                trk["is_sleep"] = is_sleep
                trk["head_tilt"] = round(head_tilt, 1)
                trk["gaze_dir"] = gaze_dir
                matched_ids.add(best_id)
            else:
                new_id = self.next_id
                self.next_id += 1
                self.tracks[new_id] = {
                    "id": new_id,
                    "box": (px, py, pw, ph),
                    "face_box": (fx, fy, fw, fh),
                    "center": (cx, cy),
                    "posture": posture,
                    "activity": activity,
                    "action_text": action_text,
                    "sub_label": sub_label,
                    "attention_score": attention_score,
                    "conf": float(score),
                    "last_seen": curr_time,
                    "is_hand_raised": is_hand_raised,
                    "hand_box": hand_box,
                    "is_sleep": is_sleep,
                    "head_tilt": round(head_tilt, 1),
                    "gaze_dir": gaze_dir
                }
                matched_ids.add(new_id)

        # Hapus track yang hilang > 2.5 detik
        dead_ids = [tid for tid, trk in self.tracks.items() if curr_time - trk["last_seen"] > 2.5]
        for did in dead_ids:
            del self.tracks[did]
            self.sleep_timer.pop(did, None)

        return list(self.tracks.values())


def run_opencv_engine(args):
    global latest_frame_jpeg, current_rotation, current_flip_h

    print("[*] Inisialisasi Native Multi-Parameter AI Vision Engine...")
    current_rotation = args.rotate

    cascade_dir = cv2.data.haarcascades
    face_frontal = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_frontalface_alt2.xml"))
    face_profile = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_profileface.xml"))
    upper_body = cv2.CascadeClassifier(os.path.join(cascade_dir, "haarcascade_upperbody.xml"))

    # Load YuNet ONNX Deep Learning Neural Network
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

    print(f"[+] Engine Aktif! (Source: {args.source}, Initial Rotation: {current_rotation})")
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

            # 1. Handle live camera orientation & rotation
            with rotation_lock:
                rot_setting = current_rotation
                flip_setting = current_flip_h

            if rot_setting == "90":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE)
            elif rot_setting == "180":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_180)
            elif rot_setting == "270":
                frame = cv2.rotate(raw_frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            elif rot_setting == "auto":
                # Jika kamera HP mengirim orientasi landscape tapi dipasang vertikal (portrait)
                if raw_frame.shape[1] > raw_frame.shape[0]:
                    frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE)
                else:
                    frame = raw_frame
            else:
                frame = raw_frame

            if flip_setting:
                frame = cv2.flip(frame, 1)

            h, w = frame.shape[:2]
            detected_items = []

            # 2. YuNet Multi-Parameter Deep Learning Detection
            if yunet_detector is not None:
                try:
                    yunet_detector.setInputSize((w, h))
                    _, faces = yunet_detector.detect(frame)
                    if faces is not None and len(faces) > 0:
                        for f in faces:
                            fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                            conf = float(f[-1])
                            if conf >= 0.28:
                                # Ekstrak 5 Facial Landmarks YuNet:
                                # f[4]: Right Eye, f[6]: Left Eye, f[8]: Nose Tip, f[10]: Right Mouth, f[12]: Left Mouth
                                x_re, y_re = float(f[4]), float(f[5])
                                x_le, y_le = float(f[6]), float(f[7])
                                x_nt, y_nt = float(f[8]), float(f[9])

                                eye_dx = x_le - x_re
                                eye_dy = y_le - y_re
                                eye_dist = math.hypot(eye_dx, eye_dy)
                                head_tilt_deg = math.degrees(math.atan2(abs(eye_dy), max(1e-5, abs(eye_dx))))

                                eye_center_x = (x_re + x_le) / 2.0
                                eye_center_y = (y_re + y_le) / 2.0
                                yaw_offset = (x_nt - eye_center_x) / max(1.0, eye_dist)
                                pitch_ratio = (y_nt - eye_center_y) / max(1.0, eye_dist)

                                if yaw_offset < -0.32:
                                    gaze_dir = "Menoleh Kanan"
                                elif yaw_offset > 0.32:
                                    gaze_dir = "Menoleh Kiri"
                                elif pitch_ratio > 0.38:
                                    gaze_dir = "Menatap Laptop/Buku"
                                else:
                                    gaze_dir = "Depan / Layar"

                                # Estimasi Bounding Box Tubuh Siswa
                                px = max(0, fx - int(fw * 0.45))
                                py = max(0, fy - int(fh * 0.20))
                                pw = min(w - px, int(fw * 1.9))
                                ph = min(h - py, int(fh * 3.4))

                                detected_items.append({
                                    "person_box": (px, py, pw, ph),
                                    "face_box": (fx, fy, fw, fh),
                                    "head_tilt_deg": head_tilt_deg,
                                    "pitch_ratio": pitch_ratio,
                                    "gaze_dir": gaze_dir,
                                    "conf": conf
                                })
                except Exception:
                    pass

            # 3. Fallback Multi-Scale Cascades jika YuNet tidak mendeteksi wajah
            if len(detected_items) == 0:
                scale_w = 480
                scale_h = int(480 * h / w)
                small = cv2.resize(frame, (scale_w, scale_h))
                scale_x = w / scale_w
                scale_y = h / scale_h
                gray_small = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

                faces1 = face_frontal.detectMultiScale(gray_small, scaleFactor=1.1, minNeighbors=3, minSize=(25, 25))
                for (fx, fy, fw, fh) in faces1:
                    g_fx, g_fy, g_fw, g_fh = int(fx * scale_x), int(fy * scale_y), int(fw * scale_x), int(fh * scale_y)
                    px = max(0, g_fx - int(g_fw * 0.4))
                    py = max(0, g_fy - int(g_fh * 0.2))
                    pw = min(w - px, int(g_fw * 1.8))
                    ph = min(h - py, int(g_fh * 3.2))
                    detected_items.append({
                        "person_box": (px, py, pw, ph),
                        "face_box": (g_fx, g_fy, g_fw, g_fh),
                        "head_tilt_deg": 0.0,
                        "pitch_ratio": 0.35,
                        "gaze_dir": "Depan",
                        "conf": 0.92
                    })

                if len(detected_items) == 0:
                    faces2 = face_profile.detectMultiScale(gray_small, scaleFactor=1.1, minNeighbors=3, minSize=(25, 25))
                    for (fx, fy, fw, fh) in faces2:
                        g_fx, g_fy, g_fw, g_fh = int(fx * scale_x), int(fy * scale_y), int(fw * scale_x), int(fh * scale_y)
                        px = max(0, g_fx - int(g_fw * 0.4))
                        py = max(0, g_fy - int(g_fh * 0.2))
                        pw = min(w - px, int(g_fw * 1.8))
                        ph = min(h - py, int(g_fh * 3.2))
                        detected_items.append({
                            "person_box": (px, py, pw, ph),
                            "face_box": (g_fx, g_fy, g_fw, g_fh),
                            "head_tilt_deg": 15.0,
                            "pitch_ratio": 0.30,
                            "gaze_dir": "Menoleh Samping",
                            "conf": 0.88
                        })

                if len(detected_items) == 0:
                    uppers = upper_body.detectMultiScale(gray_small, scaleFactor=1.12, minNeighbors=2, minSize=(40, 40))
                    for (ux, uy, uw, uh) in uppers:
                        g_ux, g_uy, g_uw, g_uh = int(ux * scale_x), int(uy * scale_y), int(uw * scale_x), int(uh * scale_y)
                        detected_items.append({
                            "person_box": (g_ux, g_uy, g_uw, g_uh),
                            "face_box": (g_ux + int(g_uw * 0.25), g_uy, int(g_uw * 0.5), int(g_uh * 0.4)),
                            "head_tilt_deg": 0.0,
                            "pitch_ratio": 0.30,
                            "gaze_dir": "Depan",
                            "conf": 0.85
                        })

            # Non-Maximum Suppression untuk person boxes
            if len(detected_items) > 1:
                boxes_np = np.array([[d["person_box"][0], d["person_box"][1], d["person_box"][2], d["person_box"][3]] for d in detected_items])
                nms_boxes = non_max_suppression_boxes(boxes_np, overlapThresh=0.40)
                filtered_items = []
                for b in nms_boxes:
                    for d in detected_items:
                        if abs(d["person_box"][0] - b[0]) < 10 and abs(d["person_box"][1] - b[1]) < 10:
                            filtered_items.append(d)
                            break
            else:
                filtered_items = detected_items

            active_tracks = tracker.update(filtered_items, frame.shape, curr_time, frame)

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
                sub_label = trk.get("sub_label", "")
                hand_box = trk.get("hand_box")

                if trk["is_sleep"]:
                    color = COLOR_RED
                    label = f"#P{tid} [TIDUR]"
                elif trk["is_hand_raised"]:
                    color = COLOR_AMBER
                    label = f"#P{tid} [ANGKAT TANGAN]"
                elif activity == "writing":
                    color = COLOR_SKY
                    label = f"#P{tid} [FOKUS LAPTOP]"
                elif posture == "standing":
                    color = COLOR_BLUE
                    label = f"#P{tid} [BERDIRI]"
                else:
                    color = COLOR_EMERALD
                    label = f"#P{tid} [FOKUS BELAJAR]"

                draw_tech_box(frame, bx, by, bw, bh, color, label, conf, sub_label=sub_label, hand_box=hand_box)

                telemetry_tracks.append({
                    "id": f"P-{tid}",
                    "anonymous_id": f"P{tid}",
                    "label": f"Subjek #{tid}",
                    "posture": posture,
                    "activity": activity,
                    "action_text": trk.get("action_text", ""),
                    "confidence": round(conf, 2),
                    "hand_raised": trk["is_hand_raised"],
                    "sleep": trk["is_sleep"],
                    "head_tilt_deg": trk.get("head_tilt", 0.0),
                    "gaze_direction": trk.get("gaze_dir", "Depan"),
                    "attention_score": trk.get("attention_score", 95),
                    "box": [bx, by, bw, bh]
                })

            with sync_lock:
                sync_val = last_sync_status

            draw_hud(frame, stats, fps, args.session_id, sync_val, f"{rot_setting}°")

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
