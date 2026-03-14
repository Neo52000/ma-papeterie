/**
 * Excel read/write helpers using ExcelJS (replaces vulnerable xlsx/SheetJS).
 * All imports are at top level — ExcelJS is tree-shakeable via Vite.
 */
import ExcelJS from 'exceljs';

/**
 * Read an Excel file (.xlsx/.xls) and return rows as array of objects.
 * Equivalent to: XLSX.read() + XLSX.utils.sheet_to_json()
 */
export async function readExcel(
  buffer: ArrayBuffer,
  options?: { sheetIndex?: number; header?: 'array' }
): Promise<Record<string, string>[] | (string | number | null)[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[options?.sheetIndex ?? 0];

  if (!worksheet || worksheet.rowCount === 0) return [];

  if (options?.header === 'array') {
    // Return raw array-of-arrays (like sheet_to_json with header: 1)
    const rows: (string | number | null)[][] = [];
    worksheet.eachRow((row) => {
      rows.push(
        row.values
          ? (row.values as (string | number | null | ExcelJS.CellValue)[])
              .slice(1) // ExcelJS row.values is 1-indexed (index 0 is empty)
              .map(v => (v === undefined || v === null) ? null : typeof v === 'object' ? String(v) : v as string | number)
          : []
      );
    });
    return rows;
  }

  // Return array of objects keyed by header row
  const headers: string[] = [];
  const firstRow = worksheet.getRow(1);
  firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text?.trim() || `Column${colNumber}`;
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      obj[h] = cell.text?.trim() ?? '';
    });
    rows.push(obj);
  });

  return rows;
}

/**
 * Write data to an Excel file and trigger browser download.
 * Equivalent to: XLSX.utils.json_to_sheet() + XLSX.writeFile()
 */
export async function writeExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    worksheet.addRow(['Aucune donnée']);
  } else {
    // Add headers
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    // Add data rows
    for (const row of data) {
      worksheet.addRow(headers.map(h => row[h] ?? ''));
    }

    // Auto-fit column widths (approximation)
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.text?.length ?? 0;
        if (len > maxLen) maxLen = Math.min(len, 50);
      });
      col.width = maxLen + 2;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
