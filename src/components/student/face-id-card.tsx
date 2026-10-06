"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Camera,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Clock,
  Fingerprint,
} from "lucide-react";
import { FaceIdEnrollmentModal } from "./face-id-enrollment-modal";
import { useFaceIdStatus } from "@/lib/biometrics-cache";

interface FaceIdCardProps {
  studentName: string;
}

export function FaceIdCard({ studentName }: FaceIdCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    isEnrolled,
    enrolledAt,
    qualityScore,
    engine,
    livenessVerified,
    markEnrolled,
  } = useFaceIdStatus(studentName);

  const formattedDate = enrolledAt
    ? new Date(enrolledAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs text-card-foreground transition-all backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
              <Fingerprint className="h-6 w-6 stroke-[1.8]" />
              {isEnrolled && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-card" />
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Biometrik Face ID Kelas
                </h3>
                {isEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Face ID Aktif ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:text-blue-400 border border-primary/20">
                    Belum Didaftarkan
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl leading-relaxed">
                Digunakan untuk presensi kelas otomatis dan pengenalan meja cerdas oleh kamera AI saat kegiatan belajar mengajar berlangsung.
              </p>
              {formattedDate && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-mono">
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  <span>Diverifikasi: {formattedDate} WIB</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Akurasi {qualityScore}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer min-h-[42px]"
          >
            <Camera className="h-4 w-4" />
            <span>{isEnrolled ? "Pindai Ulang Wajah" : "Daftarkan Face ID"}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          </button>
        </div>

        {/* Info Grid Spec */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Mesin: {engine || "ArcFace 512-D"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Liveness: {livenessVerified ? "Blink Certified" : "Aktif"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            <span>Enkripsi: Vektor Fitur Lokal</span>
          </div>
        </div>
      </div>

      {/* Modal Scanner */}
      <FaceIdEnrollmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentName={studentName}
        onSuccess={() => {
          markEnrolled();
        }}
      />
    </>
  );
}
