import { COLUMN_MAP } from '@/data/comlandi-mappings';
import { normalizeHeader } from '@/lib/text-utils';

export interface ParsedComlandiData {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
  mappedHeaders: { original: string; mapped: string }[];
  unmappedHeaders: string[];
}

/**
 * Parse a Comlandi CSV or Excel file into mapped rows.
 * CSV files use semicolon (;) as delimiter.
 */
export async function parseComlandiFile(file: File): Promise<ParsedComlandiData> {
  let rawData: Record<string, string>[];

  if (file.name.endsWith('.csv')) {
    rawData = parseCsv(await file.text());
  } else {
    const { readExcel } = await import('@/lib/excel');
    const buffer = await file.arrayBuffer();
    rawData = await readExcel(buffer) as Record<string, string>[];
  }

  if (rawData.length === 0) {
    throw new Error('Fichier vide ou format non reconnu');
  }

  return mapHeaders(rawData);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error('Fichier vide');
  }

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const rawHeaders = headerLine.split(';').map(h => h.trim());

  return lines.slice(1).map(line => {
    const vals = line.split(';');
    const obj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => { obj[h] = vals[idx]?.trim() || ''; });
    return obj;
  });
}

function mapHeaders(rawData: Record<string, string>[]): ParsedComlandiData {
  const rawHeaders = Object.keys(rawData[0]);
  const headerMap: Record<string, string> = {};
  const mappedHeaders: { original: string; mapped: string }[] = [];
  const unmappedHeaders: string[] = [];

  for (const rh of rawHeaders) {
    const normalized = normalizeHeader(rh);
    let found = false;
    for (const [pattern, key] of Object.entries(COLUMN_MAP)) {
      if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern))) {
        headerMap[rh] = key;
        if (!key.startsWith('_')) {
          mappedHeaders.push({ original: rh, mapped: key });
        }
        found = true;
        break;
      }
    }
    if (!found) {
      unmappedHeaders.push(rh);
    }
  }

  const mappedRows = rawData.map(row => {
    const mapped: Record<string, string> = {};
    for (const [origHeader, value] of Object.entries(row)) {
      const key = headerMap[origHeader];
      if (key && !key.startsWith('_')) {
        mapped[key] = String(value || '').trim();
      }
    }
    return mapped;
  });

  const mappedHeaderKeys = [...new Set(Object.values(headerMap).filter(k => !k.startsWith('_')))];

  return {
    rows: mappedRows,
    headers: mappedHeaderKeys,
    totalRows: mappedRows.length,
    mappedHeaders,
    unmappedHeaders,
  };
}
