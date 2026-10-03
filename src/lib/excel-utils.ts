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
  period?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  filename: string;
  withPrintFooter?: boolean;
}

export const exportProfessionalExcel = async ({
  title,
  subtitle = "SMK Muhammadiyah Tarogong Kidul Plus Pesantren",
  period = `Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`,
  columns,
  data,
  filename,
  withPrintFooter = false
}: ExportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan');

  // --- 1. TITLE BLOCK ---
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:G2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Arial', size: 12, bold: false };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A3:G3');
  const periodCell = worksheet.getCell('A3');
  periodCell.value = period;
  periodCell.font = { name: 'Arial', size: 11, italic: true };
  periodCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add empty row for spacing
  worksheet.addRow([]);

  // --- 2. HEADER ROW ---
  const headerRowObj: Record<string, string> = { no: "No" };
  columns.forEach(col => {
    headerRowObj[col.key] = col.header;
  });
  
  const headerRow = worksheet.addRow(Object.values(headerRowObj));
  headerRow.height = 30;
  
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F855A' } // Emerald 700
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' }
    };
  });

  // --- 3. DATA ROWS ---
  data.forEach((row, index) => {
    const rowValues = [index + 1]; // "No" column
    columns.forEach(col => {
      rowValues.push(row[col.key] || "-");
    });

    const dataRow = worksheet.addRow(rowValues);
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // --- 4. FOOTER (LEGEND & SIGNATURE) ---
  if (withPrintFooter) {
    worksheet.addRow([]);
    worksheet.addRow([]);
    
    // Add Legend and Signature in the same row
    const footerRow = worksheet.addRow(["", "Keterangan:", "", "", "", "", "Mengetahui,"]);
    footerRow.font = { name: 'Arial', size: 11, bold: true };
    
    const legendRow1 = worksheet.addRow(["", "H: Hadir, T: Terlambat, S: Sakit, I: Izin, A: Alpa", "", "", "", "", "Kepala Sekolah"]);
    legendRow1.font = { name: 'Arial', size: 11 };
    
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    
    const signatureRow = worksheet.addRow(["", "", "", "", "", "", "( ________________________ )"]);
    signatureRow.font = { name: 'Arial', size: 11, bold: true };
  }

  // --- 5. COLUMN WIDTHS ---
  // +1 because of the 'No' column
  worksheet.getColumn(1).width = 5; 
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 2).width = col.width;
  });

  // --- 5. GENERATE FILE ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};
