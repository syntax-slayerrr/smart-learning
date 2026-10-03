"use client";

import { useState } from "react";
import { StaticQRCard } from "@/components/attendance/static-qr-card";
import { Printer, ArrowLeft, CheckSquare, Square, User, IdCard, Scan, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Student {
  id: string;
  nis: string;
  profiles: { full_name: string } | null;
}

interface ClassData {
  name: string;
  grade: string;
  academic_year: string;
}

export function PrintClassClient({
  classData,
  students,
}: {
  classData: ClassData;
  students: Student[];
}) {
  const [mode, setMode] = useState<"select" | "print">("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (mode === "print") {
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    
    // Chunk into arrays of 8 for landscape cards on A4/Letter (2 columns x 4 rows)
    const chunks = [];
    for (let i = 0; i < selectedStudents.length; i += 8) {
      chunks.push(selectedStudents.slice(i, i + 8));
    }

    return (
      <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white flex flex-col items-center">
        {/* Controls - Hidden in print */}
        <div className="mb-8 print:hidden flex flex-col items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-border text-center max-w-xl w-full">
          <div className="flex items-center w-full justify-between">
            <button 
              onClick={() => setMode("select")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali Edit
            </button>
            <h1 className="font-bold text-lg">Pratinjau Cetak</h1>
            <div className="w-24"></div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Akan mencetak <strong>{selectedStudents.length}</strong> kartu. 
            Terbagi menjadi <strong>{chunks.length}</strong> halaman kertas A4.
          </p>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            Print ke Printer
          </button>
        </div>

        {/* The Printable Area */}
        <div className="print-area w-full flex flex-col items-center gap-8 print:gap-0 print:block">
          {chunks.map((chunk, pageIndex) => (
            <div 
              key={pageIndex} 
              className="print-page bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-[5mm] w-full h-full p-[10mm] content-start">
                {chunk.map((student) => {
                  const qrValue = `STUDENT_CARD:${student.id}`;
                  return (
                    <div 
                      key={student.id}
                      className="card-item relative w-[86mm] h-[54mm] flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 print:border-dashed print:border-slate-400 print:rounded-none"
                    >
                      {/* Top Section (Left and Right Split) */}
                      <div className="flex flex-1 w-full relative bg-slate-50">
                        {/* Sisi Kiri (Terang) - 65% */}
                        <div className="w-[63%] h-full relative p-3 flex flex-col z-10 bg-[#f4f6f9]">
                          {/* Watermark Halus Dimiringkan & Bergeser Ekstrem */}
                          <div className="absolute inset-0 z-0 flex items-end justify-end opacity-[0.08] pointer-events-none overflow-hidden">
                            <Image src="/icon.png" alt="Watermark" width={250} height={250} className="object-contain -rotate-[15deg] translate-x-[30%] translate-y-[35%]" />
                          </div>

                          <div className="relative z-10 flex-1 flex flex-col">
                            {/* Header Kiri */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <Image src="/icon.png" alt="Logo" width={24} height={24} className="object-contain rounded-md" />
                              <div className="flex flex-col">
                                <h2 className="text-[7px] font-bold text-slate-800 leading-tight">Smart Learning Campus</h2>
                              </div>
                            </div>

                            {/* Judul Kartu */}
                            <h1 className="text-[12px] font-black text-[#1e293b] tracking-tight leading-none mb-1 mt-1">
                              KARTU ABSENSI<br/>DIGITAL
                            </h1>
                            <div className="w-8 h-[2px] bg-[#0055ff] mb-1.5 rounded-full"></div>
                            <p className="text-[5.5px] text-slate-500 leading-snug w-11/12 mb-2">
                              Digunakan untuk absensi harian siswa melalui sistem sekolah.
                            </p>

                            <div className="w-full border-t border-slate-200/80 mb-2 mt-auto"></div>

                            {/* Info Siswa */}
                            <div className="flex flex-col gap-1.5 mb-0.5">
                              <div className="flex items-center gap-2">
                                <User className="w-2.5 h-2.5 text-[#0055ff]" strokeWidth={2} fill="currentColor" />
                                <p className="text-[8px] font-bold text-slate-800 uppercase tracking-wide">{(student.profiles as any)?.full_name || "—"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <IdCard className="w-2.5 h-2.5 text-[#0055ff]" strokeWidth={2.5} />
                                <p className="text-[6.5px] font-medium text-slate-600">NIS: {student.nis}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sisi Kanan (Gelap) - 37% */}
                        <div className="w-[37%] h-full bg-[#111827] relative z-10 flex flex-col items-center justify-center p-2.5 border-l border-[#1e293b]">
                          
                          <div className="bg-white p-1 rounded-md shadow-inner flex items-center justify-center w-[23mm] h-[23mm] mb-1.5">
                            <div className="transform scale-[0.6] origin-center -m-4">
                              <StaticQRCard value={qrValue} />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Scan className="w-2.5 h-2.5 text-white" />
                            <p className="text-[4.5px] font-bold text-white tracking-widest mt-0.5">SCAN UNTUK ABSEN</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Bar (Biru Terang) */}
                      <div className="w-full h-[6mm] bg-[#0055ff] flex items-center justify-center gap-1.5 z-20 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-white" strokeWidth={2.5} />
                        <p className="text-[6px] font-bold text-white tracking-widest uppercase mt-0.5">WAJIB DIBAWA SETIAP HARI</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .print-page {
            width: 210mm;
            min-height: 297mm;
          }
          .card-item {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0; /* No browser margins, we use padding in CSS */
            }
            body {
              background-color: white;
            }
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }
            .print-page {
              margin: 0 !important;
              box-shadow: none !important;
              page-break-after: always; /* Force page break */
            }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-border max-w-3xl w-full">
        <div className="flex items-center w-full justify-between mb-6">
          <Link href="/admin/classes" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <h1 className="font-bold text-lg">Pilih Siswa: Kelas {classData.name}</h1>
          <div className="w-20"></div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={toggleAll}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
          >
            {selectedIds.length === students.length && students.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selectedIds.length === students.length && students.length > 0 ? "Batal Pilih Semua" : "Pilih Semua"}
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            {selectedIds.length} dari {students.length} terpilih
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-12">Pilih</th>
                <th className="px-4 py-3 text-left">Nama Siswa</th>
                <th className="px-4 py-3 text-left">NIS</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Belum ada siswa di kelas ini.</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggleStudent(student.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="w-4 h-4 rounded border border-primary flex items-center justify-center">
                        {selectedIds.includes(student.id) && <div className="w-2.5 h-2.5 bg-primary rounded-[2px]" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{(student.profiles as any)?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.nis}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            disabled={selectedIds.length === 0}
            onClick={() => setMode("print")}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Lanjut Cetak ({selectedIds.length} Siswa)
          </button>
        </div>
      </div>
    </div>
  );
}
