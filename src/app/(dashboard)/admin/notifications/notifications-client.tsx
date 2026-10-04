"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Search,
  Eye,
  X,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Send,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface NotificationLog {
  id: string;
  message: string;
  status: string;
  error_message: string | null;
  created_at: string;
  parent_name: string;
  parent_phone: string;
  student_name: string;
}

export function NotificationsClient({ initialData }: { initialData: NotificationLog[] }) {
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return initialData.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (filterText) {
        const lowerFilter = filterText.toLowerCase();
        return (
          item.student_name.toLowerCase().includes(lowerFilter) ||
          item.parent_name.toLowerCase().includes(lowerFilter) ||
          item.parent_phone.includes(lowerFilter) ||
          item.message.toLowerCase().includes(lowerFilter)
        );
      }
      return true;
    });
  }, [initialData, filterText, statusFilter]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = initialData.length;
    const sent = initialData.filter((i) => i.status === "sent").length;
    const failed = initialData.filter((i) => i.status === "failed").length;
    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 100;
    return { total, sent, failed, deliveryRate };
  }, [initialData]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* 1. Operational Status Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pesan</p>
          <p className="text-2xl font-bold font-mono text-foreground mt-1 tabular-nums">{metrics.total}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">Seluruh transmisi WA</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Terkirim Berhasil</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{metrics.sent}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5 font-mono">{metrics.deliveryRate}% success rate</p>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Gagal / Error</p>
          <p className="text-2xl font-bold font-mono text-destructive mt-1 tabular-nums">{metrics.failed}</p>
          <p className="text-[11px] text-destructive/80 mt-0.5">Perlu tindak lanjut nomor</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-2xs">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Gateway Status</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold font-mono text-foreground">ONLINE (v2.4)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Direct WA Provider</p>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari siswa, nama orang tua, atau nomor WA..."
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full min-h-[44px] rounded-xl border border-border bg-card pl-10 pr-4 text-xs sm:text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Status Filter Segmented Buttons */}
        <div className="flex items-center rounded-xl bg-muted/80 p-1 border border-border shrink-0">
          {(
            [
              { value: "all", label: "Semua" },
              { value: "sent", label: "Terkirim" },
              { value: "failed", label: "Gagal" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold apple-press transition-colors min-h-[36px] cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Adaptive Layout: Mobile Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {paginatedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Tidak ada riwayat notifikasi yang cocok dengan filter.
          </div>
        ) : (
          paginatedItems.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{row.student_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wali: <span className="font-medium text-foreground">{row.parent_name}</span>
                  </p>
                </div>
                {row.status === "sent" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                    <CheckCircle2 className="h-3 w-3" /> Terkirim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive border border-destructive/20 font-mono">
                    <AlertTriangle className="h-3 w-3" /> Gagal
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/80">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>{row.parent_phone}</span>
                </div>
                <span>
                  {format(new Date(row.created_at), "dd MMM, HH:mm", { locale: id })}
                </span>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedLog(row)}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-semibold apple-press transition-colors cursor-pointer border border-border"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Lihat Isi Pesan WhatsApp</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Adaptive Layout: Desktop Dense Table (>= 768px) */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-mono">Waktu Kirim</th>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4">Wali Murid</th>
                <th className="py-3.5 px-4 font-mono">No. WhatsApp</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Tidak ada riwayat notifikasi yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {row.student_name}
                    </td>
                    <td className="py-3.5 px-4 text-foreground">
                      {row.parent_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground text-xs">
                      {row.parent_phone}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                          <CheckCircle2 className="h-3 w-3" /> Terkirim
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive border border-destructive/20 font-mono">
                            <AlertTriangle className="h-3 w-3" /> Gagal
                          </span>
                          {row.error_message && (
                            <span className="text-[10px] text-destructive max-w-[140px] truncate" title={row.error_message}>
                              {row.error_message}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 apple-press transition-colors cursor-pointer border border-primary/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            <span>
              Menampilkan {paginatedItems.length} dari {filteredItems.length} pesan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Message Detail BottomSheet Modal */}
      <BottomSheet
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Detail Pesan WhatsApp"
        description={
          selectedLog
            ? `Penerima: ${selectedLog.parent_name} (${selectedLog.parent_phone})`
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => setSelectedLog(null)}
            className="apple-press inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 min-h-[44px] cursor-pointer"
          >
            Tutup
          </button>
        }
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Siswa:</span>
                <span className="font-semibold text-foreground">{selectedLog.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Pengiriman:</span>
                <span className="font-mono text-foreground">
                  {format(new Date(selectedLog.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: id })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`font-semibold font-mono ${
                    selectedLog.status === "sent" ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {selectedLog.status === "sent" ? "BERHASIL TERKIRIM" : "GAGAL DIPROSES"}
                </span>
              </div>
              {selectedLog.error_message && (
                <div className="pt-1 border-t border-border text-destructive text-[11px]">
                  <strong>Error Log:</strong> {selectedLog.error_message}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Isi Konten Pesan
              </label>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed relative">
                {selectedLog.message}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
