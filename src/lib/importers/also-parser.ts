import { ALSO_COLUMNS, type AlsoPricelistRow } from '@/data/also-mappings';

export interface ParsedAlsoData {
  rows: AlsoPricelistRow[];
  headers: string[];
  totalRows: number;
  mappedHeaders: { original: string; mapped: string }[];
  unmappedHeaders: string[];
}

/**
 * Parse an ALSO price list file.
 * Format: semicolon-delimited, 16 positional columns, NO header row.
 * Accepts ZIP (containing TXT) or raw TXT/CSV.
 */
export async function parseAlsoFile(file: File): Promise<ParsedAlsoData> {
  let text: string;

  if (file.name.toLowerCase().endsWith('.zip')) {
    text = await extractTextFromZip(file);
  } else {
    text = await file.text();
  }

  const rows = parseTxt(text);

  if (rows.length === 0) {
    throw new Error('Fichier vide ou format non reconnu');
  }

  return {
    rows,
    headers: [...ALSO_COLUMNS],
    totalRows: rows.length,
    mappedHeaders: ALSO_COLUMNS.map((col, i) => ({ original: `col_${i}`, mapped: col })),
    unmappedHeaders: [],
  };
}

async function extractTextFromZip(file: File): Promise<string> {
  const { unzipSync } = await import('fflate');
  const buffer = new Uint8Array(await file.arrayBuffer());
  const unzipped = unzipSync(buffer);

  const entries = Object.entries(unzipped);
  const txtEntry = entries.find(([name]) => /\.(txt|csv|tsv)$/i.test(name));
  const [, data] = txtEntry || entries[0] || [];

  if (!data) {
    throw new Error('Archive ZIP vide');
  }

  return decodeText(data);
}

/** Decode bytes to string, trying UTF-8 first then Latin-1 */
function decodeText(data: Uint8Array): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    return text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
  } catch {
    return new TextDecoder('iso-8859-1').decode(data);
  }
}

function parseTxt(text: string): AlsoPricelistRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) {
    throw new Error('Fichier vide');
  }

  return lines.map(line => {
    const vals = line.split(';');
    const row = {} as AlsoPricelistRow;
    ALSO_COLUMNS.forEach((col, i) => {
      row[col] = (vals[i] || '').trim();
    });
    return row;
  });
}
