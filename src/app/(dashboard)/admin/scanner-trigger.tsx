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
        className="apple-press inline-flex items-center gap-1.5 rounded-xl border border-[rgba(52,199,89,0.25)] bg-[#34C759]/10 px-3.5 py-2.5 text-xs font-semibold text-[#1D1D1F] hover:bg-[#34C759]/20 transition-all min-h-[44px]"
      >
        <Camera className="h-4 w-4 text-[#34C759]" />
        <span>Scan Kartu</span>
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
