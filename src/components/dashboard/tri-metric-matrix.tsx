import React from "react";
import { CheckCircle2, AlertTriangle, Video, LucideIcon, Sparkles } from "lucide-react";

export interface TriMetricItem {
  id: string;
  label: string;
  value: string | number;
  sublabel: string;
  icon?: LucideIcon | "check" | "warning" | "video" | "sparkles";
  variant: "success" | "warning" | "primary";
}

interface TriMetricMatrixProps {
  metrics?: TriMetricItem[];
  className?: string;
}

const DEFAULT_METRICS: TriMetricItem[] = [
  {
    id: "attendance",
    label: "Tepat Waktu",
    value: "94%",
    sublabel: "Kehadiran",
    icon: "check",
    variant: "success",
  },
  {
    id: "attention",
    label: "Perlu Atensi",
    value: "2",
    sublabel: "Siswa Alpa",
    icon: "warning",
    variant: "warning",
  },
  {
    id: "ai-sensor",
    label: "Kamera AI",
    value: "100%",
    sublabel: "Aktif Normal",
    icon: "video",
    variant: "primary",
  },
];

export function TriMetricMatrix({
  metrics = DEFAULT_METRICS,
  className = "",
}: TriMetricMatrixProps) {
  return (
    <div className={`grid grid-cols-3 gap-2.5 sm:gap-3.5 ${className}`}>
      {metrics.map((m) => {
        let IconComponent = CheckCircle2;
        if (typeof m.icon === "function" || (typeof m.icon === "object" && m.icon !== null)) {
          IconComponent = m.icon as LucideIcon;
        } else if (m.icon === "warning" || m.variant === "warning") {
          IconComponent = AlertTriangle;
        } else if (m.icon === "video") {
          IconComponent = Video;
        } else if (m.icon === "sparkles") {
          IconComponent = Sparkles;
        }

        const colorStyles =
          m.variant === "success"
            ? {
                podBg: "bg-emerald-50 border border-emerald-200/60 text-emerald-600",
                valColor: "text-emerald-700",
              }
            : m.variant === "warning"
            ? {
                podBg: "bg-amber-50 border border-amber-200/60 text-amber-600",
                valColor: "text-amber-700",
              }
            : {
                podBg: "bg-blue-50 border border-blue-200/60 text-blue-600",
                valColor: "text-blue-700",
              };

        return (
          <div
            key={m.id}
            className="card-3d-chip flex flex-col items-center justify-between p-2.5 sm:p-3 text-center"
          >
            {/* Top Micro Icon */}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${colorStyles.podBg} mb-1.5`}
            >
              <IconComponent className="h-4 w-4 stroke-[2]" />
            </div>

            {/* Value */}
            <span
              className={`text-base sm:text-lg font-extrabold tracking-tight tabular ${colorStyles.valColor}`}
            >
              {m.value}
            </span>

            {/* Labels */}
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 tracking-tight line-clamp-1 mt-0.5">
              {m.label}
            </span>
            <span className="text-[9px] text-slate-400 font-medium line-clamp-1">
              {m.sublabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
