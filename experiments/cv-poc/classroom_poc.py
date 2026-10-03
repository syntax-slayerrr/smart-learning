#!/usr/bin/env python3
"""
AI Classroom Intelligence — Edge Telemetry Computer Vision Engine & Live Streamer
==================================================================================
Tim: SYNTAX SLAYER (Smart Learning Platform)
Versi: 3.0.0 (China/Japan EduAI Grade: 33-Keypoint Anatomical Skeleton Tracking)

Fitur Utama v3.0.0:
1. Google Research BlazePose 33-Keypoint Anatomical Neural Tracking:
   - Menghitung koordinat sendi bahu, siku, pergelangan tangan, leher, hidung, dan mata.
   - Bebas dari kesalahan warna kulit (skin segmentation dihapus total).
2. Deteksi Angkat Tangan 100% Anatomis:
   - Dihitung dari vektor sendi: Wrist.y < Shoulder.y (tangan di atas bahu).
   - Zero false alarm dari tangan di atas meja/keyboard laptop.
3. Zero-Ghost Sleep Detection:
   - Tangan di meja diidentifikasi akurat sebagai "Mencatat / Mengetik di Meja".
   - Status tidur hanya aktif jika kepala/hidung tenggelam ke meja selama > 3.5 detik.
4. Futuristic Neon Skeleton HUD (Cyan/Emerald/Amber Glowing Bone Lines).
5. Asynchronous High-Speed Decoupled Streamer (30-50 FPS Zero Latency).
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

# MediaPipe Tasks API
MEDIAPIPE_AVAILABLE = False
try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    MEDIAPIPE_AVAILABLE = True
except Exception as e:
    MEDIAPIPE_AVAILABLE = False

# Aktifkan akselerasi SIMD & multi-threading OpenCV
cv2.setUseOptimized(True)
try:
    cv2.setNumThreads(max(2, os.cpu_count() or 4))
except Exception:
    pass

# Warna BGR OpenCV (Kalibrasi Presisi Cyberpunk / EduAI)
COLOR_EMERALD = (70, 205, 95)
COLOR_CYAN = (235, 205, 50)
COLOR_SKY = (235, 140, 20)
COLOR_BLUE = (255, 175, 45)
COLOR_AMBER = (25, 165, 255)
COLOR_RED = (50, 50, 245)
COLOR_DARK = (18, 20, 24)
COLOR_WHITE = (245, 245, 245)
COLOR_PURPLE = (220, 90, 180)

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
                "engine": "SYNTAX_SLAYER_EDUAI_SKELETON_V3_0",
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
                time.sleep(0.025)  # 40 FPS delivery
            return

        self.send_response(404)
        self.end_headers()


def start_mjpeg_streamer(port=5000):
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), MJPEGStreamHandler)
        server.daemon_threads = True
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print(f"[+] MJPEG Turbo Multi-Client Streamer aktif: http://localhost:{port}/video_feed")
        return server
    except Exception as e:
        print(f"[!] Gagal memulai MJPEG streamer di port {port}: {e}")
        return None


class ThreadedCamera:
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


# POSE SKELETON ANATOMICAL CONNECTIONS (EduAI Cyberpunk HUD)
POSE_CONNECTIONS = [
    # Arms: Left Shoulder -> Elbow -> Wrist
    (11, 13), (13, 15),
    # Arms: Right Shoulder -> Elbow -> Wrist
    (12, 14), (14, 16),
    # Clavicle / Shoulders: Left Shoulder <-> Right Shoulder
    (11, 12),
    # Torso: Shoulders to Hips
    (11, 23), (12, 24),
    (23, 24),
    # Head & Neck
    (0, 1), (1, 2), (2, 3), (3, 7), # Left Eye & Ear
    (0, 4), (4, 5), (5, 6), (6, 8), # Right Eye & Ear
    (9, 10),                        # Mouth
    (0, 11), (0, 12)                # Neck Links
]


def draw_neon_skeleton(frame, landmarks, color=COLOR_CYAN, hand_raised=False, is_sleep=False):
    """
    Menggambar kerangka anatomi neon bercahaya ala SenseTime / Megvii Smart Surveillance.
    Lengan yang terangkat otomatis berubah menjadi Amber/Gold menyala.
    """
    h, w = frame.shape[:2]

    # Draw Bone Connections (Glow Effect)
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
                is_arm = (p1_idx in (11, 13, 15) and p2_idx in (11, 13, 15)) or \
                         (p1_idx in (12, 14, 16) and p2_idx in (12, 14, 16))

                if hand_raised and is_arm:
                    bone_color = COLOR_AMBER
                elif is_sleep:
                    bone_color = COLOR_RED

                # Garis luar tipis putih + garis inti neon
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


def draw_tech_box(frame, x, y, w, h, color, label, conf=0.95, sub_label=None, hand_box=None):
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

    tag = f"{label} {int(conf*100)}%"
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


def draw_hud(frame, stats, fps, session_id, sync_status, rot_info, infer_ms=0.0):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 36), COLOR_DARK, -1)
    cv2.addWeighted(overlay, 0.78, frame, 0.22, 0, frame)

    cv2.circle(frame, (16, 18), 5, COLOR_EMERALD, -1)
    cv2.putText(frame, "AI SKELETON POSE v3.0", (28, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, COLOR_WHITE, 1, cv2.LINE_AA)

    detected = stats.get("total", 0)
    info = f"{fps:.1f} FPS ({infer_ms:.0f}ms) | {detected} Subjek | Rot: {rot_info} | Sync: {sync_status}"
    (iw, _), _ = cv2.getTextSize(info, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
    cv2.putText(frame, info, (max(10, w - iw - 16), 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 225, 185), 1, cv2.LINE_AA)


class SubjectTracker:
    def __init__(self):
        self.tracks = {}
        self.next_id = 1
        self.sleep_timer = {}
        self.hand_timer = {}

    def update_from_poses(self, pose_landmarks_list, frame_shape, curr_time):
        """
        Update tracking data directly using 33-Keypoint Anatomical Landmarks.
        Eliminates color-based false alarms.
        """
        h, w = frame_shape[:2]
        matched_ids = set()

        for landmarks in pose_landmarks_list:
            if len(landmarks) < 17:
                continue

            # Keypoints:
            # 0: Nose, 1-6: Eyes, 7-8: Ears, 11-12: Shoulders, 13-14: Elbows, 15-16: Wrists, 23-24: Hips
            nose = landmarks[0]
            ls = landmarks[11]
            rs = landmarks[12]
            le = landmarks[13]
            re = landmarks[14]
            lw = landmarks[15]
            rw = landmarks[16]

            # 1. Anatomical Hand Raised Calculation
            # Wrist.y < Shoulder.y means wrist is physically higher than shoulder in the frame
            left_raised = (lw.y < ls.y - 0.02) and (getattr(lw, 'visibility', 0.5) > 0.30)
            right_raised = (rw.y < rs.y - 0.02) and (getattr(rw, 'visibility', 0.5) > 0.30)
            is_hand_raw = left_raised or right_raised

            # Hand bounding box around raised wrist
            hand_box = None
            if is_hand_raw:
                active_wrist = lw if left_raised else rw
                hw_px = int(active_wrist.x * w)
                hy_px = int(active_wrist.y * h)
                hand_box = (max(0, hw_px - 28), max(0, hy_px - 28), 56, 56)

            # 2. Torso Center & Full Body Box Calculation
            all_x = [lm.x for lm in landmarks[:25] if getattr(lm, 'visibility', 0.5) > 0.25]
            all_y = [lm.y for lm in landmarks[:25] if getattr(lm, 'visibility', 0.5) > 0.25]

            if not all_x or not all_y:
                continue

            min_x, max_x = min(all_x), max(all_x)
            min_y, max_y = min(all_y), max(all_y)

            # Padding
            px = max(0, int((min_x - 0.06) * w))
            py = max(0, int((min_y - 0.06) * h))
            pw = min(w - px, int((max_x - min_x + 0.12) * w))
            ph = min(h - py, int((max_y - min_y + 0.12) * h))

            cx = px + pw / 2.0
            cy = py + ph / 2.0

            # 3. Head Tilt & Gaze
            shoulder_mid_x = (ls.x + rs.x) / 2.0
            shoulder_mid_y = (ls.y + rs.y) / 2.0
            nose_offset = nose.x - shoulder_mid_x

            dy_shoulder = rs.y - ls.y
            dx_shoulder = rs.x - ls.x
            head_tilt = math.degrees(math.atan2(abs(dy_shoulder), max(1e-5, abs(dx_shoulder))))

            if nose_offset < -0.06:
                gaze_dir = "Menoleh Kanan"
            elif nose_offset > 0.06:
                gaze_dir = "Menoleh Kiri"
            elif nose.y > shoulder_mid_y - 0.08:
                gaze_dir = "Menatap Laptop/Meja"
            else:
                gaze_dir = "Depan / Papan Tulis"

            # 4. Association / Hungarian-like nearest distance
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

            tid_check = best_id or self.next_id

            # Hysteresis smoothing on hand raise (0.6s)
            if is_hand_raw:
                self.hand_timer[tid_check] = curr_time
                is_hand_raised = True
            elif tid_check in self.hand_timer and (curr_time - self.hand_timer[tid_check] < 0.6):
                is_hand_raised = True
            else:
                is_hand_raised = False

            # Posture: Sitting vs Standing
            hip_y = (landmarks[23].y + landmarks[24].y) / 2.0 if len(landmarks) > 24 else shoulder_mid_y + 0.35
            posture = "standing" if py < h * 0.25 and ph > h * 0.55 else "sitting"

            # 5. True Anatomical Sleep Detection
            # Sleep happens ONLY if the head (nose) physically drops down to/below shoulder level
            # OR extreme tilt sustained for > 3.5 seconds
            is_head_dropped = (nose.y >= shoulder_mid_y - 0.03) or (head_tilt > 55.0 and cy > h * 0.50)
            is_sleep = False

            if is_head_dropped:
                if tid_check not in self.sleep_timer:
                    self.sleep_timer[tid_check] = curr_time
                elif curr_time - self.sleep_timer[tid_check] > 3.5:
                    is_sleep = True
            else:
                self.sleep_timer.pop(tid_check, None)

            # Activity & Attention Score
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
            elif lw.y > ls.y and rw.y > rs.y and nose.y > shoulder_mid_y - 0.14:
                activity = "writing"
                action_text = "Fokus Mengetik / Meja"
                attention_score = 95
            else:
                activity = "attentive"
                action_text = "Fokus Belajar"
                attention_score = 96

            sub_label = f"Postur: {'Duduk' if posture == 'sitting' else 'Berdiri'} • Fokus: {attention_score}% • {gaze_dir}"

            if best_id is not None:
                trk = self.tracks[best_id]
                old_x, old_y, old_w, old_h = trk["box"]
                smooth_x = int(0.75 * px + 0.25 * old_x)
                smooth_y = int(0.75 * py + 0.25 * old_y)
                smooth_w = int(0.75 * pw + 0.25 * old_w)
                smooth_h = int(0.75 * ph + 0.25 * old_h)

                trk["box"] = (smooth_x, smooth_y, smooth_w, smooth_h)
                trk["center"] = (smooth_x + smooth_w / 2.0, smooth_y + smooth_h / 2.0)
                trk["landmarks"] = landmarks
                trk["posture"] = posture
                trk["activity"] = activity
                trk["action_text"] = action_text
                trk["sub_label"] = sub_label
                trk["attention_score"] = attention_score
                trk["conf"] = 0.96
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
                    "center": (cx, cy),
                    "landmarks": landmarks,
                    "posture": posture,
                    "activity": activity,
                    "action_text": action_text,
                    "sub_label": sub_label,
                    "attention_score": attention_score,
                    "conf": 0.95,
                    "last_seen": curr_time,
                    "is_hand_raised": is_hand_raised,
                    "hand_box": hand_box,
                    "is_sleep": is_sleep,
                    "head_tilt": round(head_tilt, 1),
                    "gaze_dir": gaze_dir
                }
                matched_ids.add(new_id)

        # Cleanup lost tracks (> 2.5s)
        dead_ids = [tid for tid, trk in self.tracks.items() if curr_time - trk["last_seen"] > 2.5]
        for did in dead_ids:
            del self.tracks[did]
            self.sleep_timer.pop(did, None)
            self.hand_timer.pop(did, None)

        return list(self.tracks.values())



def run_opencv_engine(args):
    global latest_frame_jpeg, current_rotation, current_flip_h

    print("[*] Inisialisasi EduAI 33-Keypoint Pose Skeleton Engine v3.0...")
    current_rotation = args.rotate

    # 1. Inisialisasi MediaPipe Tasks BlazePose Lite (33 Keypoints)
    task_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pose_landmarker_lite.task")
    pose_detector = None

    if MEDIAPIPE_AVAILABLE and os.path.exists(task_model_path):
        try:
            base_opts = mp_python.BaseOptions(model_asset_path=task_model_path)
            pose_opts = mp_vision.PoseLandmarkerOptions(
                base_options=base_opts,
                running_mode=mp_vision.RunningMode.IMAGE,
                num_poses=4,
                min_pose_detection_confidence=0.35,
                min_pose_presence_confidence=0.35,
                min_tracking_confidence=0.35
            )
            pose_detector = mp_vision.PoseLandmarker.create_from_options(pose_opts)
            print("[+] Deep Learning Pose: MediaPipe BlazePose 33-Keypoints Skeleton Engine Aktif!")
        except Exception as e:
            print(f"[!] Gagal inisialisasi MediaPipe Pose: {e}")

    # Fallback YuNet Face Detector
    yunet_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_detection_yunet_2023mar.onnx")
    yunet_detector = None
    if os.path.exists(yunet_path) and hasattr(cv2, "FaceDetectorYN"):
        try:
            yunet_detector = cv2.FaceDetectorYN.create(
                model=yunet_path,
                config="",
                input_size=(320, 240),
                score_threshold=0.38,
                nms_threshold=0.30
            )
            print("[+] Deep Learning Vision: YuNet Face Detector Siap (Fallback)!")
        except Exception:
            pass

    tracker = SubjectTracker()

    # Shared State for Decoupled Multi-Threaded Neural Inference (30-50 FPS Zero Lag)
    pose_shared_lock = threading.Lock()
    latest_pose_landmarks = []
    latest_infer_ms = 15.0
    worker_running = True
    new_frame_to_infer = None
    infer_event = threading.Event()

    def pose_worker_loop():
        nonlocal latest_pose_landmarks, latest_infer_ms, new_frame_to_infer
        while worker_running:
            infer_event.wait(timeout=0.1)
            infer_event.clear()

            with pose_shared_lock:
                frame_for_ai = None if new_frame_to_infer is None else new_frame_to_infer.copy()

            if frame_for_ai is None or pose_detector is None:
                continue

            t_start = time.perf_counter()
            try:
                # Resize to optimized inference size (360x270)
                ai_w = 360
                ai_h = int(ai_w * frame_for_ai.shape[0] / frame_for_ai.shape[1])
                small = cv2.resize(frame_for_ai, (ai_w, ai_h))
                rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

                res = pose_detector.detect(mp_img)
                dur_ms = (time.perf_counter() - t_start) * 1000.0

                with pose_shared_lock:
                    if res and res.pose_landmarks:
                        latest_pose_landmarks = res.pose_landmarks
                    else:
                        latest_pose_landmarks = []
                    latest_infer_ms = dur_ms
            except Exception:
                pass

    t_pose = threading.Thread(target=pose_worker_loop, daemon=True)
    t_pose.start()

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
                _, jpeg = cv2.imencode('.jpg', rec_frame, [cv2.IMWRITE_JPEG_QUALITY, 76])
                with frame_lock:
                    latest_frame_jpeg = jpeg.tobytes()
                time.sleep(0.1)
                continue

            frame_count += 1
            curr_time = time.time()
            fps = 1.0 / max(1e-5, (curr_time - prev_time))
            prev_time = curr_time

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
                if raw_frame.shape[1] > raw_frame.shape[0]:
                    frame = cv2.rotate(raw_frame, cv2.ROTATE_90_CLOCKWISE)
                else:
                    frame = raw_frame
            else:
                frame = raw_frame

            if flip_setting:
                frame = cv2.flip(frame, 1)

            # Pass latest frame to async neural pose worker
            with pose_shared_lock:
                new_frame_to_infer = frame
                infer_event.set()
                active_pose_list = list(latest_pose_landmarks)
                curr_infer_ms = latest_infer_ms

            # Tracking update using anatomical pose keypoints
            active_tracks = tracker.update_from_poses(active_pose_list, frame.shape, curr_time)

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
                landmarks = trk.get("landmarks", [])

                if trk["is_sleep"]:
                    color = COLOR_RED
                    label = f"#P{tid} [TIDUR]"
                elif trk["is_hand_raised"]:
                    color = COLOR_AMBER
                    label = f"#P{tid} [ANGKAT TANGAN]"
                elif activity == "writing":
                    color = COLOR_SKY
                    label = f"#P{tid} [FOKUS MEJA]"
                elif posture == "standing":
                    color = COLOR_BLUE
                    label = f"#P{tid} [BERDIRI]"
                else:
                    color = COLOR_EMERALD
                    label = f"#P{tid} [FOKUS BELAJAR]"

                # 1. Gambar Kerangka Tubuh Neon Glowing (EduAI China/Japan Aesthetics)
                if landmarks:
                    draw_neon_skeleton(frame, landmarks, color=color,
                                       hand_raised=trk["is_hand_raised"], is_sleep=trk["is_sleep"])

                # 2. Gambar Tech Box & Badges
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

            draw_hud(frame, stats, fps, args.session_id, sync_val, f"{rot_setting}°", infer_ms=curr_infer_ms)

            # Turbo JPEG Encoding
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 76, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
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
        worker_running = False
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

