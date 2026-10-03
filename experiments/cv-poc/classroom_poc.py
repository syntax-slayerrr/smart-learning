#!/usr/bin/env python3
"""
AI Classroom Intelligence — Computer Vision Proof-of-Concept (PoC)
------------------------------------------------------------------
Fungsi:
1. Membaca kamera (Webcam laptop = 0, Kamera HP = URL RTSP/HTTP, atau File Video).
2. Menjalankan Multi-Person Pose Estimation (YOLOv8-Pose).
3. Melacak objek secara anonim (ByteTrack).
4. Mengekstraksi 3 Observable Behaviors:
   - Sitting vs Standing
   - Hand Raising (Angkat Tangan)
   - Head Gaze Vector Proxy (Arah Hadap Kepala)
5. Menampilkan live HUD visualisasi & mencetak payload JSON telemetri.

Lisensi: Proprietary - Smart Learning Platform
"""

import argparse
import json
import time
from datetime import datetime
import cv2
import numpy as np

try:
    from ultralytics import YOLO
except ImportError:
    print("\n[ERROR] Modul 'ultralytics' belum terinstal.")
    print("Silakan jalankan: pip install -r requirements.txt\n")
    exit(1)


# COCO Pose 17 Keypoints Index Map:
# 0: Nose, 1: L-Eye, 2: R-Eye, 3: L-Ear, 4: R-Ear
# 5: L-Shoulder, 6: R-Shoulder, 7: L-Elbow, 8: R-Elbow, 9: L-Wrist, 10: R-Wrist
# 11: L-Hip, 12: R-Hip, 13: L-Knee, 14: R-Knee, 15: L-Ankle, 16: R-Ankle
SKELETON_CONNECTIONS = [
    (0, 1), (0, 2), (1, 3), (2, 4),        # Facial lines
    (5, 6),                                # Shoulders
    (5, 7), (7, 9),                        # Left arm
    (6, 8), (8, 10),                       # Right arm
    (5, 11), (6, 12), (11, 12),            # Torso
    (11, 13), (13, 15),                    # Left leg
    (12, 14), (14, 16)                     # Right leg
]


def extract_behaviors(keypoints, bbox):
    """
    Mengekstraksi Observable Behaviors murni berbasis geometris & kinematika pose.
    Tidak ada psikologis labeling.
    """
    # Keypoints: [17, 3] -> (x, y, confidence)
    x1, y1, x2, y2 = bbox
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    aspect_ratio = box_h / box_w

    conf = keypoints[:, 2]

    # --- 1. Hand Raising Detection ---
    # Tangan terangkat jika pergelangan tangan (wrist) berada di atas hidung atau bahu
    is_hand_raised = False
    nose_y = keypoints[0, 1] if conf[0] > 0.4 else None
    l_shoulder_y = keypoints[5, 1] if conf[5] > 0.4 else None
    r_shoulder_y = keypoints[6, 1] if conf[6] > 0.4 else None

    ref_upper_y = None
    if nose_y is not None:
        ref_upper_y = nose_y
    elif l_shoulder_y is not None and r_shoulder_y is not None:
        ref_upper_y = min(l_shoulder_y, r_shoulder_y)

    if ref_upper_y is not None:
        # Left wrist (9) or Right wrist (10)
        l_wrist_y = keypoints[9, 1] if conf[9] > 0.4 else 99999
        r_wrist_y = keypoints[10, 1] if conf[10] > 0.4 else 99999
        # Perhatikan: koordinat y berjalan dari 0 (atas) ke H (bawah)
        if l_wrist_y < ref_upper_y or r_wrist_y < ref_upper_y:
            is_hand_raised = True

    # --- 2. Sitting vs Standing Detection ---
    # Heuristik gabungan: Aspek rasio bounding box + posisi pinggul ke lutut
    posture = "sitting"
    l_hip_y = keypoints[11, 1] if conf[11] > 0.3 else None
    r_hip_y = keypoints[12, 1] if conf[12] > 0.3 else None
    l_knee_y = keypoints[13, 1] if conf[13] > 0.3 else None
    r_knee_y = keypoints[14, 1] if conf[14] > 0.3 else None

    # Jika lutut terdeteksi jelas (tidak terhalang meja):
    if (l_hip_y and l_knee_y) or (r_hip_y and r_knee_y):
        hip_y = np.mean([y for y in [l_hip_y, r_hip_y] if y is not None])
        knee_y = np.mean([y for y in [l_knee_y, r_knee_y] if y is not None])
        leg_span = abs(knee_y - hip_y)
        # Jika paha memanjang vertikal signifikan
        if leg_span > box_h * 0.35 and aspect_ratio > 1.9:
            posture = "standing"
        else:
            posture = "sitting"
    else:
        # Fallback ke aspek rasio bounding box (oklusi meja umum di kelas)
        if aspect_ratio >= 2.0:
            posture = "standing"
        else:
            posture = "sitting"

    # --- 3. Head Gaze Vector Proxy (Yaw) ---
    orientation = "center"
    if conf[0] > 0.4 and conf[1] > 0.4 and conf[2] > 0.4:
        nose_x = keypoints[0, 0]
        l_eye_x = keypoints[1, 0]
        r_eye_x = keypoints[2, 0]
        d_left = abs(nose_x - l_eye_x)
        d_right = abs(nose_x - r_eye_x)
        total_d = d_left + d_right + 1e-6
        yaw_ratio = (d_left - d_right) / total_d

        if yaw_ratio > 0.35:
            orientation = "right"
        elif yaw_ratio < -0.35:
            orientation = "left"
        else:
            orientation = "center"

    return {
        "posture": posture,
        "is_hand_raised": is_hand_raised,
        "orientation": orientation
    }


def draw_hud(frame, stats, fps):
    """Menggambar Heads-Up Display (HUD) modern & bersih di bagian atas frame."""
    h, w = frame.shape[:2]
    # Overlay gelap transparan di bagian atas
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 65), (15, 17, 23), -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

    # Garis aksen biru di bawah HUD
    cv2.line(frame, (0, 65), (w, 65), (235, 99, 37), 2)  # BGR: #2563eb

    # Judul Sistem
    cv2.putText(frame, "AI CLASSROOM INTELLIGENCE", (20, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, f"FPS: {fps:.1f} | Observable Behavior POC", (20, 48),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 185, 195), 1, cv2.LINE_AA)

    # Metrik Kelas Real-Time
    badges = [
        (f"Total: {stats['total']}", (220, 220, 220)),
        (f"Sitting: {stats['sitting']}", (120, 200, 120)),
        (f"Standing: {stats['standing']}", (80, 180, 240)),
        (f"Hand Raised: {stats['hands_raised']}", (80, 120, 255) if stats['hands_raised'] > 0 else (160, 160, 160))
    ]

    offset_x = w - 460
    for label, color in badges:
        cv2.rectangle(frame, (offset_x - 6, 18), (offset_x + len(label) * 9 + 8, 48), (35, 38, 48), -1)
        cv2.putText(frame, label, (offset_x, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, color, 1, cv2.LINE_AA)
        offset_x += len(label) * 9 + 24


def draw_skeleton(frame, keypoints, color=(0, 255, 200)):
    """Menggambar garis kerangka pose 17 titik."""
    conf = keypoints[:, 2]
    pts = [(int(k[0]), int(k[1])) for k in keypoints]

    for p1, p2 in SKELETON_CONNECTIONS:
        if conf[p1] > 0.4 and conf[p2] > 0.4:
            cv2.line(frame, pts[p1], pts[p2], color, 2, cv2.LINE_AA)

    for i in range(17):
        if conf[i] > 0.4:
            cv2.circle(frame, pts[i], 3, (255, 255, 255), -1, cv2.LINE_AA)


def main():
    parser = argparse.ArgumentParser(description="AI Classroom Intelligence - PoC")
    parser.add_argument("--source", type=str, default="0",
                        help="Video source: '0' (Webcam), RTSP/HTTP URL, atau file MP4")
    parser.add_argument("--model", type=str, default="yolov8n-pose.pt",
                        help="Model YOLOv8-pose: yolov8n-pose.pt / yolov8s-pose.pt")
    parser.add_argument("--conf", type=float, default=0.45,
                        help="Confidence threshold")
    parser.add_argument("--json-interval", type=int, default=5,
                        help="Interval waktu (detik) untuk mencetak telemetry JSON ke konsol")
    args = parser.parse_args()

    # Parse camera source
    src = int(args.source) if args.source.isdigit() else args.source

    print("=" * 60)
    print("  AI CLASSROOM INTELLIGENCE — LOCAL PROOF-OF-CONCEPT")
    print("=" * 60)
    print(f"[*] Membuka Video Source: {src}")
    print(f"[*] Memuat Model: {args.model}")

    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        print(f"\n[ERROR] Gagal membuka video source: {src}")
        print("Tips:")
        print(" - Jika memakai webcam laptop, pastikan izin kamera aktif.")
        print(" - Jika memakai kamera HP via IP Webcam, pastikan HP & Laptop di Wi-Fi yang sama.")
        return

    # Inisialisasi Model YOLOv8 Pose
    print("[*] Mengunduh/Menginisialisasi weights model...")
    model = YOLO(args.model)
    print("[+] Model siap! Tekan 'q' atau 'ESC' pada jendela kamera untuk keluar.\n")

    prev_time = time.time()
    last_json_time = time.time()
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[*] Stream video selesai atau terputus.")
            break

        frame_count += 1
        curr_time = time.time()
        fps = 1.0 / max(1e-5, (curr_time - prev_time))
        prev_time = curr_time

        # Inferensi Pose & Multi-Object Tracking (ByteTrack)
        results = model.track(
            frame,
            persist=True,
            conf=args.conf,
            verbose=False,
            tracker="bytetrack.yaml"
        )

        stats = {
            "total": 0,
            "sitting": 0,
            "standing": 0,
            "hands_raised": 0
        }
        telemetry_tracks = []

        if results and len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = (
                results[0].boxes.id.int().cpu().numpy()
                if results[0].boxes.id is not None
                else list(range(len(boxes)))
            )
            keypoints_all = (
                results[0].keypoints.data.cpu().numpy()
                if results[0].keypoints is not None
                else []
            )

            stats["total"] = len(boxes)

            for i in range(len(boxes)):
                bbox = boxes[i]
                tid = track_ids[i]
                kpts = keypoints_all[i] if i < len(keypoints_all) else None

                if kpts is None or len(kpts) == 0:
                    continue

                # Ekstraksi perilaku
                behaviors = extract_behaviors(kpts, bbox)

                if behaviors["posture"] == "sitting":
                    stats["sitting"] += 1
                else:
                    stats["standing"] += 1

                if behaviors["is_hand_raised"]:
                    stats["hands_raised"] += 1

                # Simpan metadata anonim
                telemetry_tracks.append({
                    "anonymous_id": f"P{tid}",
                    "posture": behaviors["posture"],
                    "hand_raised": behaviors["is_hand_raised"],
                    "orientation": behaviors["orientation"],
                    "box_center": [float((bbox[0] + bbox[2]) / 2), float((bbox[1] + bbox[3]) / 2)]
                })

                # --- VISUALISASI FRAME ---
                x1, y1, x2, y2 = [int(v) for v in bbox]

                # Warna dinamis: Merah/Kuning jika angkat tangan, Hijau/Biru jika biasa
                if behaviors["is_hand_raised"]:
                    box_color = (60, 140, 255)  # Bright Orange/Amber
                    status_text = f"#P{tid} [HAND RAISED]"
                elif behaviors["posture"] == "standing":
                    box_color = (255, 180, 50)  # Light Blue
                    status_text = f"#P{tid} [Standing | {behaviors['orientation']}]"
                else:
                    box_color = (100, 220, 100) # Emerald
                    status_text = f"#P{tid} [Sitting | {behaviors['orientation']}]"

                # Gambar Skeleton & Bounding Box
                draw_skeleton(frame, kpts, color=box_color)
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2, cv2.LINE_AA)

                # Badge Label di atas Bounding Box
                label_size = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
                cv2.rectangle(frame, (x1, y1 - 22), (x1 + label_size[0] + 8, y1), box_color, -1)
                cv2.putText(frame, status_text, (x1 + 4, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # Gambar HUD atas
        draw_hud(frame, stats, fps)

        # Tampilkan Jendela Live
        cv2.imshow("AI Classroom Intelligence - PoC Preview", frame)

        # Cetak Telemetry JSON secara berkala ke konsol
        if curr_time - last_json_time >= args.json_interval:
            payload = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "frame_id": frame_count,
                "summary": stats,
                "anonymized_tracks": telemetry_tracks
            }
            print("\n[TELEMETRY JSON PAYLOAD GENERATED (Ready for Cloud API)]:")
            print(json.dumps(payload, indent=2))
            last_json_time = curr_time

        # Tombol Exit: 'q' atau ESC
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            print("\n[*] Menutup preview kamera...")
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[+] Program selesai dengan sukses.")


if __name__ == "__main__":
    main()
