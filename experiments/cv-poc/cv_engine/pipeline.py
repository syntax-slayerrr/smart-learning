"""
AI Classroom Intelligence — Master Pipeline Orchestrator
=========================================================
Syntax Slayer — Smart Learning Platform
Connects Core AI Vision (Dev 1), Telemetry & Contracts (Dev 2), and Streaming Server (Dev 3).
"""

from datetime import datetime, timezone
import math
import threading
import time
from typing import Optional, Dict, Any, List
import cv2
import numpy as np

from cv_engine.config import (
    EngineConfig,
    COLOR_RED,
    COLOR_AMBER,
    COLOR_SKY,
    COLOR_BLUE,
    COLOR_EMERALD,
    GUARDRAIL_ARCFACE_MATCH_VOTES
)
from cv_engine.core import (
    YOLO26Detector,
    MediaPipePoseDetector,
    FacePipeline,
    SubjectTracker
)
from cv_engine.telemetry import (
    FaceGalleryManager,
    TelemetryDispatcher,
    TelemetryPayload
)
from cv_engine.streaming import (
    ThreadedCamera,
    apply_orientation,
    draw_neon_skeleton,
    draw_tech_box,
    draw_hud
)
from cv_engine.server import (
    StreamServerState,
    start_mjpeg_server
)


def run_pipeline(config: EngineConfig) -> None:
    """
    Main execution loop running the Edge CV pipeline.
    """
    print(f"[*] Initializing AI Classroom Intelligence Engine (SYNTAX SLAYER)...")
    print(f"[*] Config: Source={config.source}, Port={config.port}, Interval={config.interval}s, Rotation={config.rotate}")

    # 1. Initialize Subsystems (Dev 1: Core AI Vision)
    yolo_detector = YOLO26Detector()
    pose_detector = MediaPipePoseDetector()
    face_pipeline = FacePipeline()
    tracker = SubjectTracker()

    # 2. Initialize Subsystems (Dev 2: Telemetry & Face Gallery)
    gallery_manager = FaceGalleryManager()
    dispatcher = TelemetryDispatcher(
        primary_url=config.api_url,
        cloud_url=config.cloud_url,
        device_key=config.device_key
    ).start()

    # 3. Initialize Subsystems (Dev 3: Camera & Streaming Server)
    server_state = StreamServerState(
        gallery_manager=gallery_manager,
        sync_status_fn=dispatcher.get_sync_status
    )
    server_state.set_orientation(rotation=config.rotate, flip_h=config.flip_h)

    server = start_mjpeg_server(config.port, server_state)
    camera = ThreadedCamera(src=config.source, target_fps=config.target_fps).start()

    # Decoupled Inference Worker State
    pose_shared_lock = threading.Lock()
    latest_pose_landmarks: List[Any] = []
    latest_yolo_boxes: List[Any] = []
    latest_infer_ms: float = 25.0
    worker_running: bool = True
    new_frame_to_infer: Optional[np.ndarray] = None
    infer_event = threading.Event()

    def pose_worker_loop():
        nonlocal latest_pose_landmarks, latest_yolo_boxes, latest_infer_ms, new_frame_to_infer
        while worker_running:
            infer_event.wait(timeout=0.1)
            infer_event.clear()

            with pose_shared_lock:
                frame_for_ai = None if new_frame_to_infer is None else new_frame_to_infer.copy()

            if frame_for_ai is None:
                continue

            t_start = time.perf_counter()
            try:
                # 1. Macro YOLO26n Detection
                y_boxes = []
                if yolo_detector.is_available():
                    y_boxes = yolo_detector.detect_persons(
                        frame_for_ai,
                        conf_thresh=config.yolo_conf_thresh,
                        imgsz=config.yolo_imgsz
                    )

                # 2. Micro MediaPipe Heavy 33-point Skeletons
                mp_poses = []
                if pose_detector.is_available():
                    mp_poses = pose_detector.detect_poses(frame_for_ai, infer_width=360)

                dur_ms = (time.perf_counter() - t_start) * 1000.0

                with pose_shared_lock:
                    latest_yolo_boxes = y_boxes
                    latest_pose_landmarks = mp_poses
                    latest_infer_ms = dur_ms
            except Exception:
                pass

    t_pose = threading.Thread(target=pose_worker_loop, daemon=True)
    t_pose.start()

    prev_time = time.time()
    last_json_time = time.time()
    frame_count = 0

    print(f"[+] Engine running successfully at http://localhost:{config.port}/video_feed")

    try:
        while True:
            grabbed, raw_frame = camera.read()
            if not grabbed or raw_frame is None:
                # Standby placeholder frame while camera connects
                rec_frame = np.full((720, 1280, 3), (25, 27, 32), dtype=np.uint8)
                cv2.putText(rec_frame, "MENUNGGU STREAM KAMERA (STANDBY)...", (320, 350),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 220), 2, cv2.LINE_AA)
                cv2.putText(rec_frame, f"Source: {config.source}", (380, 390),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1, cv2.LINE_AA)
                _, jpeg = cv2.imencode('.jpg', rec_frame, [cv2.IMWRITE_JPEG_QUALITY, 76])
                server_state.update_frame(jpeg.tobytes())
                time.sleep(0.1)
                continue

            frame_count += 1
            curr_time = time.time()
            fps = 1.0 / max(1e-5, (curr_time - prev_time))
            prev_time = curr_time

            # Retrieve dynamic orientation
            rot_setting, flip_setting = server_state.get_orientation()
            frame = apply_orientation(raw_frame, rot_setting, flip_setting)
            h, w = frame.shape[:2]

            # Trigger asynchronous AI worker
            with pose_shared_lock:
                new_frame_to_infer = frame
                infer_event.set()
                active_pose_list = list(latest_pose_landmarks)
                active_yolo_boxes = list(latest_yolo_boxes)
                curr_infer_ms = latest_infer_ms

            # Hybrid Tracking & 5 Enterprise Guardrails
            active_tracks = tracker.update_hybrid(active_yolo_boxes, active_pose_list, frame.shape, curr_time)

            # Face Recognition & Enrollment (Every 4th frame or on /register_face trigger)
            if face_pipeline.is_available() and (frame_count % 4 == 0 or gallery_manager.trigger_event.is_set()):
                try:
                    face_matches = face_pipeline.detect_and_extract(frame, infer_width=400)
                    for (rect_lms, feat) in face_matches:
                        # Enrollment trigger
                        if gallery_manager.trigger_event.is_set():
                            p_name = gallery_manager.get_pending_name() or "Zaldy (Siswa)"
                            gallery_manager.register_face(p_name, feat)
                            gallery_manager.clear_trigger()

                        # Cosine similarity matching
                        best_sname, best_sim = gallery_manager.find_match(feat, thresh=config.face_sim_thresh)
                        if best_sname and len(active_tracks) > 0:
                            fcx = rect_lms[0] + rect_lms[2] / 2.0
                            fcy = rect_lms[1] + rect_lms[3] / 2.0
                            for trk in active_tracks:
                                tcx, tcy = trk["center"]
                                if math.hypot(fcx - tcx, fcy - tcy) < 220.0:
                                    # Guardrail 3: Temporal Identity Voting Buffer & Seat Latching
                                    trk.setdefault("identity_votes", {})
                                    trk["identity_votes"][best_sname] = trk["identity_votes"].get(best_sname, 0) + 1
                                    if trk["identity_votes"][best_sname] >= GUARDRAIL_ARCFACE_MATCH_VOTES:
                                        trk["student_name"] = best_sname
                                        trk["is_recognized"] = True
                                        trk["seat_latched"] = True
                                    break
                except Exception:
                    pass

            # Classroom Summary Statistics
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
                st_name = trk.get("student_name", f"Siswa #{tid}")
                is_rec = trk.get("is_recognized", False)

                if trk["is_sleep"]:
                    color = COLOR_RED
                    act_tag = "[TIDUR]"
                elif trk["is_hand_raised"]:
                    color = COLOR_AMBER
                    act_tag = "[ANGKAT TANGAN]"
                elif activity == "writing":
                    color = COLOR_SKY
                    act_tag = "[FOKUS MEJA]"
                elif posture == "standing":
                    color = COLOR_BLUE
                    act_tag = "[BERDIRI]"
                else:
                    color = COLOR_EMERALD
                    act_tag = "[FOKUS BELAJAR]"

                label = f"{st_name} • {act_tag}" if is_rec else f"#{tid} {act_tag}"

                # Draw anatomical glowing skeleton
                if landmarks:
                    draw_neon_skeleton(
                        frame,
                        landmarks,
                        color=color,
                        hand_raised=trk["is_hand_raised"],
                        is_sleep=trk["is_sleep"]
                    )

                # Draw tech bounding box and metrics badge
                draw_tech_box(
                    frame,
                    bx, by, bw, bh,
                    color,
                    label,
                    conf,
                    sub_label=sub_label,
                    hand_box=hand_box
                )

                telemetry_tracks.append({
                    "id": f"P-{tid}",
                    "anonymous_id": f"P{tid}",
                    "label": f"{st_name} ({act_tag})",
                    "student_name": st_name,
                    "is_recognized": is_rec,
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

            # Render top status bar
            draw_hud(
                frame,
                stats,
                fps,
                config.session_id,
                dispatcher.get_sync_status(),
                f"{rot_setting}°",
                infer_ms=curr_infer_ms
            )

            # Compress JPEG for MJPEG streamer
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 76, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
            server_state.update_frame(jpeg.tobytes())

            # Periodic Telemetry Dispatch
            if curr_time - last_json_time >= config.interval:
                payload = TelemetryPayload(
                    session_id=config.session_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    frame_id=frame_count,
                    summary=stats,
                    anonymized_tracks=telemetry_tracks
                ).to_dict()
                dispatcher.enqueue(payload)
                last_json_time = curr_time

    finally:
        worker_running = False
        dispatcher.stop()
        camera.release()
        server_state.stop_event.set()
        print("[*] Engine stopped cleanly.")
