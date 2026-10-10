import React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Clock,
  CheckCircle2,
  PlayCircle,
  Calendar,
} from "lucide-react";

export interface ActivitySessionItem {
  id: string;
  subject: string;
  className: string;
  teacherName: string;
  time: string;
  status: "active" | "completed" | "scheduled";
  href?: string;
}

interface ActivityFeedCardProps {
  sessions: ActivitySessionItem[];
  title?: string;
  viewAllHref?: string;
  className?: string;
}

export function ActivityFeedCard({
  sessions,
  title = "Pembelajaran Terkini",
  viewAllHref = "/admin/sessions",
  className = "",
}: ActivityFeedCardProps) {
  return (
    <div className={`card-3d-ceramic p-4 sm:p-5 ${className}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Monitoring aktivitas kelas dan sesi belajar
          </p>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <span>Semua</span>
            <ChevronRight className="h-3.5 w-3.5 stroke-[2.2]" />
          </Link>
        )}
      </div>

      {/* List Items */}
      <div className="space-y-2.5">
        {sessions.length > 0 ? (
          sessions.map((item, idx) => {
            const isFirst = idx === 0;
            const podBg =
              item.status === "active"
                ? "bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]"
                : item.status === "completed"
                ? "bg-slate-900 text-white shadow-[0_4px_12px_-2px_rgba(15,23,42,0.25)]"
                : "bg-slate-100 text-slate-700 border border-slate-200/80";

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3 rounded-2xl bg-white/70 hover:bg-slate-50/80 border border-slate-100/90 transition-all duration-200"
              >
                {/* Left: 44x44 Apple HIG Pod with 3D Mata Pelajaran Icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-50/80 to-slate-50 border border-blue-100/60 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.15)] transition-transform group-hover:scale-105">
                    <img
                      src="/icons/mata-pelajaran.png"
                      alt={item.subject}
                      className="h-7 w-7 object-contain drop-shadow-xs"
                    />
                  </div>

                  {/* Middle: Title & Meta Stack */}
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">
                      {item.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.className} • {item.teacherName}
                    </p>
                  </div>
                </div>

                {/* Right: Status Pill & Time */}
                <div className="flex flex-col items-end shrink-0 pl-3">
                  {item.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Live
                    </span>
                  ) : item.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/60">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                      Selesai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                      <Clock className="h-2.5 w-2.5" />
                      Jadwal
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium font-mono tabular-nums mt-1">
                    {item.time}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Tidak ada aktivitas sesi belajar saat ini
          </div>
        )}
      </div>
    </div>
  );
}
