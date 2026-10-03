"use client";

import { useState, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendDailyAttendanceSummaryWA, sendWhatsAppDirect } from "./actions";

export function DailyRecapTrigger() {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Mencegah user menutup tab atau me-refresh halaman saat proses pengiriman berlangsung
  useEffect(() => {
    if (!isSending) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Proses pengiriman WhatsApp sedang berjalan. Jika Anda keluar, pengiriman akan terhenti! Yakin ingin keluar?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSending]);

  async function handleSendRekap() {
    const confirm = window.confirm(
      "Apakah Anda yakin ingin mengirim Rekap Harian Absensi via WhatsApp ke seluruh orang tua sekarang?\n\nPesan ini akan dikirim secara bergiliran. HARAP JANGAN MENUTUP ATAU BERPINDAH MENU selama proses pengiriman berlangsung agar tidak terputus."
    );

    if (!confirm) return;

    setIsSending(true);
    setProgress({ current: 0, total: 0 });
    toast.loading("Mengambil data rekap harian...", { id: "rekap-wa" });

    try {
      const res = await sendDailyAttendanceSummaryWA();
      
      if (res.error) {
        toast.error(res.error, { id: "rekap-wa" });
        return;
      }
      
      if (!res.targets || res.targets.length === 0) {
        toast.success(res.message || "Tidak ada data.", { id: "rekap-wa" });
        return;
      }

      const targets = res.targets;
      setProgress({ current: 0, total: targets.length });
      
      let successCount = 0;
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        setProgress({ current: i + 1, total: targets.length });
        toast.loading(`Mengirim ${i + 1} dari ${targets.length} pesan WA...`, { id: "rekap-wa" });
        
        const sendRes = await sendWhatsAppDirect(target);
        if (sendRes.success) successCount++;
        // Jeda waktu SANGAT AMAN (10 - 18 detik) agar WhatsApp tidak memutus sesi (Soft-Ban)
        await new Promise(r => setTimeout(r, 10000 + Math.random() * 8000));
      }

      toast.success(`Berhasil mengirim ${successCount} dari ${targets.length} pesan WA.`, { id: "rekap-wa" });

    } catch (err: any) {
      toast.error("Terjadi kesalahan sistem saat memproses rekap.", { id: "rekap-wa" });
    } finally {
      setIsSending(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        onClick={handleSendRekap}
        disabled={isSending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {isSending && progress.total > 0 
          ? `Memproses (${progress.current}/${progress.total})` 
          : "Kirim / Lanjutkan Rekap WA"}
      </button>
      
      {isSending && (
        <p className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200 animate-pulse w-full max-w-sm">
          ⚠️ HARAP JANGAN KELUAR, MENUTUP TAB, ATAU MEMBUKA MENU LAIN SELAMA PROSES PENGIRIMAN BERLANGSUNG.
        </p>
      )}
    </div>
  );
}
