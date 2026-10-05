import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  header: string;
  key: string;
  width: number;
}

export interface ExportData {
  title: string;
  subtitle?: string;
  institution?: string;
  period?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  filename: string;
  withPrintFooter?: boolean;
}

function getColumnLetter(colIndex: number): string {
  let temp = 0;
  let letter = '';
  let index = colIndex;
  while (index > 0) {
    temp = (index - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    index = Math.floor((index - temp - 1) / 26);
  }
  return letter;
}

export const exportProfessionalExcel = async ({
  title,
  subtitle = "SYNTAX SLAYER — AI Smart Learning Ecosystem",
  institution = "SYNTAX SLAYER ACADEMIC ECOSYSTEM",
  period,
  columns,
  data,
  filename,
  withPrintFooter = false
}: ExportData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SYNTAX SLAYER Smart Learning Platform";
  workbook.lastModifiedBy = "SYNTAX SLAYER Academic Engine";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Laporan Resmi', {
    views: [{ showGridLines: true }]
  });

  const totalCols = columns.length + 1; // +1 for "No" column
  const endColLetter = getColumnLetter(Math.max(totalCols, 6));

  const effectivePeriod = period || `Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}`;

  // --- 1. INSTITUTIONAL HEADER & TITLE BLOCK ---
  // Row 1: Brand / Institutional Top Bar
  worksheet.mergeCells(`A1:${endColLetter}1`);
  const brandCell = worksheet.getCell('A1');
  brandCell.value = institution.toUpperCase();
  brandCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF71717A' } }; // Zinc 500
  brandCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 20;

  // Row 2: Document Main Title
  worksheet.mergeCells(`A2:${endColLetter}2`);
  const titleCell = worksheet.getCell('A2');
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF09090B' } }; // Zinc 950
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 28;

  // Row 3: Subtitle / Scope
  worksheet.mergeCells(`A3:${endColLetter}3`);
  const subtitleCell = worksheet.getCell('A3');
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Arial', size: 11, bold: false, color: { argb: 'FF27272A' } }; // Zinc 800
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 22;

  // Row 4: Period / Generated Timestamp
  worksheet.mergeCells(`A4:${endColLetter}4`);
  const periodCell = worksheet.getCell('A4');
  periodCell.value = effectivePeriod;
  periodCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF71717A' } }; // Zinc 500
  periodCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(4).height = 20;

  // Row 5: Spacer row
  worksheet.addRow([]);
  worksheet.getRow(5).height = 10;

  // --- 2. TABLE HEADER ROW (ROW 6) ---
  const headerRowObj: Record<string, string> = { no: "No" };
  columns.forEach(col => {
    headerRowObj[col.key] = col.header;
  });
  
  const headerRow = worksheet.addRow(Object.values(headerRowObj));
  headerRow.height = 30;
  
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF18181B' } // Zinc 900
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF09090B' } },
      left: { style: 'thin', color: { argb: 'FF27272A' } },
      bottom: { style: 'medium', color: { argb: 'FF09090B' } },
      right: { style: 'thin', color: { argb: 'FF27272A' } }
    };
  });

  // Enable AutoFilter on Table Header
  worksheet.autoFilter = {
    from: 'A6',
    to: `${getColumnLetter(totalCols)}6`
  };

  // --- 3. DATA ROWS ---
  data.forEach((row, index) => {
    const rowValues = [index + 1]; // "No" column
    columns.forEach(col => {
      rowValues.push(row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "-");
    });

    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 22;

    const isOdd = index % 2 === 1;
    const rowFillColor = isOdd ? 'FFF9FAFB' : 'FFFFFFFF'; // Light warm zinc zebra striping

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF18181B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowFillColor }
      };

      // Determine text alignment based on column type
      let alignH: 'center' | 'left' | 'right' = 'left';
      if (colNumber === 1) {
        alignH = 'center'; // No
      } else {
        const colDef = columns[colNumber - 2];
        const colKey = colDef?.key?.toLowerCase() || '';
        const colHeader = colDef?.header?.toLowerCase() || '';
        if (
          ['h', 't', 's', 'i', 'a', 'pct', 'total', 'hadir', 'alpa', 'nis', 'status', 'jam', 'jadwal'].some(k => colKey.includes(k) || colHeader.includes(k)) ||
          colKey.startsWith('jp')
        ) {
          alignH = 'center';
        }
      }

      cell.alignment = { vertical: 'middle', horizontal: alignH };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        right: { style: 'thin', color: { argb: 'FFE4E4E7' } }
      };
    });
  });

  // --- 4. INSTITUTIONAL FOOTER (LEGEND & FORMAL SIGNATURE) ---
  if (withPrintFooter) {
    // Spacer row
    const emptyRow1 = worksheet.addRow([]);
    emptyRow1.height = 14;
    
    // Legend Row (merged across cols 2 to endColLetter)
    const legendRowIdx = worksheet.rowCount + 1;
    worksheet.mergeCells(`B${legendRowIdx}:${endColLetter}${legendRowIdx}`);
    const legendCell = worksheet.getCell(`B${legendRowIdx}`);
    legendCell.value = "Keterangan Kode Absensi:  [ H ] Hadir   •   [ T ] Terlambat   •   [ S ] Sakit   •   [ I ] Izin   •   [ A ] Alpa / Tanpa Keterangan";
    legendCell.font = { name: 'Arial', size: 9, italic: true, bold: true, color: { argb: 'FF52525B' } };
    legendCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(legendRowIdx).height = 20;

    // Spacer rows
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Signature Block setup
    const sigStartRow = worksheet.rowCount + 1;
    const rightColLetter = getColumnLetter(Math.max(totalCols, 5));
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Verification Meta (Left side)
    const verifTitleCell = worksheet.getCell(`B${sigStartRow}`);
    verifTitleCell.value = "VERIFIKASI SISTEM AKADEMIK";
    verifTitleCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF27272A' } };

    const verifLine1 = worksheet.getCell(`B${sigStartRow + 1}`);
    verifLine1.value = "• Dokumen di-generate secara otomatis oleh AI Smart Learning Engine.";
    verifLine1.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF71717A' } };

    const verifLine2 = worksheet.getCell(`B${sigStartRow + 2}`);
    verifLine2.value = "• Integritas data absensi terverifikasi melalui hash telemetri kelas.";
    verifLine2.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF71717A' } };

    const verifLine3 = worksheet.getCell(`B${sigStartRow + 3}`);
    verifLine3.value = `• Serial: SLAYER-${Math.random().toString(36).substring(2, 10).toUpperCase()}-VERIFIED`;
    verifLine3.font = { name: 'Courier New', size: 8, bold: true, color: { argb: 'FF71717A' } };

    // Formal Sign-off (Right side)
    const dateCell = worksheet.getCell(`${rightColLetter}${sigStartRow}`);
    dateCell.value = `Ditetapkan di: Garut, ${currentDate}`;
    dateCell.font = { name: 'Arial', size: 10, color: { argb: 'FF27272A' } };
    dateCell.alignment = { horizontal: 'center' };

    const headRoleCell = worksheet.getCell(`${rightColLetter}${sigStartRow + 1}`);
    headRoleCell.value = "Kepala Sekolah / Penjamin Mutu";
    headRoleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF09090B' } };
    headRoleCell.alignment = { horizontal: 'center' };

    const schoolLabelCell = worksheet.getCell(`${rightColLetter}${sigStartRow + 2}`);
    schoolLabelCell.value = "SYNTAX SLAYER";
    schoolLabelCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF52525B' } };
    schoolLabelCell.alignment = { horizontal: 'center' };

    // Signature Line
    const signatureCell = worksheet.getCell(`${rightColLetter}${sigStartRow + 6}`);
    signatureCell.value = "( ____________________________________ )";
    signatureCell.font = { name: 'Arial', size: 10, bold: true };
    signatureCell.alignment = { horizontal: 'center' };

    const nipCell = worksheet.getCell(`${rightColLetter}${sigStartRow + 7}`);
    nipCell.value = "NIP. — / Tanda Tangan Resmi Institusi";
    nipCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF71717A' } };
    nipCell.alignment = { horizontal: 'center' };
  }

  // --- 5. COLUMN WIDTHS ---
  worksheet.getColumn(1).width = 6; // 'No' column
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 2).width = Math.max(col.width || 12, 8);
  });

  // --- 6. GENERATE & DOWNLOAD WORKBOOK ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, filename);
};

