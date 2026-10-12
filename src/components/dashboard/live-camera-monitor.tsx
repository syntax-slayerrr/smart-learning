"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CameraChannel,
  TelemetryPoint,
  DetectedSubject,
  NetworkCameraDevice,
  ScheduleContext,
} from "./camera-monitor/types";
import { MonitorHeader } from "./camera-monitor/MonitorHeader";
import { MultiCameraGrid } from "./camera-monitor/MultiCameraGrid";
import { StreamViewport } from "./camera-monitor/StreamViewport";
import { TelemetryPanel } from "./camera-monitor/TelemetryPanel";
import { CameraSourceModal } from "./camera-monitor/CameraSourceModal";

const INITIAL_DEFAULT_CHANNELS: CameraChannel[] = [
  {
    id: "cam-main",
    name: "Ruang Kelas Utama",
    subject: "Monitoring Presensi & Aktivitas",
    teacher: "Pengampu Kelas",
    streamUrl: "/api/camera/stream?target=video_feed",
    statusUrl: "/api/camera/stream?target=status",
    ipAddress: "Engine Vision :5000",
    port: 5000,
    studentsCount: 0,
    sittingCount: 0,
    standingCount: 0,
    handRaiseCount: 0,
    sleepCount: 0,
    isOnline: true,
  },
];

const LATEST_API_URL = "/api/telemetry/latest?sessionId=00000000-0000-0000-0000-000000000001";

export interface LiveCameraMonitorProps {
  role?: "admin" | "teacher";
  teacherId?: string;
  lockedClassId?: string;
  lockedClassName?: string;
  lockedSubjectName?: string;
}

export function LiveCameraMonitor({
  role = "admin",
  teacherId,
  lockedClassId,
  lockedClassName,
  lockedSubjectName,
}: LiveCameraMonitorProps = {}) {
  const [viewMode, setViewMode] = useState<"single" | "quad">("single");
  const [rightTab, setRightTab] = useState<"digital_twin" | "analytics" | "attendance">("digital_twin");
  const [activeCamIndex, setActiveCamIndex] = useState<number>(0);
  const [streamOnline, setStreamOnline] = useState<boolean>(false);
  const [actualFps, setActualFps] = useState<number>(30);
  const failedStatusCountRef = useRef<number>(0);
  const lastRealtimeEventRef = useRef<number>(0);
  const [smoothedFocusIndex, setSmoothedFocusIndex] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<DetectedSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<DetectedSubject | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    id: "init",
    session_id: "00000000-0000-0000-0000-000000000001",
    timestamp_bucket: new Date().toISOString(),
    detected_students_count: 0,
    sitting_count: 0,
    standing_count: 0,
    hand_raise_count: 0,
    desk_focused_count: 0,
    sleep_detected_count: 0,
    active_clusters_count: 0,
    teacher_zone: "zone-front",
  });

  const [history, setHistory] = useState<
    {
      time: string;
      attentive: number;
      writing: number;
      phone: number;
      sleeping: number;
    }[]
  >([]);

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hermesNudge, setHermesNudge] = useState<string | null>(null);
  const [isNudgeLoading, setIsNudgeLoading] = useState<boolean>(false);
  const [scheduleContext, setScheduleContext] = useState<ScheduleContext | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(true);
  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoImgRef = useRef<HTMLImageElement>(null);

  const [cameraRotation, setCameraRotation] = useState<string>("auto");
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<"portrait" | "landscape">("portrait");

  // Dynamic Camera Source Switching States
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [availableWebcams, setAvailableWebcams] = useState<{ index: number; name: string; device_path?: string }[]>([]);
  const [currentCameraSource, setCurrentCameraSource] = useState<string | number>("0");
  const [isCameraHardwareConnected, setIsCameraHardwareConnected] = useState<boolean>(true);
  const [customIpUrl, setCustomIpUrl] = useState<string>("http://10.10.10.33:8080/video");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);
  const [cameraSwitchNotice, setCameraSwitchNotice] = useState<string | null>(null);
  const [cameraModalTab, setCameraModalTab] = useState<"web_hp" | "webcam" | "ip" | "cloud">("web_hp");
  const [feedTimestamp, setFeedTimestamp] = useState<number>(Date.now());

  // WiFi Network Camera Scanner States
  interface NetworkCameraDevice {
    ip: string;
    port: number;
    name: string;
    url: string;
    type?: string;
    battery?: number | null;
    resolution?: string | null;
  }
  const [isScanningNetwork, setIsScanningNetwork] = useState<boolean>(false);
  const [isScanningCameras, setIsScanningCameras] = useState<boolean>(false);
  const [detectedNetworkCameras, setDetectedNetworkCameras] = useState<NetworkCameraDevice[]>([]);
  const [networkScanSubnet, setNetworkScanSubnet] = useState<string>("");
  const [hasScannedNetwork, setHasScannedNetwork] = useState<boolean>(false);

  // Dynamic Edge Server Base URL
  // Di cloud (Vercel HTTPS), gunakan rute internal /api/camera/stream agar lolos CORS & mixed-content
  const isCloudHost =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    !window.location.hostname.includes("localhost") &&
    window.location.hostname !== "127.0.0.1";

  const defaultEdgeServer =
    process.env.NEXT_PUBLIC_EDGE_SERVER ||
    (typeof window !== "undefined" &&
    (window.location.hostname.includes("localhost") || window.location.hostname === "127.0.0.1")
      ? "http://localhost:5000"
      : "https://smart-learning.de.deplexo.com");

  const [edgeServerUrl, setEdgeServerUrl] = useState<string>(defaultEdgeServer);
  const [customEdgeInput, setCustomEdgeInput] = useState<string>(defaultEdgeServer);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname.includes("localhost") || window.location.hostname === "127.0.0.1";
      const saved = localStorage.getItem("SYNTAX_SLAYER_EDGE_SERVER");

      const isInvalidSaved =
        !saved ||
        (!isLocal && (
          saved.includes("localhost") ||
          saved.includes("127.0.0.1") ||
          saved.includes("trycloudflare.com") ||
          saved.includes("loca.lt") ||
          saved.includes("volt-improving") ||
          saved.includes("bra-boxing") ||
          saved.includes("kid-earned-floors-blogging")
        )) ||
        (isLocal && saved.includes("trycloudflare.com"));

      if (!isInvalidSaved && saved) {
        setEdgeServerUrl(saved);
        setCustomEdgeInput(saved);
      } else if (isLocal) {
        setEdgeServerUrl("http://localhost:5000");
        setCustomEdgeInput("http://localhost:5000");
      } else {
        const cloudEdge = "https://smart-learning.de.deplexo.com";
        setEdgeServerUrl(cloudEdge);
        setCustomEdgeInput(cloudEdge);
        localStorage.setItem("SYNTAX_SLAYER_EDGE_SERVER", cloudEdge);
      }

      // Pulihkan alamat kamera IP terakhir jika tersedia
      const lastIp = localStorage.getItem("SYNTAX_SLAYER_LAST_IP_CAM");
      if (lastIp) {
        setCustomIpUrl(lastIp);
      }
    }
  }, [defaultEdgeServer]);

  const updateEdgeServerUrl = (url: string) => {
    const cleaned = url.trim().replace(/\/$/, "");
    setEdgeServerUrl(cleaned);
    setCustomEdgeInput(cleaned);
    if (typeof window !== "undefined") {
      localStorage.setItem("SYNTAX_SLAYER_EDGE_SERVER", cleaned);
    }
    setCameraSwitchNotice(`Alamat Server Kamera diperbarui: ${cleaned}`);
    setTimeout(() => {
      fetchAvailableCameras();
      checkStreamStatus();
    }, 200);
  };

  const scanNetworkCameras = async () => {
    setIsScanningNetwork(true);
    setCameraSwitchNotice(null);
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const targetScanUrl = isCloud
        ? `/api/camera/stream?target=scan_network_cameras&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/scan_network_cameras`;
      const res = await fetch(targetScanUrl, { mode: "cors" });
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          const cams = Array.isArray(data.cameras) ? data.cameras : [];
          setDetectedNetworkCameras(cams);
          setNetworkScanSubnet(data.subnet || "WiFi");
          setHasScannedNetwork(true);
          if (cams.length > 0) {
            setCameraSwitchNotice(`Ditemukan ${cams.length} kamera di jaringan lokal sekolah! Tekan 'Hubungkan' untuk menyambungkan.`);
          } else {
            setCameraSwitchNotice(`Tidak ada kamera terdeteksi di subnet ${data.subnet || "WiFi"}. Pastikan perangkat kamera aktif dan engine menyala.`);
          }
        }
      } else {
        setCameraSwitchNotice("Gagal memindai jaringan. Pastikan engine Python aktif.");
      }
    } catch {
      setCameraSwitchNotice(`Gagal menghubungi server kamera. Pastikan engine aktif.`);
    } finally {
      setIsScanningNetwork(false);
    }
  };

  const fetchAvailableCameras = async () => {
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const targetSourcesUrl = isCloud
        ? `/api/camera/stream?target=camera_sources&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/camera_sources`;
      const res = await fetch(targetSourcesUrl, { mode: "cors" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.available_cameras)) {
          setAvailableWebcams(data.available_cameras);
        }
        if (data.current_source !== undefined) {
          setCurrentCameraSource(data.current_source);
        }
        if (typeof data.camera_connected === "boolean") {
          setIsCameraHardwareConnected(data.camera_connected);
        }
      }
    } catch (err) {
      console.warn("[LiveCameraMonitor] Gagal memuat daftar kamera fisik:", err);
    }
  };

  const switchCameraSource = async (newSource: string | number) => {
    setIsSwitchingCamera(true);
    setCameraSwitchNotice(null);
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const targetSwitchUrl = isCloud
        ? `/api/camera/stream?target=switch_camera&source=${encodeURIComponent(String(newSource).trim())}&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/switch_camera?source=${encodeURIComponent(String(newSource).trim())}`;
      const res = await fetch(targetSwitchUrl, { mode: "cors" });
      const data = await res.json();
      if (data?.success) {
        setCurrentCameraSource(data.current_source ?? newSource);
        setIsCameraHardwareConnected(Boolean(data.camera_connected));
        setCameraSwitchNotice(data.message || `Berhasil beralih ke: ${newSource}`);

        // Simpan riwayat kamera IP terakhir untuk kemudahan sesi berikutnya
        if (typeof window !== "undefined" && typeof newSource === "string" && newSource.startsWith("http")) {
          localStorage.setItem("SYNTAX_SLAYER_LAST_IP_CAM", newSource);
        }

        // Paksa refresh video feed bertahap (0ms, 500ms, 1200ms) untuk transisi super mulus
        setFeedTimestamp(Date.now());
        setTimeout(() => setFeedTimestamp(Date.now()), 500);
        setTimeout(() => setFeedTimestamp(Date.now()), 1200);
      } else {
        setCameraSwitchNotice(data?.message || "Gagal mengalihkan sumber kamera.");
      }
    } catch (err) {
      setCameraSwitchNotice(`Gagal menghubungi server kamera. Pastikan engine aktif.`);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const rotateCamera = async (deg: string) => {
    setCameraRotation(deg);
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const targetRotateUrl = isCloud
        ? `/api/camera/stream?target=rotate&deg=${deg}&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/rotate?deg=${deg}`;
      await fetch(targetRotateUrl, { mode: "cors" });
    } catch (e) {
      console.warn("[LiveCameraMonitor] Gagal mengirim rotasi ke server:", e);
    }
  };

  const toggleFlip = async () => {
    const nextVal = !isFlipped;
    setIsFlipped(nextVal);
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const targetFlipUrl = isCloud
        ? `/api/camera/stream?target=rotate&flip=${nextVal ? "1" : "0"}&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/rotate?flip=${nextVal ? "1" : "0"}`;
      await fetch(targetFlipUrl, { mode: "cors" });
    } catch (e) {
      console.warn("[LiveCameraMonitor] Gagal mengirim mirror ke server:", e);
    }
  };

  const [classBatteries, setClassBatteries] = useState<Record<string, { level: number; charging: boolean }>>({});

  const effectiveChannels: CameraChannel[] = useMemo(() => {
    if (role === "teacher") {
      return [
        {
          id: lockedClassId || "cam-teacher-active",
          name: lockedClassName ? `Ruang ${lockedClassName}` : "Ruang Kelas Anda",
          subject: lockedSubjectName || "Mata Pelajaran Aktif",
          teacher: "Anda (Guru Pengampu)",
          streamUrl: `${edgeServerUrl}/video_feed`,
          statusUrl: `${edgeServerUrl}/status`,
          ipAddress: "Kamera Kelas Aktif (:5000)",
          port: 5000,
          studentsCount: 0,
          sittingCount: 0,
          standingCount: 0,
          handRaiseCount: 0,
          sleepCount: 0,
          isOnline: streamOnline,
        },
      ];
    }

    if (classesList && classesList.length > 0) {
      return classesList.map((cls, idx) => {
        const bat = classBatteries[cls.id] || classBatteries[cls.name] || classBatteries[String(idx + 1)];
        return {
          id: cls.id,
          name: cls.name,
          subject: "Monitoring Presensi & Aktivitas",
          teacher: "Pengampu Kelas",
          streamUrl: `${edgeServerUrl}/video_feed?class_id=${encodeURIComponent(cls.id)}&channel=${idx + 1}`,
          statusUrl: `${edgeServerUrl}/status?class_id=${encodeURIComponent(cls.id)}`,
          ipAddress: `Kamera Kelas #${idx + 1}`,
          port: 5000 + idx,
          studentsCount: 0,
          sittingCount: 0,
          standingCount: 0,
          handRaiseCount: 0,
          sleepCount: 0,
          isOnline: streamOnline,
          battery: bat?.level,
          isCharging: bat?.charging,
        };
      });
    }

    return INITIAL_DEFAULT_CHANNELS;
  }, [role, lockedClassId, lockedClassName, lockedSubjectName, classesList, edgeServerUrl, streamOnline, classBatteries]);

  useEffect(() => {
    const currentCam = effectiveChannels[activeCamIndex];
    if (currentCam && currentCam.id && !currentCam.id.startsWith("cam-")) {
      setSelectedClassId(currentCam.id);
    }
  }, [activeCamIndex, effectiveChannels]);

  const activeChannel = effectiveChannels[activeCamIndex] || effectiveChannels[0];

  const checkStreamStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const isCloud = typeof window !== "undefined" && window.location.protocol === "https:" && !window.location.hostname.includes("localhost");
      const targetUrl = isCloud
        ? `/api/camera/stream?target=status&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/status`;
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        failedStatusCountRef.current = 0;
        setStreamOnline(true);
        try {
          const data = await res.json();
          if (typeof data?.fps === "number" && data.fps > 0) setActualFps(data.fps);
          if (data?.rotation) setCameraRotation(data.rotation);
          if (typeof data?.flip_h === "boolean") setIsFlipped(data.flip_h);
          if (data?.current_source !== undefined) setCurrentCameraSource(data.current_source);
          if (typeof data?.camera_connected === "boolean") setIsCameraHardwareConnected(data.camera_connected);
          if (data?.batteries && typeof data.batteries === "object") {
            setClassBatteries(data.batteries);
          }
          if (data?.latest_telemetry) {
            applyTelemetry(data.latest_telemetry);
          }
        } catch {}
      } else {
        failedStatusCountRef.current += 1;
        if (failedStatusCountRef.current >= 2) {
          setStreamOnline(false);
        }
      }
    } catch {
      failedStatusCountRef.current += 1;
      if (failedStatusCountRef.current >= 2) {
        setStreamOnline(false);
      }
    }
  };

  const handleRotateChannel = async (classId: string) => {
    try {
      const isCloud =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !window.location.hostname.includes("localhost");
      const nextRot = cameraRotation === "0" ? "90" : cameraRotation === "90" ? "180" : cameraRotation === "180" ? "270" : "0";
      const targetUrl = isCloud
        ? `/api/camera/stream?target=rotate&deg=${nextRot}&class_id=${encodeURIComponent(classId)}&tunnel=${encodeURIComponent(edgeServerUrl)}`
        : `${edgeServerUrl}/rotate?deg=${nextRot}&class_id=${encodeURIComponent(classId)}`;
      await fetch(targetUrl);
      setCameraRotation(nextRot);
      setFeedTimestamp(Date.now());
    } catch (err) {
      console.warn("Gagal merotasi kamera kelas:", err);
    }
  };

  const fetchHermesNudge = async (latestTele: TelemetryPoint, currentSubjects: DetectedSubject[]) => {
    try {
      setIsNudgeLoading(true);
      const res = await fetch("/api/ai/saran-belajar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeChannel.subject,
          teacher: activeChannel.teacher,
          detectedCount: latestTele.detected_students_count || currentSubjects.length,
          sittingCount: latestTele.sitting_count,
          standingCount: latestTele.standing_count,
          sleepCount: latestTele.sleep_detected_count,
          handRaiseCount: latestTele.hand_raise_count,
          focusIndex: latestTele.detected_students_count > 0 ? 88 : 100,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.nudge) {
        setHermesNudge(data.nudge);
      }
    } catch (err) {
      console.warn("[LiveCameraMonitor] Error fetching Hermes nudge:", err);
    } finally {
      setIsNudgeLoading(false);
    }
  };

  const fetchScheduleContext = async (classId?: string) => {
    try {
      const targetId = role === "teacher" && lockedClassId ? lockedClassId : (classId || selectedClassId);
      const url = targetId
        ? `/api/telemetry/schedule-context?classId=${encodeURIComponent(targetId)}`
        : "/api/telemetry/schedule-context";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          setScheduleContext(data);
          if (data.class_id && !selectedClassId) {
            setSelectedClassId(data.class_id);
          }
        }
      }
    } catch (err) {
      console.warn("[LiveCameraMonitor] Gagal memuat konteks jadwal:", err);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const fetchClassesList = async () => {
    if (role === "teacher" && lockedClassId) {
      setClassesList([{ id: lockedClassId, name: lockedClassName || "Kelas Aktif" }]);
      setSelectedClassId(lockedClassId);
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase.from("classes").select("id, name").order("name");
      if (data && data.length > 0) {
        setClassesList(data);
      }
    } catch (err) {
      console.warn("[LiveCameraMonitor] Gagal memuat daftar kelas:", err);
    }
  };

  const applyTelemetry = (latest: any) => {
    if (!latest) return;
    setTelemetry(latest);
    setLastSyncTime(new Date());

    // Map real detected tracks from edge vision engine
    const rawTracks =
      latest.anonymized_tracks ||
      (latest.spatial_distribution as any)?.tracks ||
      [];

    if (Array.isArray(rawTracks) && rawTracks.length > 0) {
      const mapped: DetectedSubject[] = rawTracks.map((t: any, idx: number) => {
        const cleanName = (t.student_name || t.label || `Siswa #${idx + 1}`).replace(/\s*\(.*?\)/, "").trim();
        return {
          id: t.id || `P-${idx + 1}`,
          anonymous_id: t.anonymous_id || `P${idx + 1}`,
          label: cleanName,
          student_name: cleanName,
          is_recognized: !!t.is_recognized,
          student_id: t.student_id,
          seat_latched: !!t.seat_latched,
          posture: t.posture || "sitting",
          activity: t.activity || (t.sleep ? "sleep" : t.hand_raised ? "hand_raised" : "attentive"),
          action_text: t.action_text || (t.sleep ? "Tidur di Meja" : t.hand_raised ? "Bertanya (Angkat Tangan)" : t.activity === "writing" ? "Fokus Menulis" : "Fokus Menyimak"),
          confidence: typeof t.confidence === "number" ? t.confidence : 0.95,
          row: t.row || "Area Kamera",
          location: t.posture === "standing" ? "Berdiri" : "Duduk di Meja",
          hand_raised: !!t.hand_raised,
          sleep: !!t.sleep,
          head_tilt_deg: typeof t.head_tilt_deg === "number" ? t.head_tilt_deg : 0,
          gaze_direction: t.gaze_direction || "Depan / Layar",
          attention_score: typeof t.attention_score === "number" ? t.attention_score : 95,
        };
      });
      setSubjects(mapped);
    } else if (latest.detected_students_count > 0) {
      const generated: DetectedSubject[] = [];
      for (let i = 0; i < latest.detected_students_count; i++) {
        const isSleep = i < (latest.sleep_detected_count || 0);
        const isHand = !isSleep && i < (latest.hand_raise_count || 0);
        const isStand = !isSleep && !isHand && i < (latest.standing_count || 0);
        generated.push({
          id: `P-${i + 1}`,
          anonymous_id: `P${i + 1}`,
          label: `Siswa #${i + 1}`,
          student_name: `Siswa #${i + 1}`,
          posture: isStand ? "standing" : "sitting",
          activity: isSleep ? "sleep" : isHand ? "hand_raised" : "attentive",
          action_text: isSleep ? "Tidur di Meja" : isHand ? "Bertanya (Angkat Tangan)" : "Fokus Menyimak",
          confidence: 0.93,
          row: "Area Kamera",
          location: isStand ? "Berdiri" : "Duduk di Meja",
          hand_raised: isHand,
          sleep: isSleep,
        });
      }
      setSubjects(generated);
    } else {
      setSubjects([]);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(LATEST_API_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.latest) {
        applyTelemetry(data.latest);

        if (Array.isArray(data.history) && data.history.length > 0) {
          const chartPoints = data.history.map((pt: TelemetryPoint, idx: number) => {
            const timeObj = new Date(pt.timestamp_bucket || Date.now());
            const timeLabel = isNaN(timeObj.getTime())
              ? `T-${data.history.length - idx}`
              : `${String(timeObj.getHours()).padStart(2, "0")}:${String(timeObj.getMinutes()).padStart(2, "0")}`;
            return {
              time: timeLabel,
              attentive: pt.desk_focused_count || pt.sitting_count || 0,
              writing: pt.standing_count || 0,
              phone: 0,
              sleeping: pt.sleep_detected_count || 0,
            };
          });
          setHistory(chartPoints);
        }
      }
    } catch (err) {
      console.warn("[LiveCameraMonitor] Error polling telemetry:", err);
    }
  };

  useEffect(() => {
    checkStreamStatus();
    fetchAvailableCameras();
    fetchTelemetry();
    fetchHermesNudge(telemetry, subjects);

    // Enterprise Realtime: Dengarkan event insert telemetri baru secara instan via Supabase Realtime WebSocket
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-classroom-telemetry")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "classroom_telemetry",
        },
        () => {
          lastRealtimeEventRef.current = Date.now();
          fetchTelemetry();
        }
      )
      .subscribe();

    fetchClassesList();
    fetchScheduleContext(role === "teacher" && lockedClassId ? lockedClassId : undefined);

    const interval = setInterval(() => {
      checkStreamStatus();
      // Watchdog polling: Jika websocket aktif mengirim data dalam 5 detik terakhir, abaikan polling untuk cegah jitter/race condition
      const isWsRecent = Date.now() - lastRealtimeEventRef.current < 5000;
      if (!isWsRecent) {
        fetchTelemetry();
      }
    }, 2500);

    const nudgeInterval = setInterval(() => {
      fetchHermesNudge(telemetry, subjects);
    }, 15000);

    const scheduleInterval = setInterval(() => {
      fetchScheduleContext(role === "teacher" && lockedClassId ? lockedClassId : undefined);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(nudgeInterval);
      clearInterval(scheduleInterval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([checkStreamStatus(), fetchTelemetry(), fetchScheduleContext()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyWifiCommand = (camNum: number, port: number) => {
    const cmd = `python3 experiments/cv-poc/classroom_poc.py --source "http://10.10.10.33:8080/video" --port ${port} --interval 2 --headless`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const getStatusBadge = (activity: DetectedSubject["activity"]) => {
    switch (activity) {
      case "attentive":
        return { label: "Fokus", bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", dot: "bg-emerald-500" };
      case "writing":
        return { label: "Mencatat", bg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20", dot: "bg-sky-500" };
      case "using_phone":
        return { label: "Gadget", bg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-medium", dot: "bg-red-600" };
      case "sleep":
        return { label: "Tidur", bg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 animate-pulse font-medium", dot: "bg-red-600" };
      case "hand_raised":
        return { label: "Bertanya", bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-medium", dot: "bg-amber-500" };
      case "distracted":
        return { label: "Distraksi", bg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20", dot: "bg-orange-500" };
      default:
        return { label: "Aktif", bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", dot: "bg-emerald-500" };
    }
  };

  const totalDetected = telemetry.detected_students_count || subjects.length;

  // Algoritma Reduksi Histogram Aktivitas Single-Pass: O(N) kompleksitas waktu
  const counts = {
    attentive: 0,
    writing: 0,
    hand_raised: telemetry.hand_raise_count || 0,
    using_phone: 0,
    sleep: telemetry.sleep_detected_count || 0,
  };

  let hitunganAngkatTanganLokal = 0;
  let hitunganTidurLokal = 0;
  for (const subject of subjects) {
    if (subject.activity === "attentive") counts.attentive++;
    else if (subject.activity === "writing") counts.writing++;
    else if (subject.activity === "using_phone") counts.using_phone++;
    else if (subject.activity === "hand_raised") hitunganAngkatTanganLokal++;
    else if (subject.activity === "sleep") hitunganTidurLokal++;
  }
  if (!telemetry.hand_raise_count) counts.hand_raised = hitunganAngkatTanganLokal;
  if (!telemetry.sleep_detected_count) counts.sleep = hitunganTidurLokal;

  // Siswa yang kondusif adalah seluruh siswa yang menyimak, menulis, atau aktif bertanya (TIDAK tidur dan TIDAK main HP)
  const nonKondusif = counts.sleep + counts.using_phone;
  const rawFocusIndex = totalDetected > 0
    ? Math.max(0, Math.min(100, Math.round(((totalDetected - nonKondusif) / totalDetected) * 100)))
    : 100;

  // Smoothing Exponential Moving Average (EMA) untuk mencegah lonjakan/flicker HUD
  useEffect(() => {
    setSmoothedFocusIndex((prev) => Math.round(prev * 0.7 + rawFocusIndex * 0.3));
  }, [rawFocusIndex]);

  const focusIndex = smoothedFocusIndex;

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-border bg-card shadow-2xs overflow-hidden transition-all duration-300 ${
        isFullscreen ? "p-6 bg-background fixed inset-0 z-50 overflow-y-auto" : ""
      }`}
    >
      
      {/* Header Bar & Saluran Selector */}
      <MonitorHeader
        streamOnline={streamOnline}
        actualFps={actualFps}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isRefreshing={isRefreshing}
        handleManualRefresh={handleManualRefresh}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        channels={effectiveChannels}
        activeCamIndex={activeCamIndex}
        setActiveCamIndex={setActiveCamIndex}
        focusIndex={focusIndex}
        totalDetected={totalDetected}
        role={role}
      />

      {/* VIEW MODE 1: MULTI-CAMERA GRID */}
      {viewMode === "quad" && role !== "teacher" ? (
        <MultiCameraGrid
          channels={effectiveChannels}
          streamOnline={streamOnline}
          totalDetected={totalDetected}
          focusIndex={focusIndex}
          setActiveCamIndex={setActiveCamIndex}
          setViewMode={setViewMode}
          onRotateChannel={handleRotateChannel}
        />
      ) : (
        /* VIEW MODE 2: SINGLE FOCUS DEEP MONITORING */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <StreamViewport
            activeChannel={activeChannel}
            activeCamIndex={activeCamIndex}
            streamOnline={streamOnline}
            activeRotation={cameraRotation}
            isFlipped={isFlipped}
            aspectRatioMode={aspectRatioMode}
            totalDetected={totalDetected}
            counts={counts}
            telemetry={telemetry}
            lastSyncTime={lastSyncTime}
            copiedCmd={copiedCmd}
            currentCameraSource={currentCameraSource}
            isCameraHardwareConnected={isCameraHardwareConnected}
            videoImgRef={videoImgRef}
            edgeServerUrl={edgeServerUrl}
            feedTimestamp={feedTimestamp}
            setStreamOnline={setStreamOnline}
            onOpenModal={() => {
              fetchAvailableCameras();
              setShowCameraModal(true);
            }}
            rotateCamera={rotateCamera}
            toggleFlip={toggleFlip}
            setAspectRatioMode={setAspectRatioMode}
            copyWifiCommand={copyWifiCommand}
          />

          <TelemetryPanel
            rightTab={rightTab}
            setRightTab={setRightTab}
            sessionId="00000000-0000-0000-0000-000000000001"
            focusIndex={focusIndex}
            totalDetected={totalDetected}
            counts={counts}
            subjects={subjects}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            getStatusBadge={getStatusBadge}
            history={history}
            hermesNudge={hermesNudge}
            isNudgeLoading={isNudgeLoading}
            scheduleContext={scheduleContext}
            isScheduleLoading={isScheduleLoading}
            classes={classesList}
            selectedClassId={selectedClassId}
            onSelectClass={(id) => {
              setSelectedClassId(id);
              fetchScheduleContext(id);
            }}
          />
        </div>
      )}

      {/* MODAL / DIALOG: PENGATURAN SUMBER KAMERA */}
      <CameraSourceModal
        showCameraModal={showCameraModal}
        setShowCameraModal={setShowCameraModal}
        cameraModalTab={cameraModalTab}
        setCameraModalTab={setCameraModalTab}
        isScanningCameras={isScanningCameras}
        fetchAvailableCameras={fetchAvailableCameras}
        availableWebcams={availableWebcams}
        currentCameraSource={currentCameraSource}
        isSwitchingCamera={isSwitchingCamera}
        switchCameraSource={switchCameraSource}
        cameraSwitchNotice={cameraSwitchNotice}
        isCameraHardwareConnected={isCameraHardwareConnected}
        isScanningNetwork={isScanningNetwork}
        scanNetworkCameras={scanNetworkCameras}
        networkScanSubnet={networkScanSubnet}
        hasScannedNetwork={hasScannedNetwork}
        detectedNetworkCameras={detectedNetworkCameras}
        customIpUrl={customIpUrl}
        setCustomIpUrl={setCustomIpUrl}
        customEdgeInput={customEdgeInput}
        setCustomEdgeInput={setCustomEdgeInput}
        updateEdgeServerUrl={updateEdgeServerUrl}
        edgeServerUrl={edgeServerUrl}
        streamOnline={streamOnline}
        setStreamOnline={setStreamOnline}
        checkStreamStatus={checkStreamStatus}
      />
    </div>
  );
}
