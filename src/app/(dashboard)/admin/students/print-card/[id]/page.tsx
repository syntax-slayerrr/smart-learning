import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StaticQRCard } from "@/components/attendance/static-qr-card";
import { Printer, User, IdCard, Scan, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { SCHOOL_NAME } from "@/lib/constants";

export default async function PrintStudentCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(`
      id, nis,
      profiles ( full_name ),
      classes ( name )
    `)
    .eq("id", id)
    .single();

  if (!student) {
    return notFound();
  }

  // The QR code value will have a specific prefix so the teacher scanner knows it's an ID card.
  const qrValue = `STUDENT_CARD:${student.id}`;

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* Print Instructions / Non-printable area */}
      <div className="mb-8 print:hidden flex flex-col items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-border text-center max-w-md">
        <h1 className="font-bold text-lg">Cetak Kartu Absensi Khusus</h1>
        <p className="text-sm text-muted-foreground">
          Kartu ini dikhususkan bagi siswa yang tidak membawa/memiliki Smartphone.
          Gunakan tombol cetak di bawah, lalu potong sesuai garis putus-putus.
        </p>
        <button
          id="print-btn"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
          Print Sekarang
        </button>
        {/* We use a script tag to attach the onClick since this is a Server Component */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById('print-btn').addEventListener('click', function() {
                window.print();
              });
            `,
          }}
        />
      </div>

      {/* The Printable Card */}
      <div className="print:m-0 flex flex-col items-center justify-center">
        <div 
          className="card-item relative w-[86mm] h-[54mm] flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 print:border-dashed print:border-slate-400 print:rounded-none"
        >
          {/* Top Section (Left and Right Split) */}
          <div className="flex flex-1 w-full relative bg-slate-50">
            {/* Sisi Kiri (Terang) - 65% */}
            <div className="w-[63%] h-full relative p-3 flex flex-col z-10 bg-[#f4f6f9]">
              {/* Watermark Halus Dimiringkan & Bergeser Ekstrem */}
              <div className="absolute inset-0 z-0 flex items-end justify-end opacity-[0.06] pointer-events-none overflow-hidden">
                <Image src="/brand/syntax-slayer-logo.png" alt="Watermark" width={220} height={220} className="object-contain -rotate-[15deg] translate-x-[25%] translate-y-[30%]" />
              </div>

              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header Kiri */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Image src="/brand/syntax-slayer-logo.png" alt="Logo" width={22} height={22} className="object-contain rounded-md" />
                  <div className="flex flex-col">
                    <h2 className="text-[7.5px] font-bold text-slate-800 leading-tight">Smart Learning</h2>
                    <span className="text-[5.5px] font-bold tracking-wider text-orange-600 uppercase truncate max-w-[120px]">{SCHOOL_NAME}</span>
                  </div>
                </div>

                {/* Judul Kartu */}
                <h1 className="text-[12px] font-black text-[#1C1917] tracking-tight leading-none mb-1 mt-0.5">
                  KARTU ABSENSI<br/>DIGITAL
                </h1>
                <div className="w-8 h-[2px] bg-[#EA580C] mb-1.5 rounded-full"></div>
                <p className="text-[5.5px] text-slate-500 leading-snug w-11/12 mb-2">
                  Digunakan untuk validasi absensi harian siswa melalui sistem telemetri sekolah.
                </p>

                <div className="w-full border-t border-slate-200/80 mb-2 mt-auto"></div>

                {/* Info Siswa */}
                <div className="flex flex-col gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <User className="w-2.5 h-2.5 text-[#EA580C]" strokeWidth={2.5} />
                    <p className="text-[8px] font-bold text-slate-800 uppercase tracking-wide truncate">{(student.profiles as any)?.full_name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IdCard className="w-2.5 h-2.5 text-[#EA580C]" strokeWidth={2.5} />
                    <p className="text-[6.5px] font-mono font-medium text-slate-600">NIS: {student.nis}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan (Gelap) - 37% */}
            <div className="w-[37%] h-full bg-[#1C1917] relative z-10 flex flex-col items-center justify-center p-2.5 border-l border-stone-800">
              
              <div className="bg-white p-1 rounded-md shadow-inner flex items-center justify-center w-[23mm] h-[23mm] mb-1.5">
                <div className="transform scale-[0.6] origin-center -m-4">
                  <StaticQRCard value={qrValue} />
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Scan className="w-2.5 h-2.5 text-orange-400" />
                <p className="text-[4.5px] font-bold text-white tracking-widest mt-0.5">SCAN UNTUK ABSEN</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar (Solar Orange) */}
          <div className="w-full h-[6mm] bg-[#EA580C] flex items-center justify-center gap-1.5 z-20 shrink-0">
            <ShieldCheck className="w-3 h-3 text-white" strokeWidth={2.5} />
            <p className="text-[6px] font-bold text-white tracking-widest uppercase mt-0.5">WAJIB DIBAWA SETIAP HARI</p>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:m-0, .print\\:m-0 * {
            visibility: visible;
          }
          .print\\:m-0 {
            position: absolute;
            left: 0;
            top: 0;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
}
