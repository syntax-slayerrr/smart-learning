"use client";

import { MapPin } from "lucide-react";

interface TeacherMobilityMapProps {
  zones: { zone: string; count: number }[];
}

const zonePositions: Record<string, { x: number; y: number; label: string }> = {
  front_left: { x: 15, y: 15, label: "Dpn Kiri" },
  front_center: { x: 50, y: 15, label: "Dpn Tengah" },
  front_right: { x: 85, y: 15, label: "Dpn Kanan" },
  whiteboard_left: { x: 25, y: 8, label: "Papan Kiri" },
  whiteboard_center: { x: 50, y: 8, label: "Papan Tengah" },
  whiteboard_right: { x: 75, y: 8, label: "Papan Kanan" },
  aisle: { x: 50, y: 50, label: "Lorong" },
  walking_aisle: { x: 50, y: 50, label: "Lorong" },
  center: { x: 50, y: 50, label: "Tengah" },
  back: { x: 50, y: 85, label: "Belakang" },
  back_left: { x: 15, y: 85, label: "Blk Kiri" },
  back_right: { x: 85, y: 85, label: "Blk Kanan" },
  left: { x: 15, y: 50, label: "Kiri" },
  right: { x: 85, y: 50, label: "Kanan" },
};

export function TeacherMobilityMap({ zones }: TeacherMobilityMapProps) {
  if (!zones || zones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E7E2DA] bg-white p-8 text-center shadow-2xs">
        <MapPin className="h-8 w-8 mx-auto text-stone-300 mb-2" />
        <p className="text-xs text-stone-500 font-medium">
          Belum ada data mobilitas pergerakan guru
        </p>
        <p className="text-[10px] text-stone-400 mt-1">
          Kamera edge akan mendeteksi zona mengajar guru saat sesi aktif
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...zones.map((z) => z.count), 1);

  return (
    <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#EA580C]" />
          Peta Mobilitas & Radar Posisi Guru
        </h4>
        <span className="text-[10px] font-mono text-stone-400">Classroom Heatmap</span>
      </div>

      <div className="relative w-full aspect-[4/3] bg-[#FBF9F5] rounded-xl border border-[#E7E2DA] overflow-hidden">
        {/* Classroom layout */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {/* Whiteboard area */}
          <rect x="10" y="2" width="80" height="6" rx="1.5" className="fill-[#E7E2DA]" />
          <text x="50" y="6.5" textAnchor="middle" className="fill-stone-500 text-[3px] font-bold tracking-wider">
            PAPAN TULIS & MEJA GURU
          </text>

          {/* Desk rows */}
          {[30, 45, 60, 75].map((y) =>
            [20, 40, 60, 80].map((x) => (
              <rect
                key={`desk-${x}-${y}`}
                x={x - 6}
                y={y - 3}
                width="12"
                height="6"
                rx="1"
                className="fill-white stroke-[#E7E2DA]"
                strokeWidth="0.5"
              />
            ))
          )}

          {/* Heat zones */}
          {zones.map((z) => {
            const pos = zonePositions[z.zone];
            if (!pos) return null;
            const intensity = z.count / maxCount;
            const radius = 6 + intensity * 10;
            const opacity = 0.2 + intensity * 0.45;

            return (
              <g key={z.zone}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill="#EA580C"
                  opacity={opacity}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius * 0.5}
                  fill="#EA580C"
                  opacity={opacity * 1.4}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={2}
                  fill="#EA580C"
                  opacity={0.9}
                />
                <text
                  x={pos.x}
                  y={pos.y + radius + 4}
                  textAnchor="middle"
                  className="fill-stone-600 text-[2.5px] font-bold"
                >
                  {pos.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Zone Legend */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {zones
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((z) => {
            const pos = zonePositions[z.zone];
            return (
              <span
                key={z.zone}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E2DA] bg-[#FBF9F5] px-2.5 py-1 text-[11px] font-medium text-stone-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                {pos?.label || z.zone}: <span className="font-mono font-bold text-stone-900">{z.count}×</span>
              </span>
            );
          })}
      </div>
    </div>
  );
}
