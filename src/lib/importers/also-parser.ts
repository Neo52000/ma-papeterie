import { COLUMN_MAP } from '@/data/also-mappings';
import { normalizeHeader } from '@/lib/text-utils';

export interface ParsedAlsoData {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
  mappedHeaders: { original: string; mapped: string }[];
  unmappedHeaders: string[];
}

/**
 * Parse an ALSO price list file (ZIP containing TXT, or raw TXT/CSV).
 * Handles ZIP extraction, auto-detects the delimiter, and maps headers.
 */
export async function parseAlsoFile(file: File): Promise<ParsedAlsoData> {
  let text: string;

  if (file.name.toLowerCase().endsWith('.zip')) {
    text = await extractTextFromZip(file);
  } else {
    text = await file.text();
  }

  const rawData = parseTxt(text);

  if (rawData.length === 0) {
    throw new Error('Fichier vide ou format non reconnu');
  }

  return mapHeaders(rawData);
}

async function extractTextFromZip(file: File): Promise<string> {
  const { unzipSync } = await import('fflate');
  const buffer = new Uint8Array(await file.arrayBuffer());
  const unzipped = unzipSync(buffer);

  // Find the first .txt or .csv file in the archive
  const entries = Object.entries(unzipped);
  const txtEntry = entries.find(([name]) =>
    /\.(txt|csv|tsv)$/i.test(name)
  );

  if (!txtEntry) {
    // Fallback: use the first file
    if (entries.length === 0) {
      throw new Error('Archive ZIP vide');
    }
    const [, data] = entries[0];
    return decodeText(data);
  }

  return decodeText(txtEntry[1]);
}

/** Decode bytes to string, trying UTF-8 first then Latin-1 */
function decodeText(data: Uint8Array): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    // Remove BOM
    return text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
  } catch {
    // Fallback to Latin-1 (ISO-8859-1)
    return new TextDecoder('iso-8859-1').decode(data);
  }
}

/** Auto-detect delimiter from the first line */
function detectDelimiter(headerLine: string): string {
  const candidates = ['\t', ';', '|', ','];
  let bestDelim = '\t';
  let bestCount = 0;

  for (const delim of candidates) {
    const count = headerLine.split(delim).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

function parseTxt(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error('Fichier vide');
  }

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const vals = line.split(delimiter);
    const obj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      obj[h] = (vals[idx] || '').trim().replace(/^"|"$/g, '');
    });
    return obj;
  });
}

function mapHeaders(rawData: Record<string, string>[]): ParsedAlsoData {
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
        mappedHeaders.push({ original: rh, mapped: key });
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
      if (key) {
        mapped[key] = String(value || '').trim();
      }
    }
    return mapped;
  });

  const mappedHeaderKeys = [...new Set(Object.values(headerMap))];

  return {
    rows: mappedRows,
    headers: mappedHeaderKeys,
    totalRows: mappedRows.length,
    mappedHeaders,
    unmappedHeaders,
  };
}
