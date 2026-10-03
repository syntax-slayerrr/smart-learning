"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { AdminScanner } from "@/components/attendance/admin-scanner";
import { useRouter } from "next/navigation";

export function AdminScannerTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 shadow-sm"
      >
        <Camera className="h-4 w-4" />
        Scan Kartu Siswa
      </button>

      {isOpen && (
        <AdminScanner
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
