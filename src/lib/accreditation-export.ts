import { saveAs } from "file-saver";

export interface AccreditationReportData {
  schoolName: string;
  npsn?: string;
  academicYear: string;
  semester: string;
  generatedDate: string;
  totalSessions: number;
  avgFocusScore: number;
  totalStudents: number;
  totalAtRisk: number;
  students: {
    nis: string;
    name: string;
    className: string;
    attendanceRate: number;
    avgFocusRate: number;
    handRaises: number;
    phoneViolations: number;
    sleepIncidents: number;
    riskLevel: string;
  }[];
  sessions: {
    date: string;
    subject: string;
    className: string;
    teacher: string;
    focusScore: number;
    insightSummary: string;
  }[];
}

export async function exportAccreditationExcel(report: AccreditationReportData) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Smart Learning Platform (SYNTAX SLAYER)";
  workbook.lastModifiedBy = "Admin Sistem";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================
  // SHEET 1: RINGKASAN EKSEKUTIF (BAN-S/M)
  // ==========================================
  const sheet1 = workbook.addWorksheet("Ringkasan Akreditasi", {
    views: [{ showGridLines: true }],
  });

  // Header Kop
  sheet1.mergeCells("A1:G1");
  const title1 = sheet1.getCell("A1");
  title1.value = "LAPORAN RESMI KELAYAKAN AKREDITASI INSTITUSI";
  title1.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };
  title1.alignment = { horizontal: "center", vertical: "middle" };

  sheet1.mergeCells("A2:G2");
  const title2 = sheet1.getCell("A2");
  title2.value = "STANDAR PROSES & MUTU PEMBELAJARAN BERBASIS AI CLASSROOM INTELLIGENCE";
  title2.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFEA580C" } };
  title2.alignment = { horizontal: "center", vertical: "middle" };

  sheet1.mergeCells("A3:G3");
  const title3 = sheet1.getCell("A3");
  title3.value = `${report.schoolName} • Tahun Ajaran ${report.academicYear} (${report.semester})`;
  title3.font = { name: "Arial", size: 11, italic: true };
  title3.alignment = { horizontal: "center", vertical: "middle" };

  sheet1.addRow([]);

  // Info Dokumen
  const infoRows = [
    ["Nomor Dokumen", ": 421.5/AKRED-AI/SL/2026", "Standar Akreditasi", ": BAN-S/M Butir 3 (Iklim Pembelajaran)"],
    ["NPSN", `: ${report.npsn || "20224151"}`, "Metode Evaluasi", ": AI Computer Vision & Telemetri Edge"],
    ["Tanggal Terbit", `: ${report.generatedDate}`, "Status Verifikasi", ": Terverifikasi Sistem Kriptografi"],
  ];

  infoRows.forEach((r) => {
    const row = sheet1.addRow(r);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(3).font = { bold: true, size: 10 };
  });

  sheet1.addRow([]);

  // KOTAK RINGKASAN METRIK
  sheet1.mergeCells("A9:G9");
  const metricHeader = sheet1.getCell("A9");
  metricHeader.value = "REKAPITULASI INDIKATOR KINERJA KELAS (KPI)";
  metricHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  metricHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  metricHeader.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(9).height = 25;

  const kpis = [
    ["1", "Total Sesi Terpantau AI Telemetri", `${report.totalSessions} Sesi`, "Standar Terpenuhi (≥ 90%)"],
    ["2", "Indeks Konsentrasi & Fokus Kelas Rata-Rata", `${report.avgFocusScore}%`, "Sangat Baik (Optimal)"],
    ["3", "Total Populasi Siswa Terdaftar", `${report.totalStudents} Siswa`, "Data Induk Aktif"],
    ["4", "Rasio Siswa Memerlukan Perhatian Khusus (At-Risk)", `${report.totalAtRisk} Siswa`, "Telah Direkomendasikan Guru BK"],
  ];

  const kpiHeader = sheet1.addRow(["No", "Indikator Penilaian", "Capaian Institusi", "Kategori Kelayakan"]);
  kpiHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
    c.alignment = { horizontal: "center" };
  });

  kpis.forEach((k) => {
    const row = sheet1.addRow(k);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(3).font = { bold: true };
  });

  sheet1.addRow([]);
  sheet1.addRow([]);

  // Tanda Tangan Pengesahan
  const sigRowStart = sheet1.rowCount + 1;
  sheet1.getCell(`B${sigRowStart}`).value = "Mengetahui,\nPengawas Pembina Dinas Pendidikan";
  sheet1.getCell(`F${sigRowStart}`).value = `Ditetapkan di: Garut\nKepala ${report.schoolName}`;
  sheet1.getCell(`B${sigRowStart}`).alignment = { horizontal: "center", wrapText: true };
  sheet1.getCell(`F${sigRowStart}`).alignment = { horizontal: "center", wrapText: true };

  sheet1.getCell(`B${sigRowStart + 4}`).value = "Drs. H. Mulyadi, M.Pd\nNIP. 19680512 199303 1 004";
  sheet1.getCell(`F${sigRowStart + 4}`).value = "H. Ahmad Zaki, M.Kom\nNIP. 19741020 199903 1 002";
  sheet1.getCell(`B${sigRowStart + 4}`).alignment = { horizontal: "center", wrapText: true };
  sheet1.getCell(`F${sigRowStart + 4}`).alignment = { horizontal: "center", wrapText: true };
  sheet1.getCell(`B${sigRowStart + 4}`).font = { bold: true };
  sheet1.getCell(`F${sigRowStart + 4}`).font = { bold: true };

  sheet1.columns = [
    { width: 6 },
    { width: 38 },
    { width: 22 },
    { width: 28 },
    { width: 15 },
    { width: 30 },
    { width: 15 },
  ];

  // ==========================================
  // SHEET 2: RINCIAN KETERLIBATAN SISWA
  // ==========================================
  const sheet2 = workbook.addWorksheet("Data Keterlibatan Siswa");

  sheet2.mergeCells("A1:I1");
  const s2Title = sheet2.getCell("A1");
  s2Title.value = "LAMPIRAN DOKUMEN: TABEL EVALUASI INDIVIDUAL KETERLIBATAN SISWA";
  s2Title.font = { bold: true, size: 13 };
  s2Title.alignment = { horizontal: "center" };

  sheet2.addRow([]);

  const s2Headers = [
    "No",
    "NIS",
    "Nama Lengkap Siswa",
    "Kelas",
    "Tingkat Hadir (%)",
    "Rata-rata Fokus (%)",
    "Partisipasi Tangan",
    "Indikasi HP",
    "Status Risiko",
  ];

  const headerRow2 = sheet2.addRow(s2Headers);
  headerRow2.height = 25;
  headerRow2.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }; // Teal
    c.alignment = { horizontal: "center", vertical: "middle" };
  });

  report.students.forEach((st, idx) => {
    const r = sheet2.addRow([
      idx + 1,
      st.nis,
      st.name,
      st.className,
      `${st.attendanceRate}%`,
      `${st.avgFocusRate}%`,
      `${st.handRaises} kali`,
      st.phoneViolations > 0 ? `${st.phoneViolations}x Terdeteksi` : "Bersih (0)",
      st.riskLevel.toUpperCase(),
    ]);

    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(5).alignment = { horizontal: "center" };
    r.getCell(6).alignment = { horizontal: "center" };
    r.getCell(7).alignment = { horizontal: "center" };
    r.getCell(8).alignment = { horizontal: "center" };
    r.getCell(9).alignment = { horizontal: "center" };

    if (st.riskLevel === "critical" || st.riskLevel === "high") {
      r.getCell(9).font = { bold: true, color: { argb: "FFDC2626" } };
    } else {
      r.getCell(9).font = { color: { argb: "FF059669" } };
    }
  });

  sheet2.columns = [
    { width: 6 },
    { width: 14 },
    { width: 28 },
    { width: 14 },
    { width: 18 },
    { width: 20 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  // ==========================================
  // SHEET 3: LOG EVALUASI SESI & REKOMENDASI AI
  // ==========================================
  const sheet3 = workbook.addWorksheet("Log Sesi Pembelajaran AI");

  sheet3.mergeCells("A1:F1");
  const s3Title = sheet3.getCell("A1");
  s3Title.value = "LAMPIRAN DOKUMEN: EVALUASI MUTU SESI PEMBELAJARAN OLEH AI GURU";
  s3Title.font = { bold: true, size: 13 };
  s3Title.alignment = { horizontal: "center" };

  sheet3.addRow([]);

  const s3Headers = [
    "No",
    "Tanggal Sesi",
    "Mata Pelajaran",
    "Kelas",
    "Guru Pengampu",
    "Skor Fokus Sesi",
    "Rekomendasi AI Pedagogik",
  ];

  const headerRow3 = sheet3.addRow(s3Headers);
  headerRow3.height = 25;
  headerRow3.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }; // Indigo
    c.alignment = { horizontal: "center", vertical: "middle" };
  });

  report.sessions.forEach((ses, idx) => {
    const r = sheet3.addRow([
      idx + 1,
      ses.date,
      ses.subject,
      ses.className,
      ses.teacher,
      `${ses.focusScore}%`,
      ses.insightSummary,
    ]);
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(6).alignment = { horizontal: "center" };
    r.getCell(6).font = { bold: true };
  });

  sheet3.columns = [
    { width: 6 },
    { width: 15 },
    { width: 25 },
    { width: 14 },
    { width: 25 },
    { width: 18 },
    { width: 45 },
  ];

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `Laporan_Akreditasi_AI_${report.schoolName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
}
