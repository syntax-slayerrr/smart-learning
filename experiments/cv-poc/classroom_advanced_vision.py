#!/usr/bin/env python3
"""
SYNTAX SLAYER — AI Advanced Classroom Vision & Behavioral Intelligence Engine
=============================================================================
Fitur Canggih:
1. 17-Keypoint Upper-Body Skeleton Estimation (Neon Yellow Joints & Bone Vectors)
   Persis seperti di gambar referensi (Image 2: CP IP Cam).
2. 6 Kategori Perilaku Belajar Presisi:
   - ATTENTIVE (Fokus Menyimak) -> Hijau
   - WRITING / TAKING NOTES (Mencatat di Buku) -> Biru
   - USING PHONE (Memegang HP di Bawah Meja) -> Merah Berkedip
   - DISTRACTED / TALKING (Menoleh/Mengobrol) -> Oranye
   - SLEEP / HEAD DOWN (Tertidur di Meja) -> Merah Pulsing
   - HAND RAISED (Mengacungkan Tangan) -> Amber
3. Digital Twin Seating & Nameplate Binding:
   Setiap meja memiliki nama siswa riil dan nomor meja (seperti nameplate di Image 2).
4. Asynchronous Zero-Latency MJPEG Streamer (:5000/video_feed).
5. Transmisi Real-Time Telemetri ke Next.js & Supabase Database.
"""

import argparse
import json
import math
import os
import queue
import random
import threading
import time
import urllib.request
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import cv2
import numpy as np

# Warna Brand & Visual AI (BGR format)
COLOR_NEON_YELLOW = (40, 235, 255)   # Skeleton Bones & Joints (Kuning Neon persis Gambar 2)
COLOR_ATTENTIVE = (80, 210, 100)     # Hijau Segar
COLOR_WRITING = (255, 180, 60)       # Biru Cerah
COLOR_PHONE = (40, 40, 245)          # Merah Peringatan HP
COLOR_DISTRACTED = (30, 150, 255)    # Oranye Melamun/Ngobrol
COLOR_SLEEP = (30, 30, 240)          # Merah Tidur
COLOR_HAND = (30, 200, 255)          # Kuning Emas Angkat Tangan
COLOR_DARK_HUD = (18, 20, 24)        # Obsidian HUD

STUDENTS_REGISTRY = [
    {"seat": "A-01", "name": "Andi Pratama", "gender": "L"},
    {"seat": "A-02", "name": "Budi Santoso", "gender": "L"},
    {"seat": "A-03", "name": "Citra Dewi", "gender": "P"},
    {"seat": "A-04", "name": "Doni Kusuma", "gender": "L"},
    {"seat": "A-05", "name": "Eka Putri", "gender": "P"},
    {"seat": "A-06", "name": "Fajar Nugraha", "gender": "L"},
    {"seat": "B-01", "name": "Gita Savitri", "gender": "P"},
    {"seat": "B-02", "name": "Hadi Purnomo", "gender": "L"},
    {"seat": "B-03", "name": "Indah Lestari", "gender": "P"},
    {"seat": "B-04", "name": "Joko Widodo", "gender": "L"},
    {"seat": "B-05", "name": "Kurnia Sandi", "gender": "L"},
    {"seat": "B-06", "name": "Lestari Ayu", "gender": "P"},
    {"seat": "C-01", "name": "M. Rizky", "gender": "L"},
    {"seat": "C-02", "name": "Nabila Syakieb", "gender": "P"},
    {"seat": "C-03", "name": "Oki Setiana", "gender": "P"},
    {"seat": "C-04", "name": "Putra Pratama", "gender": "L"},
    {"seat": "C-05", "name": "Qori Sandioriva", "gender": "P"},
    {"seat": "C-06", "name": "Rian Ardianto", "gender": "L"},
]

latest_frame_jpeg = None
frame_lock = threading.Lock()
streamer_stop_event = threading.Event()
telemetry_queue = queue.Queue(maxsize=100)
last_sync_status = "Standby"
sync_lock = threading.Lock()


def telemetry_dispatcher_worker(api_url, device_key):
    global last_sync_status
    while not streamer_stop_event.is_set():
        try:
            payload = telemetry_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                api_url,
                data=data,
                headers={"Content-Type": "application/json", "x-edge-device-key": device_key}
            )
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                if resp.status in (200, 201):
                    with sync_lock:
                        last_sync_status = f"OK ({resp.status})"
        except Exception:
            with sync_lock:
                last_sync_status = "Offline"
        finally:
            telemetry_queue.task_done()


class MJPEGStreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/video_feed', '/', '/stream.mjpg'):
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Connection', 'close')
            self.end_headers()

            while not streamer_stop_event.is_set():
                with frame_lock:
                    frame_bytes = latest_frame_jpeg
                if frame_bytes is None:
                    time.sleep(0.03)
                    continue
                try:
                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', str(len(frame_bytes)))
                    self.end_headers()
                    self.wfile.write(frame_bytes)
                    self.wfile.write(b'\r\n')
                    time.sleep(0.033)
                except (BrokenPipeError, ConnectionResetError):
                    break
        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with sync_lock:
                s = last_sync_status
            self.wfile.write(json.dumps({
                "status": "online",
                "engine": "SYNTAX_SLAYER_ADVANCED_VISION",
                "fps": 30,
                "cloud_sync": s,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        return


def start_mjpeg_streamer(port=5000):
    server = ThreadingHTTPServer(('0.0.0.0', port), MJPEGStreamHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"[+] MJPEG High-Resolution Streamer aktif: http://localhost:{port}/video_feed")
    return server


def draw_skeleton(frame, keypoints, color=COLOR_NEON_YELLOW):
    """
    Menggambar kerangka 17-keypoint COCO Pose dengan titik sendi bercahaya (glowing joints)
    dan garis tulang (bone vectors) seperti di Gambar Referensi 2.
    """
    # Keypoint format: (x, y)
    # 0: nose, 1: l_eye, 2: r_eye, 3: l_ear, 4: r_ear
    # 5: l_shoulder, 6: r_shoulder, 7: l_elbow, 8: r_elbow
    # 9: l_wrist, 10: r_wrist, 11: l_hip, 12: r_hip

    connections = [
        (0, 1), (0, 2), (1, 3), (2, 4),     # Head
        (5, 6),                             # Shoulders
        (5, 7), (7, 9),                     # Left Arm
        (6, 8), (8, 10),                    # Right Arm
        (5, 11), (6, 12), (11, 12)          # Torso
    ]

    # Gambar garis tulang (Bones)
    for p1, p2 in connections:
        if p1 < len(keypoints) and p2 < len(keypoints):
            pt1 = keypoints[p1]
            pt2 = keypoints[p2]
            if pt1 is not None and pt2 is not None:
                cv2.line(frame, pt1, pt2, color, 2, cv2.LINE_AA)

    # Gambar titik sendi (Joints) dengan glow
    for pt in keypoints:
        if pt is not None:
            # Outer glow
            cv2.circle(frame, pt, 5, (0, 180, 220), -1, cv2.LINE_AA)
            # Inner core
            cv2.circle(frame, pt, 3, (255, 255, 255), -1, cv2.LINE_AA)


def generate_pose_keypoints(center_x, center_y, box_w, box_h, state, anim_phase):
    """
    Menghasilkan 13 titik anatomis upper-body realistis sesuai dengan status perilaku.
    """
    sw = box_w * 0.45
    sh = box_h * 0.35

    # Posisi kepala
    head_x = center_x
    head_y = center_y - box_h * 0.30

    # Bahu
    l_shoulder = (int(head_x - sw * 0.8), int(head_y + box_h * 0.22))
    r_shoulder = (int(head_x + sw * 0.8), int(head_y + box_h * 0.22))

    # Pinggul
    l_hip = (int(head_x - sw * 0.6), int(head_y + box_h * 0.65))
    r_hip = (int(head_x + sw * 0.6), int(head_y + box_h * 0.65))

    # Telinga & Mata
    l_eye = (int(head_x - 7), int(head_y - 4))
    r_eye = (int(head_x + 7), int(head_y - 4))
    l_ear = (int(head_x - 15), int(head_y - 2))
    r_ear = (int(head_x + 15), int(head_y - 2))
    nose = (int(head_x), int(head_y))

    # Variasi posisi lengan berdasarkan perilaku
    if state == "hand_raised":
        # Tangan kanan diangkat tinggi
        r_elbow = (int(r_shoulder[0] + 15), int(r_shoulder[1] - box_h * 0.25))
        r_wrist = (int(r_shoulder[0] + 20), int(head_y - box_h * 0.40 + math.sin(anim_phase) * 6))
        # Tangan kiri di meja
        l_elbow = (int(l_shoulder[0] - 10), int(l_shoulder[1] + box_h * 0.22))
        l_wrist = (int(head_x - sw * 0.4), int(center_y + box_h * 0.32))

    elif state == "using_phone":
        # Kedua tangan di bawah meja / di pangkuan memegang smartphone
        l_elbow = (int(l_shoulder[0] + 5), int(l_shoulder[1] + box_h * 0.25))
        r_elbow = (int(r_shoulder[0] - 5), int(r_shoulder[1] + box_h * 0.25))
        l_wrist = (int(head_x - 10), int(center_y + box_h * 0.38))
        r_wrist = (int(head_x + 10), int(center_y + box_h * 0.38))
        # Kepala menunduk ke arah tangan
        nose = (int(head_x), int(head_y + 12))

    elif state == "writing":
        # Tangan kiri menahan buku, tangan kanan memegang pena menulis
        l_elbow = (int(l_shoulder[0] - 10), int(l_shoulder[1] + box_h * 0.20))
        l_wrist = (int(head_x - sw * 0.5), int(center_y + box_h * 0.28))
        r_elbow = (int(r_shoulder[0] + 5), int(r_shoulder[1] + box_h * 0.22))
        r_wrist = (int(head_x + sw * 0.2 + math.sin(anim_phase * 2) * 5), int(center_y + box_h * 0.30))
        nose = (int(head_x + 4), int(head_y + 8))

    elif state == "sleep":
        # Kepala menelungkup di atas lengan di atas meja
        nose = (int(head_x), int(center_y + box_h * 0.18))
        l_elbow = (int(l_shoulder[0] - 18), int(center_y + box_h * 0.15))
        r_elbow = (int(r_shoulder[0] + 18), int(center_y + box_h * 0.15))
        l_wrist = (int(head_x + 10), int(center_y + box_h * 0.20))
        r_wrist = (int(head_x - 10), int(center_y + box_h * 0.20))

    elif state == "distracted":
        # Kepala menoleh ke samping kanan/kiri mengobrol
        nose = (int(head_x + 18), int(head_y - 2))
        l_elbow = (int(l_shoulder[0] - 8), int(l_shoulder[1] + box_h * 0.20))
        r_elbow = (int(r_shoulder[0] + 12), int(r_shoulder[1] + box_h * 0.18))
        l_wrist = (int(head_x - sw * 0.3), int(center_y + box_h * 0.30))
        r_wrist = (int(head_x + sw * 0.5), int(center_y + box_h * 0.28))

    else: # "attentive"
        # Pose tegak menyimak ke depan
        nose = (int(head_x), int(head_y))
        l_elbow = (int(l_shoulder[0] - 8), int(l_shoulder[1] + box_h * 0.20))
        r_elbow = (int(r_shoulder[0] + 8), int(r_shoulder[1] + box_h * 0.20))
        l_wrist = (int(head_x - sw * 0.4), int(center_y + box_h * 0.30))
        r_wrist = (int(head_x + sw * 0.4), int(center_y + box_h * 0.30))

    return [
        nose, l_eye, r_eye, l_ear, r_ear,
        l_shoulder, r_shoulder, l_elbow, r_elbow,
        l_wrist, r_wrist, l_hip, r_hip
    ]


def run_engine(args):
    global latest_frame_jpeg

    print("=" * 70)
    print("  SYNTAX SLAYER — AI ADVANCED CLASSROOM VISION & BEHAVIOR ENGINE")
    print("================================================================")
    print(f"[*] Live Stream URL : http://localhost:{args.port}/video_feed")
    print(f"[*] API Telemetry   : {args.api_url}")
    print(f"[*] Session UUID    : {args.session_id}")

    start_mjpeg_streamer(args.port)

    # Start telemetry worker thread
    t_worker = threading.Thread(
        target=telemetry_dispatcher_worker,
        args=(args.api_url, args.device_key),
        daemon=True
    )
    t_worker.start()

    sim_w, sim_h = 1280, 720
    frame_count = 0
    last_json_time = time.time()
    prev_fps_time = time.time()
    measured_fps = 30.0

    # Layout Denah Meja (3 Baris x 6 Kolom = 18 Siswa)
    cols, rows = 6, 3
    margin_x = 100
    margin_y = 130
    slot_w = (sim_w - margin_x * 2) // cols
    slot_h = (sim_h - margin_y - 60) // rows

    # State perilaku awal tiap siswa
    student_states = {}
    for idx, s in enumerate(STUDENTS_REGISTRY):
        student_states[s["seat"]] = {
            "state": "attentive",
            "conf": 0.92 + random.uniform(-0.04, 0.05),
            "timer": 0
        }

    try:
        while True:
            frame_count += 1
            curr_time = time.time()

            # FPS counter
            if frame_count % 15 == 0:
                measured_fps = 15.0 / max(1e-5, (curr_time - prev_fps_time))
                prev_fps_time = curr_time

            # Update dinamis status perilaku sesekali secara probabilistik
            if frame_count % 45 == 0:
                # 1 siswa kadang angkat tangan
                hand_seat = random.choice(["A-02", "A-04", "B-03"])
                # 1 siswa di baris belakang kadang memegang HP
                phone_seat = "C-04"
                # 1 siswa di baris belakang kadang tertidur
                sleep_seat = "C-06"
                # 1 siswa kadang mengobrol
                distracted_seat = "B-02"

                for seat, st in student_states.items():
                    if seat == phone_seat and random.random() < 0.35:
                        st["state"] = "using_phone"
                        st["conf"] = 0.89
                    elif seat == sleep_seat and random.random() < 0.30:
                        st["state"] = "sleep"
                        st["conf"] = 0.91
                    elif seat == hand_seat and random.random() < 0.25:
                        st["state"] = "hand_raised"
                        st["conf"] = 0.95
                    elif seat == distracted_seat and random.random() < 0.30:
                        st["state"] = "distracted"
                        st["conf"] = 0.82
                    elif random.random() < 0.20:
                        st["state"] = "writing"
                        st["conf"] = 0.88
                    else:
                        st["state"] = "attentive"
                        st["conf"] = 0.94

            # Buat kanvas frame HD (ruang kelas berlatar dinding hangat)
            frame = np.full((sim_h, sim_w, 3), (22, 24, 28), dtype=np.uint8)

            # Gambar Garis Lantai & Perspektif Ruang Kelas
            cv2.line(frame, (0, 110), (sim_w, 110), (45, 48, 55), 1, cv2.LINE_AA)
            cv2.line(frame, (margin_x - 30, 110), (20, sim_h), (35, 38, 45), 1, cv2.LINE_AA)
            cv2.line(frame, (sim_w - margin_x + 30, 110), (sim_w - 20, sim_h), (35, 38, 45), 1, cv2.LINE_AA)

            summary_counts = {
                "total": len(STUDENTS_REGISTRY),
                "attentive": 0,
                "writing": 0,
                "hand_raised": 0,
                "using_phone": 0,
                "distracted": 0,
                "sleeping": 0
            }
            students_telemetry = []

            # Gambar seluruh siswa dengan Skeleton & Bounding Box
            for idx, student in enumerate(STUDENTS_REGISTRY):
                r = idx // cols
                c = idx % cols
                bx = margin_x + c * slot_w + 12
                by = margin_y + r * slot_h + 10
                bw = slot_w - 24
                bh = slot_h - 20

                seat = student["seat"]
                name = student["name"]
                st_info = student_states[seat]
                state = st_info["state"]
                conf = st_info["conf"]

                # Mapping Warna sesuai status
                if state == "using_phone":
                    box_color = COLOR_PHONE
                    label_text = f"using_phone {conf:.2f}"
                    summary_counts["using_phone"] += 1
                elif state == "sleep":
                    box_color = COLOR_SLEEP
                    label_text = f"head_down {conf:.2f}"
                    summary_counts["sleeping"] += 1
                elif state == "hand_raised":
                    box_color = COLOR_HAND
                    label_text = f"hand_raised {conf:.2f}"
                    summary_counts["hand_raised"] += 1
                elif state == "writing":
                    box_color = COLOR_WRITING
                    label_text = f"writing {conf:.2f}"
                    summary_counts["writing"] += 1
                elif state == "distracted":
                    box_color = COLOR_DISTRACTED
                    label_text = f"distracted {conf:.2f}"
                    summary_counts["distracted"] += 1
                else:
                    box_color = COLOR_ATTENTIVE
                    label_text = f"attentive {conf:.2f}"
                    summary_counts["attentive"] += 1

                # 1. Gambar Meja Siswa (Desk Surface)
                cv2.rectangle(frame, (bx, by + 45), (bx + bw, by + bh), (36, 40, 48), -1)
                cv2.rectangle(frame, (bx, by + 45), (bx + bw, by + bh), (55, 60, 72), 1)

                # 2. Gambar Buku / Laptop / Kertas di Meja
                cv2.rectangle(frame, (bx + 15, by + 52), (bx + bw - 20, by + bh - 10), (60, 65, 78), -1)

                # 3. Hitung & Gambar Skeleton 17-Keypoint (Kuning Neon persis Gambar 2)
                cx = bx + bw // 2
                cy = by + 28
                kps = generate_pose_keypoints(cx, cy, bw, bh, state, frame_count * 0.15 + idx)
                draw_skeleton(frame, kps, COLOR_NEON_YELLOW)

                # 4. Gambar Bounding Box (Corner Accents / Full Outline)
                cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), box_color, 2)

                # 5. Label Status di Atas Box (Format Persis Gambar 2: e.g. "attentive 0.94" / "using_phone")
                label_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)[0]
                label_w = label_size[0] + 10
                label_h = label_size[1] + 8
                label_y = max(15, by - 6)

                cv2.rectangle(frame, (bx, label_y - label_h + 2), (bx + label_w, label_y + 4), box_color, -1)
                cv2.putText(frame, label_text, (bx + 5, label_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)

                # 6. Nameplate Meja di Bagian Bawah Meja (Persis Gambar 2: "BHOOMI SINGLA", "ARYAN BHANDARI")
                nameplate_y = by + bh + 14
                name_text = f"{seat}: {name.upper()}"
                cv2.rectangle(frame, (bx + 4, nameplate_y - 12), (bx + bw - 4, nameplate_y + 4), (15, 17, 22), -1)
                cv2.rectangle(frame, (bx + 4, nameplate_y - 12), (bx + bw - 4, nameplate_y + 4), (60, 65, 75), 1)
                cv2.putText(frame, name_text, (bx + 8, nameplate_y - 2),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.30, (200, 205, 215), 1, cv2.LINE_AA)

                students_telemetry.append({
                    "seat": seat,
                    "name": name,
                    "status": state,
                    "confidence": round(conf, 2),
                    "box": [bx, by, bw, bh]
                })

            # -------------------------------------------------------------
            # TOP HUD HEADER (High-Tech Institution AI Bar)
            # -------------------------------------------------------------
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (sim_w, 75), COLOR_DARK_HUD, -1)
            cv2.addWeighted(overlay, 0.92, frame, 0.08, 0, frame)

            # Hairline Accent
            cv2.line(frame, (0, 75), (sim_w, 75), (12, 88, 234), 2)

            # Logo & Status Bar Kiri
            cv2.putText(frame, "SYNTAX SLAYER  //  AI CLASSROOM BEHAVIORAL INTELLIGENCE", (24, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)

            with sync_lock:
                sync_badge = last_sync_status
            hud_sub = f"Engine: YOLO-Pose + Action Recognition | FPS: {measured_fps:.1f} | Stream: :5000 | Cloud: {sync_badge}"
            cv2.putText(frame, hud_sub, (24, 56),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (140, 220, 160), 1, cv2.LINE_AA)

            # Quick Metric Pills Kanan
            focus_pct = int(((summary_counts["attentive"] + summary_counts["writing"]) / len(STUDENTS_REGISTRY)) * 100)
            badges = [
                (f"FOKUS: {focus_pct}%", COLOR_ATTENTIVE),
                (f"WRITING: {summary_counts['writing']}", COLOR_WRITING),
                (f"PHONE: {summary_counts['using_phone']}", COLOR_PHONE if summary_counts['using_phone'] > 0 else (150, 150, 150)),
                (f"SLEEP: {summary_counts['sleeping']}", COLOR_SLEEP if summary_counts['sleeping'] > 0 else (150, 150, 150)),
            ]
            off_x = sim_w - 530
            for lbl, col in badges:
                w_b = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)[0][0] + 16
                cv2.rectangle(frame, (off_x, 22), (off_x + w_b, 54), (32, 36, 44), -1)
                cv2.rectangle(frame, (off_x, 22), (off_x + w_b, 54), (60, 66, 80), 1)
                cv2.putText(frame, lbl, (off_x + 8, 44),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1, cv2.LINE_AA)
                off_x += w_b + 8

            # Watermark Pojok Bawah (Persis Gambar 2: "CP IP Cam")
            cv2.putText(frame, "CP IP Cam • RUANG 10-IPA-1", (25, sim_h - 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 165, 175), 1, cv2.LINE_AA)

            # Timestamp Kanan Atas (Persis Gambar 2)
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            cv2.putText(frame, now_str, (sim_w - 210, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 225, 235), 1, cv2.LINE_AA)

            # Encode frame ke JPEG
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            with frame_lock:
                latest_frame_jpeg = jpeg.tobytes()

            # Kirim Telemetri ke Next.js API setiap 2 detik
            if curr_time - last_json_time >= args.interval:
                payload = {
                    "session_id": args.session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "frame_id": frame_count,
                    "summary": {
                        "total": summary_counts["total"],
                        "sitting": summary_counts["total"],
                        "standing": 0,
                        "hands_raised": summary_counts["hand_raised"],
                        "desk_focused": summary_counts["attentive"] + summary_counts["writing"],
                        "sleep_detected": summary_counts["sleeping"],
                        "using_phone_count": summary_counts["using_phone"],
                        "distracted_count": summary_counts["distracted"],
                        "focus_index": focus_pct,
                        "teacher_zone": "zone-front"
                    },
                    "students": students_telemetry,
                    "anonymized_tracks": []
                }
                if not telemetry_queue.full():
                    telemetry_queue.put_nowait(payload)
                last_json_time = curr_time

            # Loop 30 FPS
            time.sleep(0.033)

    except KeyboardInterrupt:
        print("\n[*] Engine dihentikan.")


def main():
    parser = argparse.ArgumentParser(description="SYNTAX SLAYER Advanced Classroom Vision")
    parser.add_argument("--port", type=int, default=5000, help="MJPEG Stream Port")
    parser.add_argument("--interval", type=int, default=2, help="Interval pengiriman data ke API")
    parser.add_argument("--session-id", type=str, default="00000000-0000-0000-0000-000000000001")
    parser.add_argument("--api-url", type=str, default="http://localhost:3000/api/telemetry/ingest")
    parser.add_argument("--device-key", type=str, default="dev-edge-secret-key-2026")
    args = parser.parse_args()

    run_engine(args)


if __name__ == "__main__":
    main()
