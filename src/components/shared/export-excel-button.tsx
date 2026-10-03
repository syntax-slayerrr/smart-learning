"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportExcelButtonProps {
  data: any[];
  filename: string;
}

export function ExportExcelButton({ data, filename }: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    // Buat worksheet dari array of objects
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Otomatis mengatur lebar kolom berdasarkan isi data terpanjang
    const colWidths = Object.keys(data[0] || {}).map(key => {
      const maxContentLength = Math.max(
        key.length,
        ...data.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxContentLength + 2 }; // Tambah sedikit ruang (padding)
    });
    worksheet["!cols"] = colWidths;

    // Buat workbook dan tambahkan worksheet ke dalamnya
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

    // Unduh file (XLSX.writeFile otomatis mengatur tipe mime dan pengunduhan file)
    XLSX.writeFile(workbook, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      <Download className="mr-2 h-4 w-4" />
      Export Excel
    </button>
  );
}
