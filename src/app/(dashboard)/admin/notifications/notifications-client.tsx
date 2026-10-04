"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Search, Eye, X } from "lucide-react";
import DataTable from "react-data-table-component";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return initialData.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      
      // Text filter
      if (filterText) {
        const lowerFilter = filterText.toLowerCase();
        return (
          item.student_name.toLowerCase().includes(lowerFilter) ||
          item.parent_name.toLowerCase().includes(lowerFilter) ||
          item.parent_phone.includes(lowerFilter)
        );
      }
      return true;
    });
  }, [initialData, filterText, statusFilter]);

  const columns = [
    {
      name: "Tanggal & Waktu",
      selector: (row: NotificationLog) => row.created_at,
      format: (row: NotificationLog) => format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: id }),
      sortable: true,
      wrap: true,
      width: "180px"
    },
    {
      name: "Siswa",
      selector: (row: NotificationLog) => row.student_name,
      sortable: true,
      wrap: true,
    },
    {
      name: "Orang Tua / No. WA",
      cell: (row: NotificationLog) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{row.parent_name}</span>
          <span className="text-muted-foreground text-xs">{row.parent_phone}</span>
        </div>
      ),
      sortable: true,
    },
    {
      name: "Pesan",
      cell: (row: NotificationLog) => (
        <button 
          onClick={() => setSelectedMessage(row.message)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Eye className="h-3 w-3" /> Lihat Pesan
        </button>
      ),
    },
    {
      name: "Status",
      selector: (row: NotificationLog) => row.status,
      sortable: true,
      cell: (row: NotificationLog) => {
        if (row.status === "sent") {
          return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Terkirim</span>;
        }
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Gagal</span>
            {row.error_message && (
              <span className="text-[10px] text-red-600 max-w-[120px] truncate" title={row.error_message}>
                {row.error_message}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari siswa atau no WA..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">Semua Status</option>
            <option value="sent">Terkirim</option>
            <option value="failed">Gagal</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination
          responsive
          highlightOnHover
          noDataComponent={
            <div className="p-8 text-center text-sm text-muted-foreground">
              Tidak ada data log notifikasi
            </div>
          }
          customStyles={{
            headRow: { style: { backgroundColor: 'var(--background)' } },
            rows: { style: { minHeight: '60px' } }
          }}
        />
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Isi Pesan WhatsApp</h3>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1 hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-sm text-green-900 whitespace-pre-wrap font-mono relative">
              {/* Fake WA Chat Bubble Tail */}
              <div className="absolute -left-2 top-0 w-4 h-4 bg-green-50 transform rotate-45 border-l border-t border-green-100"></div>
              {selectedMessage}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
