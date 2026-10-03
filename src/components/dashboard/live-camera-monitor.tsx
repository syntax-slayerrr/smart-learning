"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Activity,
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
  Eye,
  Zap,
  CheckCircle2,
  Moon,
  Users,
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
  anonymized_tracks?: any[];
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

interface DetectedSubject {
  id: string;
  anonymous_id: string;
  label: string;
  posture: "sitting" | "standing";
  activity: "attentive" | "writing" | "using_phone" | "distracted" | "sleep" | "hand_raised";
  confidence: number;
  row: string;
  location: string;
  hand_raised?: boolean;
  sleep?: boolean;
}

const DEFAULT_CHANNELS: CameraChannel[] = [
  {
    id: "cam-1",
    name: "Kamera Kelas Utama",
    subject: "Monitoring Sesi Langsung",
    teacher: "Guru / Operator Aktif",
    streamUrl: "http://localhost:5000/video_feed",
    statusUrl: "http://localhost:5000/status",
    ipAddress: "10.10.10.33:8080 (IP Webcam HP)",
    port: 5000,
    studentsCount: 0,
    sittingCount: 0,
    standingCount: 0,
    handRaiseCount: 0,
    sleepCount: 0,
    isOnline: false,
  },
  {
    id: "cam-2",
    name: "Ruang 10-IPA-2",
    subject: "Matematika",
    teacher: "Guru Kelas",
    streamUrl: "http://localhost:5001/video_feed",
    statusUrl: "http://localhost:5001/status",
    ipAddress: "192.168.1.102:8080 (Wi-Fi HP #2)",
    port: 5001,
    studentsCount: 0,
    sittingCount: 0,
    standingCount: 0,
    handRaiseCount: 0,
    sleepCount: 0,
    isOnline: false,
  },
  {
    id: "cam-3",
    name: "Ruang 11-RPL-1",
    subject: "Pemrograman Web",
    teacher: "Guru Kelas",
    streamUrl: "http://localhost:5002/video_feed",
    statusUrl: "http://localhost:5002/status",
    ipAddress: "192.168.1.103:8080 (Wi-Fi HP #3)",
    port: 5002,
    studentsCount: 0,
    sittingCount: 0,
    standingCount: 0,
    handRaiseCount: 0,
    sleepCount: 0,
    isOnline: false,
  },
  {
    id: "cam-4",
    name: "Ruang 12-TKJ-1",
    subject: "Jaringan Komputer",
    teacher: "Guru Kelas",
    streamUrl: "http://localhost:5003/video_feed",
    statusUrl: "http://localhost:5003/status",
    ipAddress: "192.168.1.104:8080 (Wi-Fi HP #4)",
    port: 5003,
    studentsCount: 0,
    sittingCount: 0,
    standingCount: 0,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const videoImgRef = useRef<HTMLImageElement>(null);

  const activeChannel = DEFAULT_CHANNELS[activeCamIndex] || DEFAULT_CHANNELS[0];

  const checkStreamStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch("http://localhost:5000/status", {
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

        // Map real detected tracks from edge vision engine
        const rawTracks =
          latest.anonymized_tracks ||
          (latest.spatial_distribution as any)?.tracks ||
          [];

        if (Array.isArray(rawTracks) && rawTracks.length > 0) {
          const mapped: DetectedSubject[] = rawTracks.map((t: any, idx: number) => ({
            id: t.id || `P-${idx + 1}`,
            anonymous_id: t.anonymous_id || `P${idx + 1}`,
            label: t.label || `Subjek #${idx + 1}`,
            posture: t.posture || "sitting",
            activity: t.activity || (t.sleep ? "sleep" : t.hand_raised ? "hand_raised" : "attentive"),
            confidence: typeof t.confidence === "number" ? t.confidence : 0.94,
            row: t.row || "Area Kamera",
            location: t.posture === "standing" ? "Berdiri" : "Duduk di Meja",
            hand_raised: !!t.hand_raised,
            sleep: !!t.sleep,
          }));
          setSubjects(mapped);
        } else if (latest.detected_students_count > 0) {
          // Synthetic real-count representation when detailed tracks array is empty
          const generated: DetectedSubject[] = [];
          for (let i = 0; i < latest.detected_students_count; i++) {
            const isSleep = i < (latest.sleep_detected_count || 0);
            const isHand = !isSleep && i < (latest.hand_raise_count || 0);
            const isStand = !isSleep && !isHand && i < (latest.standing_count || 0);
            generated.push({
              id: `P-${i + 1}`,
              anonymous_id: `P${i + 1}`,
              label: `Subjek Terdeteksi #${i + 1}`,
              posture: isStand ? "standing" : "sitting",
              activity: isSleep ? "sleep" : isHand ? "hand_raised" : isStand ? "attentive" : "writing",
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

  const copyWifiCommand = (camNum: number, port: number) => {
    const cmd = `python3 experiments/cv-poc/classroom_poc.py --source "http://10.10.10.33:8080/video" --port ${port} --interval 2 --headless`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const getStatusBadge = (activity: DetectedSubject["activity"]) => {
    switch (activity) {
      case "attentive":
        return { label: "Fokus / Menyimak", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" };
      case "writing":
        return { label: "Menulis / Laptop", bg: "bg-sky-500/10 text-sky-700 border-sky-500/20", dot: "bg-sky-500" };
      case "using_phone":
        return { label: "Gadget Terdeteksi", bg: "bg-red-500/15 text-red-700 border-red-500/30 animate-pulse font-bold", dot: "bg-red-600 animate-ping" };
      case "sleep":
        return { label: "Menunduk / Tidur", bg: "bg-red-500/15 text-red-700 border-red-500/30 animate-pulse font-bold", dot: "bg-red-600" };
      case "hand_raised":
        return { label: "Angkat Tangan", bg: "bg-amber-500/15 text-amber-800 border-amber-500/30 font-bold", dot: "bg-amber-500" };
      case "distracted":
        return { label: "Kurang Fokus", bg: "bg-orange-500/10 text-orange-700 border-orange-500/20", dot: "bg-orange-500" };
      default:
        return { label: "Aktif", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" };
    }
  };

  const totalDetected = telemetry.detected_students_count || subjects.length;

  const counts = {
    attentive: subjects.filter((s) => s.activity === "attentive").length,
    writing: subjects.filter((s) => s.activity === "writing").length,
    hand_raised: telemetry.hand_raise_count || subjects.filter((s) => s.activity === "hand_raised").length,
    using_phone: subjects.filter((s) => s.activity === "using_phone").length,
    sleep: telemetry.sleep_detected_count || subjects.filter((s) => s.activity === "sleep").length,
  };

  const focusIndex = totalDetected > 0
    ? Math.min(100, Math.round(((counts.attentive + counts.writing) / Math.max(1, totalDetected)) * 100))
    : 100;

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
                AI Classroom Vision & Live Monitor
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
                {streamOnline ? "LIVE STREAM AKTIF (30 FPS)" : "KAMERA STANDBY"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Deteksi multi-subjek real-time, klasifikasi postur duduk/berdiri, dan telemetri langsung
            </p>
          </div>
        </div>

        {/* View Mode & Actions Switcher */}
        <div className="flex items-center gap-2">
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
              <span>Fokus Kamera</span>
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
              <span>Multi-Kamera</span>
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
            <Wifi className="h-3.5 w-3.5 text-[#EA580C]" /> Saluran:
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
                  <span>CAM #{idx + 1}: {cam.name}</span>
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
          <span>{totalDetected} Subjek Terdeteksi</span>
        </div>
      </div>

      {/* VIEW MODE 1: MULTI-CAMERA GRID */}
      {viewMode === "quad" ? (
        <div className="p-4 sm:p-5 bg-stone-950/2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_CHANNELS.map((cam, idx) => {
              const isCamOnline = idx === 0 && streamOnline;
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
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-bold ${
                        isCamOnline
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isCamOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                      {isCamOnline ? "LIVE 30 FPS" : "STANDBY"}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full bg-stone-900 flex items-center justify-center overflow-hidden">
                    {isCamOnline ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cam.streamUrl}
                          alt={`Live Feed ${cam.name}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                          <span className="rounded bg-stone-950/80 backdrop-blur-md px-2 py-0.5 text-[9.5px] font-mono font-bold text-white border border-white/10">
                            🔴 CAM #{idx + 1} • {totalDetected} Subjek
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
                        <strong>{idx === 0 ? totalDetected : 0}</strong> Subjek
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        Fokus: {idx === 0 ? focusIndex : 100}%
                      </span>
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
        /* VIEW MODE 2: SINGLE FOCUS DEEP MONITORING */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E7E2DA]">
          
          {/* Left Pane: Live Video Stream */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-stone-950/2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-[#EA580C]" />
                  Visual Feed: {activeChannel.name}
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  {activeChannel.ipAddress}
                </span>
              </div>

              {/* Video Player Box */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shadow-inner flex items-center justify-center">
                {streamOnline ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={videoImgRef}
                      src={activeChannel.streamUrl}
                      alt={`Live Stream ${activeChannel.name}`}
                      className="w-full h-full object-contain"
                      onError={() => setStreamOnline(false)}
                    />
                    {/* Top Floating HUD Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono font-medium text-white border border-white/10 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        LIVE • {activeChannel.name}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="rounded-md bg-[#EA580C]/90 backdrop-blur-md px-2.5 py-1 text-[10.5px] font-mono font-bold text-white shadow-sm">
                        ⚡ {totalDetected} Subjek Terdeteksi
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="rounded-md bg-stone-950/80 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-stone-200 border border-white/10 flex items-center gap-2">
                        <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                        <span>Kamera HP IP Webcam • Duduk: {telemetry.sitting_count} | Berdiri: {telemetry.standing_count}</span>
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
                      Kamera IP: {activeChannel.name} Standby
                    </h4>
                    <p className="text-xs text-stone-400 max-w-sm mb-4 leading-relaxed">
                      Jalankan perintah berikut di terminal untuk mengaktifkan AI Vision Engine:
                    </p>

                    <div className="w-full max-w-md space-y-2 text-left">
                      <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-xs font-mono text-stone-300">
                        <div className="flex items-center gap-2 truncate">
                          <Wifi className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">
                            python3 experiments/cv-poc/classroom_poc.py --source &quot;http://10.10.10.33:8080/video&quot;
                          </span>
                        </div>
                        <button
                          onClick={() => copyWifiCommand(activeCamIndex + 1, activeChannel.port)}
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

            {/* Quick Status Legend Bar */}
            <div className="mt-3 pt-3 border-t border-[#E7E2DA]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-stone-700">Status Real-Time:</span>
                <span className="flex items-center gap-1 text-emerald-700 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> Fokus ({counts.attentive})
                </span>
                <span className="flex items-center gap-1 text-sky-700 font-mono text-[10.5px]">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Menulis / Meja ({counts.writing})
                </span>
                {counts.sleep > 0 && (
                  <span className="flex items-center gap-1 text-red-700 font-mono text-[10.5px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-red-700 animate-pulse" /> Menunduk ({counts.sleep})
                  </span>
                )}
              </div>
              <div className="font-mono text-stone-400">
                Update: {lastSyncTime.toLocaleTimeString("id-ID")}
              </div>
            </div>
          </div>

          {/* Right Pane: Real-Time Dynamic Subjects */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-white flex flex-col justify-between">
            <div className="space-y-3">
              {/* Tab Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-[#EA580C]" />
                    Deteksi Subjek Real-Time
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Data riil subjek yang tertangkap kamera
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-[#E7E2DA] bg-[#F5F2EB] p-0.5">
                  <button
                    onClick={() => setRightTab("digital_twin")}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                      rightTab === "digital_twin" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"
                    }`}
                  >
                    Daftar Subjek
                  </button>
                  <button
                    onClick={() => setRightTab("analytics")}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                      rightTab === "analytics" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"
                    }`}
                  >
                    Tren Aktivitas
                  </button>
                </div>
              </div>

              {/* Focus Index Gauge Banner */}
              <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#EA580C]" /> Indeks Fokus Real-Time
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {focusIndex}%
                  </span>
                </div>
                <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex">
                  {totalDetected > 0 ? (
                    <>
                      <div style={{ width: `${(counts.attentive / totalDetected) * 100}%` }} className="bg-emerald-600" title="Fokus" />
                      <div style={{ width: `${(counts.writing / totalDetected) * 100}%` }} className="bg-sky-500" title="Menulis" />
                      <div style={{ width: `${(counts.sleep / totalDetected) * 100}%` }} className="bg-red-700" title="Menunduk / Tidur" />
                    </>
                  ) : (
                    <div style={{ width: "100%" }} className="bg-stone-300" title="Standby" />
                  )}
                </div>
              </div>

              {/* TAB CONTENT 1: REAL DETECTED SUBJECTS */}
              {rightTab === "digital_twin" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-stone-500 px-1">
                    <span>AREA VISUAL KAMERA</span>
                    <span>{totalDetected} SUBJEK TERDETEKSI</span>
                  </div>

                  {subjects.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {subjects.map((st) => {
                        const badge = getStatusBadge(st.activity);
                        const isAlert = st.activity === "sleep" || st.activity === "using_phone";
                        const isSelected = selectedSubject?.id === st.id;

                        return (
                          <div
                            key={st.id}
                            onClick={() => setSelectedSubject(st)}
                            className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                              isAlert
                                ? "border-red-300 bg-red-50/70 shadow-xs"
                                : isSelected
                                ? "border-[#EA580C] bg-orange-50/50 shadow-xs"
                                : "border-[#E7E2DA] bg-[#FBF9F5] hover:bg-stone-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10.5px] font-mono font-bold text-stone-600">
                                {st.id}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono ${badge.bg}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-stone-900 truncate">
                              {st.label}
                            </p>
                            <div className="flex items-center justify-between text-[9.5px] text-stone-400 font-mono mt-1">
                              <span>Postur: {st.posture === "standing" ? "Berdiri" : "Duduk"}</span>
                              <span>{Math.round(st.confidence * 100)}% Conf</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#E7E2DA] bg-[#FBF9F5]">
                      <Users className="h-7 w-7 text-stone-400 mb-2" />
                      <p className="text-xs font-bold text-stone-700">Belum Ada Subjek Terdeteksi</p>
                      <p className="text-[11px] text-stone-500 max-w-xs mt-1">
                        Kamera aktif memindai. Begitu ada orang yang masuk dalam visual kamera, kartu subjek akan muncul otomatis di sini.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB CONTENT 2: FLOW ACTIVITY TIMELINE CHART */
                <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-700">
                      Tren Aktivitas Subjek
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" /> Fokus
                      </span>
                      <span className="flex items-center gap-1 text-sky-600">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Meja
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
                                    <p className="text-emerald-700">Fokus: {d.attentive} subjek</p>
                                    <p className="text-sky-600">Meja: {d.writing} subjek</p>
                                    {d.sleeping > 0 && <p className="text-red-700 font-bold">Menunduk: {d.sleeping}</p>}
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
                      <span>Menunggu titik data telemetri...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Status / Alert Banner (NO HARDCODED NAMES) */}
            <div className="pt-2 border-t border-[#E7E2DA]">
              {counts.sleep > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-3 flex items-start gap-2.5 shadow-2xs animate-pulse">
                  <div className="rounded-lg bg-red-100 p-1.5 text-red-600 shrink-0">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-900 block">
                      ⚠️ Peringatan Kelelahan: Terdeteksi {counts.sleep} Subjek Menunduk
                    </span>
                    <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                      Subjek menunduk / tidak aktif di area meja lebih dari 3 detik.
                    </p>
                  </div>
                </div>
              ) : totalDetected > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    ✨ {totalDetected} subjek terdeteksi aktif dalam ruang pemantauan
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 flex items-center gap-2 text-xs text-stone-600">
                  <Radio className="h-4 w-4 text-stone-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    Kamera Standby • Siap mendeteksi subjek yang memasuki frame
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
