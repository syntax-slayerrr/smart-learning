"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Camera,
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
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-2xs transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80">
              <Fingerprint className="h-5 w-5 stroke-[1.8]" />
              {isEnrolled && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                  Biometrik Wajah Siswa
                </h3>
                {isEnrolled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                    <CheckCircle2 className="h-3 w-3" />
                    Biometrik Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">
                    Belum Terdaftar
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-600 max-w-xl leading-relaxed">
                Digunakan untuk verifikasi kehadiran otomatis dan pengenalan posisi belajar di kelas.
              </p>
              {formattedDate && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Diverifikasi: {formattedDate} WIB</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">
                    Akurasi {qualityScore}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-2xs active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{isEnrolled ? "Pindai Ulang Wajah" : "Daftarkan Biometrik Wajah"}</span>
          </button>
        </div>

        {/* Info Grid Spec User-Friendly */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Presensi Otomatis: <strong className="font-medium text-slate-700">Kamera Kelas</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Verifikasi: <strong className="font-medium text-slate-700">{livenessVerified ? "Tatap Muka Valid" : "Standar"}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Privasi: <strong className="font-medium text-slate-700">Enkripsi Aman</strong></span>
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
