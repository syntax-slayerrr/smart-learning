import React from "react";
import { CheckCircle2, AlertTriangle, Video, LucideIcon, Sparkles } from "lucide-react";

export interface TriMetricItem {
  id: string;
  label: string;
  value: string | number;
  sublabel: string;
  icon?: LucideIcon | "check" | "warning" | "video" | "sparkles";
  variant: "success" | "warning" | "primary" | "info";
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
        let iconSrc = "/icons/status-success.png";
        if (m.variant === "warning" || m.icon === "warning") {
          iconSrc = "/icons/status-warning.png";
        } else if (m.icon === "video" || m.variant === "info" || m.variant === "primary") {
          iconSrc = "/icons/status-camera.png";
        }

        const colorStyles =
          m.variant === "success"
            ? {
                valColor: "text-emerald-700",
              }
            : m.variant === "warning"
            ? {
                valColor: "text-amber-700",
              }
            : {
                valColor: "text-blue-700",
              };

        return (
          <div
            key={m.id}
            className="card-3d-chip group flex flex-col items-center justify-between p-2.5 sm:p-3 text-center transition-all duration-200 hover:shadow-md"
          >
            {/* Top 3D Metric Icon */}
            <div className="flex h-9 w-9 items-center justify-center mb-1.5 transition-transform duration-200 group-hover:scale-105">
              <img
                src={iconSrc}
                alt=""
                className="h-8 w-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
              />
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
