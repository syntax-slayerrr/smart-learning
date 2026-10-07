"use client";

import React, { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Network,
  GraduationCap,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Sliders,
  Award,
} from "lucide-react";

type CalculatorTab = "subnet" | "gpa";

interface CourseItem {
  id: string;
  name: string;
  sks: number;
  grade: "A" | "AB" | "B" | "BC" | "C" | "D" | "E";
}

const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  AB: 3.5,
  B: 3.0,
  BC: 2.5,
  C: 2.0,
  D: 1.0,
  E: 0.0,
};

export function InteractiveStudyCalculator() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>("subnet");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. SUBNEETING CALCULATOR STATE & LOGIC
  // -------------------------------------------------------------
  const [ipInput, setIpInput] = useState<string>("192.168.10.0");
  const [cidr, setCidr] = useState<number>(28);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const subnetResult = useMemo(() => {
    const parts = ipInput.trim().split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return null;
    }

    const safeCidr = Math.min(32, Math.max(8, cidr));
    const ipNum =
      ((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0);

    const maskNum = safeCidr === 0 ? 0 : (~0 << (32 - safeCidr)) >>> 0;
    const wildcardNum = (~maskNum) >>> 0;
    const networkNum = (ipNum & maskNum) >>> 0;
    const broadcastNum = (networkNum | wildcardNum) >>> 0;

    const numToIp = (n: number) =>
      `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;

    const numToBinary = (n: number) =>
      [
        ((n >>> 24) & 255).toString(2).padStart(8, "0"),
        ((n >>> 16) & 255).toString(2).padStart(8, "0"),
        ((n >>> 8) & 255).toString(2).padStart(8, "0"),
        (n & 255).toString(2).padStart(8, "0"),
      ].join(".");

    const totalHosts = Math.pow(2, 32 - safeCidr);
    const usableHosts = safeCidr >= 31 ? (safeCidr === 31 ? 2 : 1) : Math.max(0, totalHosts - 2);

    const firstUsable = safeCidr >= 31 ? networkNum : networkNum + 1;
    const lastUsable = safeCidr >= 31 ? broadcastNum : broadcastNum - 1;

    return {
      cidr: safeCidr,
      ip: ipInput.trim(),
      netmask: numToIp(maskNum),
      wildcard: numToIp(wildcardNum),
      network: numToIp(networkNum),
      broadcast: numToIp(broadcastNum),
      firstHost: numToIp(firstUsable),
      lastHost: numToIp(lastUsable),
      totalHosts,
      usableHosts,
      binaryMask: numToBinary(maskNum),
    };
  }, [ipInput, cidr]);

  // -------------------------------------------------------------
  // 2. GPA & SKS SIMULATOR STATE & LOGIC
  // -------------------------------------------------------------
  const [currentSks, setCurrentSks] = useState<number>(44);
  const [currentIpk, setCurrentIpk] = useState<number>(3.75);
  const [courses, setCourses] = useState<CourseItem[]>([
    { id: "c1", name: "Jaringan Komputer & Komunikasi Data", sks: 3, grade: "A" },
    { id: "c2", name: "Teori Bahasa dan Otomata", sks: 3, grade: "A" },
    { id: "c3", name: "Struktur Data & Algoritma Lanjut", sks: 3, grade: "AB" },
    { id: "c4", name: "Sistem Basis Data", sks: 3, grade: "A" },
  ]);

  const handleAddCourse = () => {
    const newId = "c" + Date.now();
    setCourses((prev) => [
      ...prev,
      { id: newId, name: `Mata Kuliah Baru ${prev.length + 1}`, sks: 3, grade: "A" },
    ]);
  };

  const handleRemoveCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCourse = (id: string, field: keyof CourseItem, val: any) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const gpaResult = useMemo(() => {
    const semesterSks = courses.reduce((acc, c) => acc + (Number(c.sks) || 0), 0);
    const semesterPoints = courses.reduce(
      (acc, c) => acc + (Number(c.sks) || 0) * (GRADE_POINTS[c.grade] ?? 0),
      0
    );

    const ips = semesterSks > 0 ? Number((semesterPoints / semesterSks).toFixed(2)) : 0;

    const prevPoints = (Number(currentSks) || 0) * (Number(currentIpk) || 0);
    const totalSks = (Number(currentSks) || 0) + semesterSks;
    const totalPoints = prevPoints + semesterPoints;
    const projectedIpk = totalSks > 0 ? Number((totalPoints / totalSks).toFixed(2)) : 0;

    let predicate = "Memuaskan";
    if (projectedIpk >= 3.51) {
      predicate = "Dengan Pujian (Cum Laude)";
    } else if (projectedIpk >= 3.0) {
      predicate = "Sangat Memuaskan";
    }

    return {
      semesterSks,
      ips,
      totalSks,
      projectedIpk,
      predicate,
    };
  }, [courses, currentSks, currentIpk]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Header & Apple HIG Segmented Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-200/60 flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Smart Academic Tools
            </span>
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F] mt-1">
            Kalkulator & Lab Simulasi Akademik
          </h3>
          <p className="text-xs text-[#6E6E73]">
            Perhitungan presisi tinggi untuk rekayasa jaringan IT dan proyeksi target akademik ITG.
          </p>
        </div>

        {/* Apple HIG Segmented Pills */}
        <div className="flex items-center p-1 bg-black/5 dark:bg-white/10 rounded-2xl border border-black/5">
          <button
            onClick={() => setActiveTab("subnet")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "subnet"
                ? "bg-white text-[#007AFF] shadow-xs scale-100"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Subnet & VLSM</span>
          </button>
          <button
            onClick={() => setActiveTab("gpa")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "gpa"
                ? "bg-white text-[#007AFF] shadow-xs scale-100"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Simulasi IPK</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SUBNETTING & VLSM CALCULATOR                       */}
      {/* ========================================================= */}
      {activeTab === "subnet" && (
        <div className="space-y-4">
          {/* Controls Card */}
          <div className="p-5 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1F] flex items-center justify-between">
                  <span>Alamat IP Host / Network</span>
                  <span className="text-[10px] text-[#86868B]">Format IPv4 standar</span>
                </label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="192.168.1.0"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 border border-black/10 focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 text-xs font-mono text-[#1D1D1F] outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1F] flex items-center justify-between">
                  <span>Prefix CIDR</span>
                  <span className="text-[10px] text-[#007AFF] font-bold">/{cidr}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={8}
                    max={30}
                    value={cidr}
                    onChange={(e) => setCidr(parseInt(e.target.value, 10))}
                    className="w-full accent-[#007AFF] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-[#1D1D1F] w-8 text-right">
                    /{cidr}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/5">
              <span className="text-[11px] text-[#86868B] font-medium mr-1">Preset Cepat:</span>
              {[
                { label: "Point-to-Point (/30)", cidrVal: 30, ipVal: "10.0.0.0" },
                { label: "Lab Komputer (/28 - 14 Host)", cidrVal: 28, ipVal: "192.168.10.0" },
                { label: "Kantor Cabang (/26 - 62 Host)", cidrVal: 26, ipVal: "172.16.0.0" },
                { label: "Default Kelas C (/24 - 254 Host)", cidrVal: 24, ipVal: "192.168.1.0" },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIpInput(p.ipVal);
                    setCidr(p.cidrVal);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/70 hover:bg-blue-50 text-[11px] font-medium text-[#1D1D1F] border border-black/5 hover:border-blue-200 hover:text-[#007AFF] transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          {subnetResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: "Subnet Mask", value: subnetResult.netmask, key: "mask" },
                { label: "Wildcard Mask", value: subnetResult.wildcard, key: "wildcard" },
                { label: "Network Address (ID)", value: subnetResult.network, key: "network" },
                { label: "Broadcast Address", value: subnetResult.broadcast, key: "broadcast" },
                {
                  label: "Host Min (Awal)",
                  value: subnetResult.firstHost,
                  key: "hostmin",
                },
                {
                  label: "Host Max (Akhir)",
                  value: subnetResult.lastHost,
                  key: "hostmax",
                },
                {
                  label: "Usable Host Count",
                  value: `${subnetResult.usableHosts.toLocaleString()} Host Aktif (${subnetResult.totalHosts.toLocaleString()} Total)`,
                  key: "hosts",
                  highlight: true,
                },
                {
                  label: "Binary Subnet Mask",
                  value: subnetResult.binaryMask,
                  key: "binary",
                  mono: true,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`p-4 rounded-2xl backdrop-blur-xl border flex items-center justify-between transition-all ${
                    item.highlight
                      ? "bg-blue-50/70 border-blue-200/80 text-[#007AFF]"
                      : "bg-white/60 hover:bg-white/75 border-white/70 text-[#1D1D1F]"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p
                      className={`text-xs font-bold ${
                        item.mono ? "font-mono text-[11px]" : "font-mono"
                      }`}
                    >
                      {item.value}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.value, item.key)}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-[#86868B] hover:text-[#1D1D1F] transition-all"
                    title="Salin hasil"
                  >
                    {copiedKey === item.key ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-800 text-xs text-center font-medium">
              Alamat IP tidak valid. Masukkan format IPv4 yang benar (contoh: 192.168.10.0).
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GPA & SKS SIMULATOR                                */}
      {/* ========================================================= */}
      {activeTab === "gpa" && (
        <div className="space-y-4">
          {/* Baseline SKS & Current IPK Inputs */}
          <div className="p-5 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1F]">
                  SKS Kumulatif Selesai (Semester Lalu)
                </label>
                <input
                  type="number"
                  min={0}
                  max={160}
                  value={currentSks}
                  onChange={(e) => setCurrentSks(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 border border-black/10 focus:border-[#007AFF] text-xs font-mono font-semibold text-[#1D1D1F] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1F]">
                  IPK Kumulatif Terakhir
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={4.0}
                  value={currentIpk}
                  onChange={(e) =>
                    setCurrentIpk(Math.min(4.0, Math.max(0, parseFloat(e.target.value) || 0)))
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/80 border border-black/10 focus:border-[#007AFF] text-xs font-mono font-semibold text-[#1D1D1F] outline-none"
                />
              </div>
            </div>

            {/* Course List Simulator */}
            <div className="space-y-2.5 pt-2 border-t border-black/5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                  Mata Kuliah Semester Ini & Target Nilai:
                </h4>
                <button
                  onClick={handleAddCourse}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#007AFF] text-xs font-semibold border border-blue-200/60 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah MK</span>
                </button>
              </div>

              <div className="space-y-2">
                {courses.map((course, idx) => (
                  <div
                    key={course.id}
                    className="p-3 rounded-2xl bg-white/70 border border-black/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex-1 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-slate-100 text-[10px] font-bold text-[#6E6E73] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={course.name}
                        onChange={(e) => handleUpdateCourse(course.id, "name", e.target.value)}
                        className="w-full bg-transparent text-xs font-medium text-[#1D1D1F] focus:outline-none border-b border-transparent focus:border-[#007AFF]"
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#86868B]">SKS:</span>
                        <select
                          value={course.sks}
                          onChange={(e) =>
                            handleUpdateCourse(course.id, "sks", parseInt(e.target.value, 10))
                          }
                          className="px-2 py-1 rounded-xl bg-white border border-black/10 text-xs font-bold text-[#1D1D1F] outline-none"
                        >
                          <option value={1}>1 SKS</option>
                          <option value={2}>2 SKS</option>
                          <option value={3}>3 SKS</option>
                          <option value={4}>4 SKS</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#86868B]">Grade:</span>
                        <select
                          value={course.grade}
                          onChange={(e) =>
                            handleUpdateCourse(course.id, "grade", e.target.value as any)
                          }
                          className="px-2.5 py-1 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-bold text-[#007AFF] outline-none"
                        >
                          <option value="A">A (4.0)</option>
                          <option value="AB">AB (3.5)</option>
                          <option value="B">B (3.0)</option>
                          <option value="BC">BC (2.5)</option>
                          <option value="C">C (2.0)</option>
                          <option value="D">D (1.0)</option>
                          <option value="E">E (0.0)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleRemoveCourse(course.id)}
                        disabled={courses.length <= 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-all"
                        title="Hapus mata kuliah"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Projection Summary Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/90 via-white/80 to-indigo-50/90 backdrop-blur-2xl border border-blue-200/80 shadow-[0_8px_32px_rgba(0,122,255,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-white/80 px-2.5 py-0.5 rounded-full border border-blue-200/60 inline-flex items-center gap-1">
                <Award className="h-3 w-3 text-[#007AFF]" />
                Hasil Proyeksi Smart Simulator
              </span>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                Predikat: {gpaResult.predicate}
              </h3>
              <p className="text-xs text-[#6E6E73]">
                Total Beban Semester: {gpaResult.semesterSks} SKS | Total Akumulasi: {gpaResult.totalSks} SKS
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-2xs">
                <p className="text-[10px] font-bold text-[#86868B] uppercase">IPS Semester</p>
                <p className="text-xl font-black text-[#007AFF]">{gpaResult.ips.toFixed(2)}</p>
              </div>

              <div className="text-center px-4 py-2.5 rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-300/60 shadow-2xs">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Proyeksi IPK</p>
                <p className="text-xl font-black text-emerald-600">
                  {gpaResult.projectedIpk.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
