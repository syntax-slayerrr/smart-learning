"use client";

import React, { useState } from "react";
import { ShieldCheck, Camera, Sparkles, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { FaceIdEnrollmentModal } from "./face-id-enrollment-modal";

interface FaceIdCardProps {
  studentName: string;
}

export function FaceIdCard({ studentName }: FaceIdCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(true); // Default true atau read from profile

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs text-card-foreground transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Biometrik Face ID Kelas
                </h3>
                {isEnrolled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Belum Terdaftar
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                Digunakan untuk presensi kelas otomatis dan pengenalan meja cerdas oleh kamera AI saat kegiatan belajar mengajar berlangsung.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Camera className="h-4 w-4" />
            <span>{isEnrolled ? "Pindai Ulang Wajah" : "Daftarkan Face ID"}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          </button>
        </div>

        {/* Info Grid Spec */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Mesin: ArcFace 512-D</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Anti-Swap: Anchor Meja Statis</span>
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
          setIsEnrolled(true);
        }}
      />
    </>
  );
}
