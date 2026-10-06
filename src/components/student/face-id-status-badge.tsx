"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Fingerprint, ScanFace } from "lucide-react";
import { useFaceIdStatus } from "@/lib/biometrics-cache";
import { FaceIdEnrollmentModal } from "./face-id-enrollment-modal";

interface FaceIdStatusBadgeProps {
  studentName?: string;
  className?: string;
  variant?: "pill" | "chip" | "banner";
  showModalTrigger?: boolean;
}

export function FaceIdStatusBadge({
  studentName = "Siswa",
  className = "",
  variant = "pill",
  showModalTrigger = false,
}: FaceIdStatusBadgeProps) {
  const { isEnrolled, qualityScore, markEnrolled } = useFaceIdStatus(studentName);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "pill") {
    return (
      <>
        <button
          type="button"
          onClick={() => showModalTrigger && setIsModalOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            showModalTrigger ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
          } ${
            isEnrolled
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-2xs"
              : "bg-primary/8 text-primary dark:text-blue-400 border-primary/20 hover:bg-primary/12"
          } ${className}`}
        >
          {isEnrolled ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Face ID: Aktif</span>
              <span className="text-[10px] opacity-70 font-mono">({qualityScore}%)</span>
            </>
          ) : (
            <>
              <ScanFace className="h-3 w-3 stroke-[2] opacity-80" />
              <span>Face ID: Siap Didaftarkan</span>
            </>
          )}
        </button>

        {showModalTrigger && (
          <FaceIdEnrollmentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            studentName={studentName}
            onSuccess={() => markEnrolled()}
          />
        )}
      </>
    );
  }

  // Chip or Banner
  return (
    <>
      <div
        onClick={() => showModalTrigger && setIsModalOpen(true)}
        className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
          showModalTrigger ? "cursor-pointer hover:border-border hover:shadow-xs" : ""
        } ${
          isEnrolled
            ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
            : "bg-primary/5 border-primary/15 text-foreground hover:border-primary/30"
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              isEnrolled
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 border-primary/20 text-primary dark:text-blue-400"
            }`}
          >
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span>{isEnrolled ? "Biometrik Face ID Aktif" : "Biometrik Belum Didaftarkan"}</span>
              {isEnrolled && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 inline" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {isEnrolled
                ? "Presensi otomatis & liveness terverifikasi"
                : "Daftarkan wajah untuk presensi kilat berbasis AI"}
            </p>
          </div>
        </div>

        {showModalTrigger && (
          <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>{isEnrolled ? "Pindai Ulang" : "Daftar"}</span>
            <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>

      {showModalTrigger && (
        <FaceIdEnrollmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          studentName={studentName}
          onSuccess={() => markEnrolled()}
        />
      )}
    </>
  );
}
