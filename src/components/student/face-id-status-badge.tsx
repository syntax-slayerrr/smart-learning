"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Camera, Sparkles, ChevronRight, Fingerprint } from "lucide-react";
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
        <div
          onClick={() => showModalTrigger && setIsModalOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            showModalTrigger ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
          } ${
            isEnrolled
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 shadow-2xs"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
          } ${className}`}
        >
          {isEnrolled ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Face ID: Aktif ✓</span>
              <span className="text-[10px] opacity-70 font-mono">({qualityScore}%)</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Face ID: Belum Aktif</span>
            </>
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
            : "bg-amber-500/5 border-amber-500/20 text-foreground"
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              isEnrolled
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span>{isEnrolled ? "Biometrik Face ID Aktif" : "Biometrik Belum Aktif"}</span>
              {isEnrolled && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 inline" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {isEnrolled
                ? "Presensi otomatis & liveness terverifikasi"
                : "Daftarkan wajah untuk presensi kilat"}
            </p>
          </div>
        </div>

        {showModalTrigger && (
          <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>{isEnrolled ? "Ubah" : "Daftar"}</span>
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
