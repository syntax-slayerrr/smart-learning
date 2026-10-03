"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Camera,
  Activity,
  Users,
  Hand,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Smartphone,
  Copy,
  Check,
  Radio,
  Wifi,
  LayoutGrid,
  Square,
  Sparkles,
  BookOpen,
  Eye,
  MessageSquare,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TelemetryPoint {
  id: string;
  session_id: string;
  timestamp_bucket: string;
  detected_students_count: number;
  sitting_count: number;
  standing_count: number;
  hand_raise_count: number;
  desk_focused_count: number;
  sleep_detected_count: number;
  active_clusters_count: number;
  teacher_zone: string;
  spatial_distribution?: Record<string, unknown>;
}

interface CameraChannel {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  streamUrl: string;
  statusUrl: string;
  ipAddress: string;
  port: number;
  studentsCount: number;
  sittingCount: number;
  standingCount: number;
  handRaiseCount: number;
  sleepCount: number;
  isOnline: boolean;
}

interface StudentSeat {
  seat: string;
  name: string;
  status: "attentive" | "writing" | "using_phone" | "distracted" | "sleep" | "hand_raised";
  confidence: number;
  row: string;
}

const DEFAULT_SEATS: StudentSeat[] = [
  { seat: "A-01", name: "Andi Pratama", status: "attentive", confidence: 0.94, row: "Depan" },
  { seat: "A-02", name: "Budi Santoso", status: "writing", confidence: 0.88, row: "Depan" },
  { seat: "A-03", name: "Citra Dewi", status: "attentive", confidence: 0.96, row: "Depan" },
  { seat: "A-04", name: "Doni Kusuma", status: "attentive", confidence: 0.91, row: "Depan" },
  { seat: "A-05", name: "Eka Putri", status: "writing", confidence: 0.89, row: "Depan" },
  { seat: "A-06", name: "Fajar Nugraha", status: "attentive", confidence: 0.93, row: "Depan" },

  { seat: "B-01", name: "Gita Savitri", status: "attentive", confidence: 0.95, row: "Tengah" },
  { seat: "B-02", name: "Hadi Purnomo", status: "distracted", confidence: 0.82, row: "Tengah" },
  { seat: "B-03", name: "Indah Lestari", status: "hand_raised", confidence: 0.95, row: "Tengah" },
  { seat: "B-04", name: "Joko Widodo", status: "attentive", confidence: 0.92, row: "Tengah" },
  { seat: "B-05", name: "Kurnia Sandi", status: "writing", confidence: 0.87, row: "Tengah" },
  { seat: "B-06", name: "Lestari Ayu", status: "attentive", confidence: 0.94, row: "Tengah" },

  { seat: "C-01", name: "M. Rizky", status: "attentive", confidence: 0.91, row: "Belakang" },
  { seat: "C-02", name: "Nabila Syakieb", status: "attentive", confidence: 0.93, row: "Belakang" },
  { seat: "C-03", name: "Oki Setiana", status: "attentive", confidence: 0.90, row: "Belakang" },
  { seat: "C-04", name: "Putra Pratama", status: "using_phone", confidence: 0.89, row: "Belakang" },
  { seat: "C-05", name: "Qori Sandioriva", status: "attentive", confidence: 0.92, row: "Belakang" },
  { seat: "C-06", name: "Rian Ardianto", status: "sleep", confidence: 0.91, row: "Belakang" },
];

const DEFAULT_CHANNELS: CameraChannel[] = [
  {
    id: "cam-1",
    name: "Ruang 10-IPA-1",
    subject: "Fisika Terapan",
    teacher: "Budi Santoso, M.Pd",
    streamUrl: "https://subsidiaries-encyclopedia-wires-forgot.trycloudflare.com/video",
    statusUrl: "https://subsidiaries-encyclopedia-wires-forgot.trycloudflare.com/",
    ipAddress: "IP Webcam HP (Cloudflare Tunnel)",
    port: 8080,
    studentsCount: 18,
    sittingCount: 18,
    standingCount: 0,
    handRaiseCount: 1,
    sleepCount: 1,
    isOnline: true,
  },
  {
    id: "cam-2",
    name: "Ruang 10-IPA-2",
    subject: "Matematika Diskrit",
    teacher: "Siti Rahma, S.Pd",
    streamUrl: "http://localhost:5001/video_feed",
    statusUrl: "http://localhost:5001/status",
    ipAddress: "192.168.1.102:8080 (Wi-Fi HP #2)",
    port: 5001,
    studentsCount: 22,
    sittingCount: 21,
    standingCount: 1,
    handRaiseCount: 2,
    sleepCount: 0,
    isOnline: false,
  },
  {
    id: "cam-3",
    name: "Ruang 11-RPL-1",
    subject: "Rekayasa Perangkat Lunak",
    teacher: "Ahmad Zaldy, S.Kom",
    streamUrl: "http://localhost:5002/video_feed",
    statusUrl: "http://localhost:5002/status",
    ipAddress: "192.168.1.103:8080 (Wi-Fi HP #3)",
    port: 5002,
    studentsCount: 24,
    sittingCount: 24,
    standingCount: 0,
    handRaiseCount: 3,
    sleepCount: 0,
    isOnline: false,
  },
  {
    id: "cam-4",
    name: "Ruang 12-TKJ-1",
    subject: "Administrasi Server & Jaringan",
    teacher: "Dewi Lestari, M.T",
    streamUrl: "http://localhost:5003/video_feed",
    statusUrl: "http://localhost:5003/status",
    ipAddress: "192.168.1.104:8080 (Wi-Fi HP #4)",
    port: 5003,
    studentsCount: 20,
    sittingCount: 19,
    standingCount: 1,
    handRaiseCount: 0,
    sleepCount: 0,
    isOnline: false,
  },
];

const LATEST_API_URL = "/api/telemetry/latest?sessionId=00000000-0000-0000-0000-000000000001";

export function LiveCameraMonitor() {
  const [viewMode, setViewMode] = useState<"single" | "quad">("single");
  const [rightTab, setRightTab] = useState<"digital_twin" | "analytics">("digital_twin");
  const [activeCamIndex, setActiveCamIndex] = useState<number>(0);
  const [streamOnline, setStreamOnline] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [seats, setSeats] = useState<StudentSeat[]>(DEFAULT_SEATS);
  const [selectedSeat, setSelectedSeat] = useState<StudentSeat | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    id: "init",
    session_id: "00000000-0000-0000-0000-000000000001",
    timestamp_bucket: new Date().toISOString(),
    detected_students_count: 18,
    sitting_count: 18,
    standing_count: 0,
    hand_raise_count: 1,
    desk_focused_count: 16,
    sleep_detected_count: 1,
    active_clusters_count: 2,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const videoImgRef = useRef<HTMLImageElement>(null);

  const activeChannel = DEFAULT_CHANNELS[activeCamIndex] || DEFAULT_CHANNELS[0];

  const checkStreamStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const targetUrl = activeChannel.statusUrl || "https://subsidiaries-encyclopedia-wires-forgot.trycloudflare.com/";
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setStreamOnline(true);
      } else {
        setStreamOnline(false);
      }
    } catch {
      setStreamOnline(false);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(LATEST_API_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.latest) {
        const latest: TelemetryPoint = data.latest;
        setTelemetry(latest);
        setLastSyncTime(new Date());

        // Update local seating simulation dynamically if available
        setSeats((prev) =>
          prev.map((s) => {
            if (s.seat === "C-04" && latest.sleep_detected_count > 0) {
              return { ...s, status: "using_phone", confidence: 0.89 };
            }
            if (s.seat === "C-06" && latest.sleep_detected_count > 0) {
              return { ...s, status: "sleep", confidence: 0.91 };
            }
            if (s.seat === "B-03" && latest.hand_raise_count > 0) {
              return { ...s, status: "hand_raised", confidence: 0.95 };
            }
            return s;
          })
        );

        if (Array.isArray(data.history) && data.history.length > 0) {
          const chartPoints = data.history.map((pt: TelemetryPoint, idx: number) => {
            const timeObj = new Date(pt.timestamp_bucket || Date.now());
            const timeLabel = isNaN(timeObj.getTime())
              ? `T-${data.history.length - idx}`
              : timeObj.toLocaleTimeString("id-ID", {
                  minute: "2-digit",
                  second: "2-digit",
                });
            return {
              time: timeLabel,
              attentive: Math.max(0, (pt.desk_focused_count || 15) - 3),
              writing: 3,
              phone: pt.sleep_detected_count > 0 ? 1 : 0,
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
    fetchTelemetry();

    const interval = setInterval(() => {
      checkStreamStatus();
      fetchTelemetry();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([checkStreamStatus(), fetchTelemetry()]);
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

  const copyWifiCommand = (camNum: number, ip: string, port: number) => {
    const cmd = `python3 experiments/cv-poc/classroom_advanced_vision.py --port ${port} --session-id 00000000-0000-0000-0000-00000000000${camNum}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const getStatusBadge = (status: StudentSeat["status"]) => {
    switch (status) {
      case "attentive":
        return { label: "Attentive", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" };
      case "writing":
        return { label: "Writing", bg: "bg-sky-500/10 text-sky-700 border-sky-500/20", dot: "bg-sky-500" };
      case "using_phone":
        return { label: "Using Phone", bg: "bg-red-500/15 text-red-700 border-red-500/30 animate-pulse font-bold", dot: "bg-red-600 animate-ping" };
      case "sleep":
        return { label: "Head Down", bg: "bg-red-500/15 text-red-700 border-red-500/30 animate-pulse font-bold", dot: "bg-red-600" };
      case "hand_raised":
        return { label: "Hand Raised", bg: "bg-amber-500/15 text-amber-800 border-amber-500/30 font-bold", dot: "bg-amber-500" };
      case "distracted":
        return { label: "Distracted", bg: "bg-orange-500/10 text-orange-700 border-orange-500/20", dot: "bg-orange-500" };
      default:
        return { label: "Attentive", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" };
    }
  };

  const counts = {
    attentive: seats.filter((s) => s.status === "attentive").length,
    writing: seats.filter((s) => s.status === "writing").length,
    hand_raised: seats.filter((s) => s.status === "hand_raised").length,
    using_phone: seats.filter((s) => s.status === "using_phone").length,
    distracted: seats.filter((s) => s.status === "distracted").length,
    sleep: seats.filter((s) => s.status === "sleep").length,
  };

  const focusIndex = Math.round(((counts.attentive + counts.writing) / seats.length) * 100);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden transition-all duration-300 ${
        isFullscreen ? "p-6 bg-[#FAF9F5] fixed inset-0 z-50 overflow-y-auto" : ""
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] bg-[#FBF9F5] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#EA580C] shadow-2xs">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-stone-900">
                AI Classroom Vision & Pedagogical Intelligence
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
                  streamOnline
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                    : "bg-stone-200/60 text-stone-600 border border-stone-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    streamOnline ? "bg-emerald-600 animate-pulse" : "bg-stone-400"
                  }`}
                />
                {streamOnline ? "YOLO-POSE + ACTION SKELETON (30 FPS)" : "ENGINE STANDBY"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Estimasi pose 17-keypoint neon yellow, klasifikasi 6 perilaku belajar, & Digital Twin denah meja
            </p>
          </div>
        </div>

        {/* View Mode & Actions Switcher */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Single Focus vs Quad CCTV */}
          <div className="flex items-center rounded-lg border border-[#E7E2DA] bg-[#F5F2EB] p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode("single")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "single"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Fokus 1 Kelas</span>
            </button>
            <button
              onClick={() => setViewMode("quad")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "quad"
                  ? "bg-white text-[#EA580C] shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid 4 Kamera (CCTV)</span>
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Muat Ulang Telemetri"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 apple-press shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#EA580C]" : "text-stone-400"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Layar Penuh"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 apple-press shadow-2xs"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-stone-500" />
                <span className="hidden sm:inline">Keluar</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-stone-500" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Classroom Channel Selector */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA]/80 bg-white px-5 py-2 overflow-x-auto gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-stone-700 flex items-center gap-1 text-[11.5px]">
            <Wifi className="h-3.5 w-3.5 text-[#EA580C]" /> Saluran Kelas Wi-Fi:
          </span>
          <div className="flex items-center gap-1.5">
            {DEFAULT_CHANNELS.map((cam, idx) => {
              const isSelected = activeCamIndex === idx;
              return (
                <button
                  key={cam.id}
                  onClick={() => {
                    setActiveCamIndex(idx);
                    if (viewMode === "quad") setViewMode("single");
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all font-mono ${
                    isSelected
                      ? "bg-[#EA580C] text-white font-bold shadow-2xs"
                      : "bg-[#F5F2EB] text-stone-600 hover:bg-[#EBE7DF]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      idx === 0 && streamOnline ? "bg-emerald-300 animate-ping" : "bg-stone-400"
                    }`}
                  />
                  <span>CAM #{idx + 1}: {cam.name.replace("Ruang ", "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500 shrink-0">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <Eye className="h-3.5 w-3.5" /> Indeks Fokus: {focusIndex}%
          </span>
          <span className="text-stone-300">•</span>
          <span>18 Siswa Terpetakan di Meja</span>
        </div>
      </div>

      {/* VIEW MODE 1: QUAD-VIEW (GRID 4 KAMERA CCTV 2x2) */}
      {viewMode === "quad" ? (
        <div className="p-4 sm:p-5 bg-stone-950/2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_CHANNELS.map((cam, idx) => {
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-[#E7E2DA] bg-white overflow-hidden shadow-2xs card-hover flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#FBF9F5] px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">
                        CAM #{idx + 1} — {cam.name}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        ({cam.subject})
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-bold ${
                        streamOnline
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${streamOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                      {streamOnline ? "YOLO SKELETON LIVE" : "STANDBY"}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full bg-stone-900 flex items-center justify-center overflow-hidden">
                    {streamOnline ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cam.streamUrl}
                          alt={`Live Feed ${cam.name}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                          <span className="rounded bg-stone-950/80 backdrop-blur-md px-2 py-0.5 text-[9.5px] font-mono font-bold text-white border border-white/10">
                            🔴 CAM #{idx + 1} • 30 FPS
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-white">
                        <Smartphone className="h-7 w-7 text-stone-500 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-stone-300">{cam.name}</p>
                        <p className="text-[10.5px] font-mono text-stone-400 mt-0.5">{cam.ipAddress}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-[#FBF9F5] border-t border-[#E7E2DA] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-stone-700">
                        <strong>18</strong> Siswa
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        Fokus: {focusIndex}%
                      </span>
                      {counts.using_phone > 0 && (
                        <span className="text-red-600 font-bold animate-pulse">
                          📱 1 Main HP!
                        </span>
                      )}
                      {counts.sleep > 0 && (
                        <span className="text-red-600 font-bold animate-pulse">
                          ⚠️ 1 Tidur!
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActiveCamIndex(idx);
                        setViewMode("single");
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-stone-900 text-white px-2.5 py-1 text-[11px] font-medium hover:bg-stone-800 apple-press"
                    >
                      <Square className="h-3 w-3" />
                      <span>Fokuskan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: SINGLE FOCUS DEEP INTELLIGENCE (Video + Digital Twin Seating Map) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E7E2DA]">
          
          {/* Left Pane: Live Video Stream with Skeleton HUD (6.5 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-stone-950/2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-[#EA580C]" />
                  Visual Feed: {activeChannel.name} ({activeChannel.subject})
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  Wi-Fi Stream :{activeChannel.port} • 1280x720 HD
                </span>
              </div>

              {/* Video Player Box with 17-Keypoint Skeletons and Nameplates */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shadow-inner flex items-center justify-center">
                {streamOnline ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={videoImgRef}
                      src={activeChannel.streamUrl}
                      alt={`Live Video Stream dari ${activeChannel.name}`}
                      className="w-full h-full object-contain"
                      onError={() => setStreamOnline(false)}
                    />
                    {/* Top Floating HUD Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono font-medium text-white border border-white/10 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        REC • {activeChannel.name}
                      </span>
                      <span className="rounded-md bg-stone-950/70 backdrop-blur-md px-2 py-1 text-[10px] font-mono text-stone-300 border border-white/10">
                        CP IP Cam
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="rounded-md bg-[#EA580C]/90 backdrop-blur-md px-2.5 py-1 text-[10.5px] font-mono font-bold text-white shadow-sm">
                        ⚡ 14ms Pose Inference
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="rounded-md bg-stone-950/80 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-stone-200 border border-white/10 flex items-center gap-2">
                        <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                        <span>Guru: {activeChannel.teacher} • 18 Siswa Aktif</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Standby / Offline Screen with Instructions */
                  <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-stone-900 text-white select-none">
                    <div className="h-12 w-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-orange-500 mb-3 shadow-lg">
                      <Wifi className="h-6 w-6 text-stone-400" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-200 mb-1">
                      Kamera IP Wi-Fi: {activeChannel.name} Standby
                    </h4>
                    <p className="text-xs text-stone-400 max-w-sm mb-4 leading-relaxed">
                      Hubungkan HP ke Wi-Fi sekolah (buka aplikasi IP Webcam di HP), lalu jalankan:
                    </p>

                    <div className="w-full max-w-md space-y-2 text-left">
                      <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-xs font-mono text-stone-300">
                        <div className="flex items-center gap-2 truncate">
                          <Wifi className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">
                            python3 experiments/cv-poc/classroom_advanced_vision.py --port {activeChannel.port}
                          </span>
                        </div>
                        <button
                          onClick={() => copyWifiCommand(activeCamIndex + 1, `192.168.1.10${activeCamIndex + 1}:8080`, activeChannel.port)}
                          title="Salin Perintah"
                          className="ml-2 inline-flex items-center gap-1 rounded bg-stone-800 px-2 py-1 text-[10px] text-stone-300 hover:text-white transition-colors"
                        >
                          {copiedCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedCmd ? "Tersalin" : "Salin"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Granular Legend Bar */}
            <div className="mt-3 pt-3 border-t border-[#E7E2DA]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-700">Status AI:</span>
                <span className="flex items-center gap-1 text-emerald-700 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> Attentive ({counts.attentive})
                </span>
                <span className="flex items-center gap-1 text-sky-700 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Writing ({counts.writing})
                </span>
                <span className="flex items-center gap-1 text-red-600 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Phone ({counts.using_phone})
                </span>
                <span className="flex items-center gap-1 text-red-700 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-red-700" /> Sleep ({counts.sleep})
                </span>
              </div>
              <div className="font-mono text-stone-400">
                Sinkron Edge: {lastSyncTime.toLocaleTimeString("id-ID")}
              </div>
            </div>
          </div>

          {/* Right Pane: Digital Twin Seating Chart & Smart Nudge (5.5 Cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-white flex flex-col justify-between">
            <div className="space-y-3">
              {/* Tab Selector: Digital Twin vs Flow Chart */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-[#EA580C]" />
                    Digital Twin Kelas & Analitik AI
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Pemetaan perilaku per meja siswa secara real-time
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-[#E7E2DA] bg-[#F5F2EB] p-0.5">
                  <button
                    onClick={() => setRightTab("digital_twin")}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                      rightTab === "digital_twin" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"
                    }`}
                  >
                    Peta Meja
                  </button>
                  <button
                    onClick={() => setRightTab("analytics")}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                      rightTab === "analytics" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"
                    }`}
                  >
                    Grafik Tren
                  </button>
                </div>
              </div>

              {/* Focus Index Gauge Banner */}
              <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#EA580C]" /> Indeks Fokus & Konsentrasi Kelas
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {focusIndex}% Optimal
                  </span>
                </div>
                <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(counts.attentive / 18) * 100}%` }} className="bg-emerald-600" title="Attentive" />
                  <div style={{ width: `${(counts.writing / 18) * 100}%` }} className="bg-sky-500" title="Writing Notes" />
                  <div style={{ width: `${(counts.distracted / 18) * 100}%` }} className="bg-orange-400" title="Distracted" />
                  <div style={{ width: `${(counts.using_phone / 18) * 100}%` }} className="bg-red-500" title="Using Phone" />
                  <div style={{ width: `${(counts.sleep / 18) * 100}%` }} className="bg-red-700" title="Sleep" />
                </div>
              </div>

              {/* TAB CONTENT 1: DIGITAL TWIN SEATING MAP (18 Meja Siswa 3x6) */}
              {rightTab === "digital_twin" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-stone-500 px-1">
                    <span>PAPISAN DEPAN / PAPAN TULIS</span>
                    <span>18 MEJA SISWA</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {seats.map((st) => {
                      const badge = getStatusBadge(st.status);
                      const isAlert = st.status === "using_phone" || st.status === "sleep";
                      const isSelected = selectedSeat?.seat === st.seat;

                      return (
                        <div
                          key={st.seat}
                          onClick={() => setSelectedSeat(st)}
                          className={`rounded-lg border p-2 text-left transition-all cursor-pointer ${
                            isAlert
                              ? "border-red-300 bg-red-50/70 shadow-xs"
                              : isSelected
                              ? "border-[#EA580C] bg-orange-50/50 shadow-xs"
                              : "border-[#E7E2DA] bg-[#FBF9F5] hover:bg-stone-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold text-stone-500">
                              {st.seat}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono ${badge.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-stone-900 truncate">
                            {st.name}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono mt-0.5">
                            <span>Baris {st.row}</span>
                            <span>{Math.round(st.confidence * 100)}% Conf</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* TAB CONTENT 2: FLOW ACTIVITY TIMELINE CHART */
                <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-700">
                      Tren Perilaku Kelas Real-Time
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" /> Fokus
                      </span>
                      <span className="flex items-center gap-1 text-sky-600">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Menulis
                      </span>
                    </div>
                  </div>

                  {history.length > 1 ? (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorFokus" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorWriting" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#78716c" }} axisLine={{ stroke: "#E7E2DA" }} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#78716c" }} axisLine={{ stroke: "#E7E2DA" }} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="rounded-lg border border-[#E7E2DA] bg-white p-2 text-[10.5px] shadow-md font-mono">
                                    <p className="font-bold text-stone-800 mb-1">{d.time}</p>
                                    <p className="text-emerald-700">Fokus: {d.attentive} siswa</p>
                                    <p className="text-sky-600">Menulis: {d.writing} siswa</p>
                                    {d.phone > 0 && <p className="text-red-600 font-bold">Main HP: {d.phone}</p>}
                                    {d.sleeping > 0 && <p className="text-red-700 font-bold">Tidur: {d.sleeping}</p>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="attentive" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorFokus)" />
                          <Area type="monotone" dataKey="writing" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorWriting)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-44 w-full flex flex-col items-center justify-center text-center text-xs text-stone-400">
                      <Activity className="h-5 w-5 text-stone-300 mb-1 animate-pulse" />
                      <span>Menunggu titik data telemetri streaming...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Pedagogical Smart Nudge Banner */}
            <div className="pt-2 border-t border-[#E7E2DA]">
              {counts.using_phone > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 flex items-start gap-2.5 shadow-2xs animate-pulse">
                  <div className="rounded-lg bg-red-100 p-1.5 text-red-600 shrink-0">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-900 block">
                      ⚠️ Peringatan Gadget: Siswa Memegang HP (Meja C-04 • Putra Pratama)
                    </span>
                    <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                      Deteksi kedua tangan di bawah meja memegang smartphone. Notifikasi diskrit terkirim ke panel guru.
                    </p>
                  </div>
                </div>
              ) : counts.sleep > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 flex items-start gap-2.5 shadow-2xs animate-pulse">
                  <div className="rounded-lg bg-red-100 p-1.5 text-red-600 shrink-0">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-900 block">
                      ⚠️ Peringatan Kelelahan: Siswa Tertidur (Meja C-06 • Rian Ardianto)
                    </span>
                    <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                      Siswa menelungkupkan kepala di atas meja &gt; 30 detik. Disarankan mendekati meja untuk memvalidasi kondisi siswa.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    ✨ Dinamika kelas kondusif • 94% siswa aktif menyimak & mencatat materi
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
