"use client";

import React, { useState, useMemo, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Info,
  Maximize2,
  RefreshCw,
  Zap,
} from "lucide-react";

export interface ConceptNodeData {
  id: string;
  label: string;
  category: "chapter" | "concept" | "formula" | "methodology";
  summary: string;
  difficultyLevel: number;
  referencePage: number;
  x: number;
  y: number;
  masteryScore?: number; // 0-100
}

export interface ConceptEdgeData {
  id: string;
  source: string;
  target: string;
  relationType: "prerequisite_of" | "relates_to" | "part_of" | "applies_to";
  strength: number;
}

const DEFAULT_NODES: ConceptNodeData[] = [
  {
    id: "node-ipv4",
    label: "IPv4 Addressing",
    category: "chapter",
    summary: "Struktur 32-bit biner yang dibagi menjadi 4 oktet desimal titik untuk pengalamatan perangkat logika di jaringan.",
    difficultyLevel: 1,
    referencePage: 12,
    x: 180,
    y: 160,
    masteryScore: 92,
  },
  {
    id: "node-subnetmask",
    label: "Subnet Mask",
    category: "concept",
    summary: "Bitmask 32-bit yang memisahkan Network ID dan Host ID dalam sebuah alamat IP.",
    difficultyLevel: 2,
    referencePage: 15,
    x: 380,
    y: 90,
    masteryScore: 84,
  },
  {
    id: "node-cidr",
    label: "Notasi CIDR (/xx)",
    category: "formula",
    summary: "Classless Inter-Domain Routing: representasi prefix bit subnet mask (contoh /24 = 255.255.255.0).",
    difficultyLevel: 3,
    referencePage: 18,
    x: 580,
    y: 110,
    masteryScore: 68,
  },
  {
    id: "node-vlsm",
    label: "VLSM Subnetting",
    category: "methodology",
    summary: "Variable Length Subnet Masking: teknik membagi subnet menjadi ukuran bervariasi sesuai kebutuhan host nyata untuk menghemat alamat IP.",
    difficultyLevel: 5,
    referencePage: 23,
    x: 480,
    y: 270,
    masteryScore: 42, // Titik lemah
  },
  {
    id: "node-gateway",
    label: "Default Gateway",
    category: "concept",
    summary: "Pintu keluar router yang menghubungkan subnet lokal ke jaringan luar atau internet.",
    difficultyLevel: 2,
    referencePage: 29,
    x: 230,
    y: 310,
    masteryScore: 88,
  },
  {
    id: "node-routing",
    label: "Routing RIP / OSPF",
    category: "chapter",
    summary: "Mekanisme penerusan paket antar subnet berbeda menggunakan tabel routing dinamis.",
    difficultyLevel: 4,
    referencePage: 34,
    x: 350,
    y: 430,
    masteryScore: 64,
  },
];

const DEFAULT_EDGES: ConceptEdgeData[] = [
  { id: "e1", source: "node-ipv4", target: "node-subnetmask", relationType: "prerequisite_of", strength: 1.0 },
  { id: "e2", source: "node-subnetmask", target: "node-cidr", relationType: "prerequisite_of", strength: 0.9 },
  { id: "e3", source: "node-cidr", target: "node-vlsm", relationType: "prerequisite_of", strength: 1.0 },
  { id: "e4", source: "node-ipv4", target: "node-gateway", relationType: "relates_to", strength: 0.8 },
  { id: "e5", source: "node-vlsm", target: "node-routing", relationType: "applies_to", strength: 0.9 },
  { id: "e6", source: "node-gateway", target: "node-routing", relationType: "prerequisite_of", strength: 0.7 },
];

export interface InteractiveConceptGraphProps {
  nodes?: ConceptNodeData[];
  edges?: ConceptEdgeData[];
  onSelectConceptPage?: (page: number) => void;
  onAskSmartAI?: (conceptName: string) => void;
  className?: string;
}

export function InteractiveConceptGraph({
  nodes,
  edges,
  onSelectConceptPage,
  onAskSmartAI,
  className,
}: InteractiveConceptGraphProps) {
  const activeNodes = useMemo(() => (nodes && nodes.length > 0 ? nodes : DEFAULT_NODES), [nodes]);
  const activeEdges = useMemo(() => (edges && edges.length > 0 ? edges : DEFAULT_EDGES), [edges]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => activeNodes[0]?.id || "node-vlsm");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Sync selectedNodeId if activeNodes updates
  useEffect(() => {
    if (!activeNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(activeNodes[0]?.id || "");
    }
  }, [activeNodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => activeNodes.find((n) => n.id === selectedNodeId) || activeNodes[0],
    [activeNodes, selectedNodeId]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, ConceptNodeData>();
    activeNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeNodes]);

  // Determine active connections
  const connectedNodeIds = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    const connected = new Set<string>();
    connected.add(targetId);
    activeEdges.forEach((edge) => {
      if (edge.source === targetId) connected.add(edge.target);
      if (edge.target === targetId) connected.add(edge.source);
    });
    return connected;
  }, [selectedNodeId, hoveredNodeId, activeEdges]);

  const getCategoryColor = (cat: ConceptNodeData["category"]) => {
    switch (cat) {
      case "chapter":
        return { bg: "bg-blue-500", border: "border-blue-600", text: "text-blue-700", ring: "ring-blue-400" };
      case "concept":
        return { bg: "bg-teal-500", border: "border-teal-600", text: "text-teal-700", ring: "ring-teal-400" };
      case "formula":
        return { bg: "bg-indigo-500", border: "border-indigo-600", text: "text-indigo-700", ring: "ring-indigo-400" };
      case "methodology":
        return { bg: "bg-purple-500", border: "border-purple-600", text: "text-purple-700", ring: "ring-purple-400" };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar with meta and legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/70 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Peta Konsep Hidup (Knowledge Graph)
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Visualisasi hierarki dan dependensi pemahaman bab dari materi modul
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 overflow-x-auto pb-0.5 sm:pb-0">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Bab Utama
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            Konsep Kunci
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            Metodologi
          </span>
        </div>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Graph Canvas Viewport */}
        <div className="lg:col-span-8 relative bg-gradient-to-b from-slate-50/80 to-slate-100/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-2 overflow-hidden shadow-inner min-h-[340px] sm:min-h-[440px] flex items-center justify-center">
          {/* Subtle Grid Dot Matrix Pattern */}
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <svg
            viewBox="0 0 760 520"
            className="w-full h-full max-h-[500px] select-none"
          >
            {/* Draw Edges */}
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>

            {activeEdges.map((edge) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              const isHighlighted =
                connectedNodeIds.has(edge.source) &&
                connectedNodeIds.has(edge.target);

              return (
                <g key={edge.id}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? "url(#edgeGrad)" : "#cbd5e1"}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeDasharray={edge.relationType === "relates_to" ? "4 4" : undefined}
                    className="transition-all duration-300"
                    markerEnd="url(#arrow)"
                  />
                  {/* Small relation label */}
                  {isHighlighted && (
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 8}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-mono font-medium"
                    >
                      {edge.relationType === "prerequisite_of"
                        ? "prasyarat"
                        : edge.relationType === "applies_to"
                        ? "diterapkan ke"
                        : "terkait"}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw Nodes */}
            {activeNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const colors = getCategoryColor(node.category);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(node.id)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setSelectedNodeId(node.id);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer touch-manipulation transition-transform duration-200"
                >
                  {/* Outer Focus Ring when selected */}
                  {isSelected && (
                    <circle
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-purple-500/40 animate-pulse"
                    />
                  )}

                  {/* Invisible large touch target for mobile thumb tapping */}
                  <circle
                    r="44"
                    fill="transparent"
                    className="cursor-pointer"
                  />

                  {/* Node Capsule Background */}
                  <circle
                    r={isSelected ? 32 : 26}
                    fill={isSelected ? "#ffffff" : isConnected ? "#f8fafc" : "#ffffff"}
                    stroke={
                      isSelected
                        ? "#7c3aed"
                        : isConnected
                        ? "#3b82f6"
                        : "#cbd5e1"
                    }
                    strokeWidth={isSelected ? 3 : 2}
                    className="shadow-md transition-all duration-200"
                  />

                  {/* Inner Category Dot */}
                  <circle
                    r="8"
                    className={`${colors.bg} transition-transform duration-200 ${
                      isSelected || isHovered ? "scale-125" : ""
                    }`}
                  />

                  {/* Mastery Score Ring indicator */}
                  {node.masteryScore !== undefined && (
                    <circle
                      r={isSelected ? 35 : 29}
                      fill="none"
                      stroke={
                        node.masteryScore < 50
                          ? "#ef4444"
                          : node.masteryScore < 75
                          ? "#f59e0b"
                          : "#10b981"
                      }
                      strokeWidth="2.5"
                      strokeDasharray={`${(node.masteryScore / 100) * 180} 360`}
                      transform="rotate(-90)"
                      className="transition-all duration-500"
                    />
                  )}

                  {/* Node Label Text */}
                  <text
                    y={isSelected ? 48 : 42}
                    textAnchor="middle"
                    fill={isSelected ? "#0f172a" : "#334155"}
                    fontSize={isSelected ? "12" : "11"}
                    fontWeight={isSelected ? "700" : "600"}
                    className="select-none transition-all duration-200"
                  >
                    {node.label}
                  </text>

                  {/* Mastery Pill */}
                  <text
                    y={isSelected ? 62 : 54}
                    textAnchor="middle"
                    fill={
                      node.masteryScore && node.masteryScore < 50
                        ? "#dc2626"
                        : "#64748b"
                    }
                    fontSize="9.5"
                    fontWeight="600"
                    className="select-none font-mono"
                  >
                    {node.masteryScore ? `${node.masteryScore}% paham` : ""}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick Helper Floating Badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-medium text-slate-600 flex items-center gap-1.5 shadow-sm">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Klik simpul untuk membedah konsep & loncat ke bab
          </div>
        </div>

        {/* Node Inspector & AI Quick Study Card */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <GlassCard className="p-4 sm:p-5 flex-1 flex flex-col justify-between border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-slate-600">
                  Detail Simpul Konsep
                </span>
                <Badge
                  variant={
                    selectedNode?.category === "methodology"
                      ? "secondary"
                      : selectedNode?.category === "formula"
                      ? "warning"
                      : "default"
                  }
                  className="capitalize font-mono text-[10px]"
                >
                  {selectedNode?.category || "Konsep"}
                </Badge>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight">
                  {selectedNode?.label || "Pilih Simpul Konsep"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Terdokumentasi di Dokumen Resmi:{" "}
                  <strong className="text-slate-700">
                    Halaman {selectedNode?.referencePage || (selectedNode as any)?.page || 1}
                  </strong>
                </p>
              </div>

              {/* Mastery bar */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">Tingkat Penguasaan Siswa</span>
                  <span
                    className={`font-mono font-bold ${
                      ((selectedNode?.masteryScore || (selectedNode as any)?.mastery || 0)) < 50
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {selectedNode?.masteryScore || (selectedNode as any)?.mastery || 70}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ((selectedNode?.masteryScore || (selectedNode as any)?.mastery || 0)) < 50
                        ? "bg-red-500"
                        : ((selectedNode?.masteryScore || (selectedNode as any)?.mastery || 0)) < 75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${selectedNode?.masteryScore || (selectedNode as any)?.mastery || 70}%` }}
                  />
                </div>
                {((selectedNode?.masteryScore || (selectedNode as any)?.mastery || 0)) < 50 && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 pt-0.5">
                    ⚠️ Titik Lemah Terdeteksi! Disarankan penguatan konsep.
                  </p>
                )}
              </div>

              {/* Concept Summary */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-700">
                  Intisari Konsep (AI Extracted):
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {selectedNode?.summary || "Penjelasan ringkas konsep belum tersedia."}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                className="w-full justify-between text-xs h-9 bg-white hover:bg-slate-50"
                onClick={() => onSelectConceptPage?.(selectedNode?.referencePage || (selectedNode as any)?.page || 1)}
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                  Buka Bab di Halaman {selectedNode?.referencePage || (selectedNode as any)?.page || 1}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Button>

              <Button
                variant="primary"
                className="w-full justify-center text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                onClick={() => onAskSmartAI?.(selectedNode?.label || "Konsep Jaringan")}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Minta Smart AI Jelaskan Konsep Ini
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
