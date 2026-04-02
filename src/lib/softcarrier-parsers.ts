/**
 * Client-side parsers for Soft Carrier file formats.
 * Each parser returns a standardised ParsedData object enabling preview before import.
 */

// ── CP850 → Unicode mapping ─────────────────────────────────────────────────

const CP850_MAP: Record<number, string> = {
  128:'Ç',129:'ü',130:'é',131:'â',132:'ä',133:'à',134:'å',135:'ç',
  136:'ê',137:'ë',138:'è',139:'ï',140:'î',141:'ì',142:'Ä',143:'Å',
  144:'É',145:'æ',146:'Æ',147:'ô',148:'ö',149:'ò',150:'û',151:'ù',
  152:'ÿ',153:'Ö',154:'Ü',155:'ø',156:'£',157:'Ø',158:'×',159:'ƒ',
  160:'á',161:'í',162:'ó',163:'ú',164:'ñ',165:'Ñ',166:'ª',167:'º',
  168:'¿',169:'®',170:'¬',171:'½',172:'¼',173:'¡',174:'«',175:'»',
  176:'░',177:'▒',178:'▓',179:'│',180:'┤',181:'Á',182:'Â',183:'À',
  184:'©',185:'╣',186:'║',187:'╗',188:'╝',189:'¢',190:'¥',191:'┐',
  192:'└',193:'┴',194:'┬',195:'├',196:'─',197:'┼',198:'ã',199:'Ã',
  200:'╚',201:'╔',202:'╩',203:'╦',204:'╠',205:'═',206:'╬',207:'¤',
  208:'ð',209:'Ð',210:'Ê',211:'Ë',212:'È',213:'ı',214:'Í',215:'Î',
  216:'Ï',217:'┘',218:'┌',219:'█',220:'▄',221:'¦',222:'Ì',223:'▀',
  224:'Ó',225:'ß',226:'Ô',227:'Ò',228:'õ',229:'Õ',230:'µ',231:'þ',
  232:'Þ',233:'Ú',234:'Û',235:'Ù',236:'ý',237:'Ý',238:'¯',239:'´',
  240:'­',241:'±',242:'‗',243:'¾',244:'¶',245:'§',246:'÷',247:'¸',
  248:'°',249:'¨',250:'·',251:'¹',252:'³',253:'²',254:'■',255:' ',
};

export function decodeCP850(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    result += b < 128 ? String.fromCharCode(b) : (CP850_MAP[b] ?? String.fromCharCode(b));
  }
  return result;
}

// ── Shared types ────────────────────────────────────────────────────────────

export type SoftCarrierSource = 'preislis' | 'artx' | 'tarifsb2b' | 'herstinfo' | 'lagerbestand';

export interface ParsedData {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter(l => l.trim());
}

function normalizeEan(val?: string): string {
  if (!val) return '';
  const cleaned = val.trim().replace(/[^0-9]/g, '');
  if (cleaned.length < 8 || cleaned.length > 14) return '';
  return cleaned;
}

// ── HERSTINFO.TXT — Brands/manufacturers (TSV CP850) ───────────────────────

export function parseHerstinfo(buffer: ArrayBuffer): ParsedData {
  const text = decodeCP850(buffer);
  const lines = splitLines(text);
  const headers = ['name', 'company', 'country', 'website'];
  const rows: Record<string, string>[] = [];

  for (const line of lines) {
    const cols = line.split('\t');
    const name = cols[0]?.trim();
    if (!name) continue;
    rows.push({
      name,
      company: cols[1]?.trim() || '',
      country: cols[4]?.trim() || '',
      website: cols[7]?.trim() || '',
    });
  }

  return { rows, headers, totalRows: rows.length };
}

// ── PREISLIS.TXT — Main product catalog (TSV CP850) ────────────────────────

export const PREISLIS_PREVIEW_COLS = ['ref', 'name', 'brand', 'ean', 'price_ht', 'stock_qty', 'category'];

export function parsePreislis(buffer: ArrayBuffer): ParsedData {
  const text = decodeCP850(buffer);
  const lines = splitLines(text);
  const headers = [
    'category', 'subcategory', 'ref', 'name', 'desc1', 'desc2', 'desc3', 'desc4', 'desc5',
    'price_ht', 'vat_code', 'stock_qty', 'min_qty', 'weight_kg',
    'brand', 'oem_ref', 'ean', 'is_end_of_life', 'is_special_order', 'country_origin',
    // Price tiers: qty1, price1, qty2, price2, ... qty6, price6
    'tier1_qty', 'tier1_price', 'tier2_qty', 'tier2_price', 'tier3_qty', 'tier3_price',
    'tier4_qty', 'tier4_price', 'tier5_qty', 'tier5_price', 'tier6_qty', 'tier6_price',
  ];
  const rows: Record<string, string>[] = [];

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 30) continue;

    const ref = cols[2]?.trim() || '';
    if (ref.length < 3) continue;

    const descParts = [cols[4], cols[5], cols[6], cols[7], cols[8]]
      .map(c => c?.trim()).filter(Boolean);

    const row: Record<string, string> = {
      category: cols[0]?.trim() || 'Non classé',
      subcategory: cols[1]?.trim() || '',
      ref,
      name: cols[3]?.trim() || cols[27]?.trim() || ref,
      description: descParts.join(' '),
      price_ht: cols[10]?.trim() || '0',
      vat_code: cols[37]?.trim() || '1',
      stock_qty: cols[36]?.trim() || '0',
      min_qty: cols[22]?.trim() || '1',
      weight_kg: cols[23]?.trim() || '',
      brand: cols[27]?.trim() || '',
      oem_ref: cols[28]?.trim() || '',
      ean: normalizeEan(cols[29]),
      is_end_of_life: cols[34]?.trim() || '0',
      is_special_order: cols[35]?.trim() || '0',
      country_origin: cols[32]?.trim() || '',
    };

    // Price tiers (6 tiers, starting at col 9, pairs of qty+price)
    for (let t = 0; t < 6; t++) {
      const qtyIdx = 9 + (t * 2);
      const priceIdx = 10 + (t * 2);
      row[`tier${t + 1}_qty`] = cols[qtyIdx]?.trim() || '';
      row[`tier${t + 1}_price`] = cols[priceIdx]?.trim() || '';
    }

    rows.push(row);
  }

  return { rows, headers, totalRows: rows.length };
}

// ── ARTX.IMP — Product descriptions, fixed-width (CP850) ───────────────────

export function parseArtx(buffer: ArrayBuffer): ParsedData {
  const text = decodeCP850(buffer);
  const lines = splitLines(text);
  const headers = ['ref', 'description'];
  const rows: Record<string, string>[] = [];

  for (const line of lines) {
    if (line.length < 22) continue;

    const lang = line.substring(1, 4).trim();
    if (lang !== '003') continue; // French only

    const ref = line.substring(4, 22).trim();
    if (!ref) continue;

    const descBlocks: string[] = [];
    for (let i = 0; i < 62; i++) {
      const start = 22 + (i * 60);
      if (start >= line.length) break;
      const block = line.substring(start, start + 60).trim();
      if (block) descBlocks.push(block);
    }
    const description = descBlocks.join(' ').trim();
    if (!description) continue;

    rows.push({ ref, description });
  }

  return { rows, headers, totalRows: rows.length };
}

// ── TarifsB2B.csv — B2B enrichment (CSV semicolon, UTF-8 BOM) ──────────────

export const TARIFSB2B_EXPECTED_COLS = [
  'reference', 'code', 'description longue', 'breve description', 'prix/tarif',
  'pvp', 'tva', 'marque', 'categorie', 'sous-categorie', 'cop', 'd3e',
  'umv', 'ean umv', 'uve', 'ean uve', 'env', 'ean env', 'poids umv',
];

export function parseTarifsB2B(text: string): ParsedData {
  let cleanData = text;
  if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);

  const lines = splitLines(cleanData);
  if (lines.length < 2) return { rows: [], headers: [], totalRows: 0 };

  // Dynamic header detection
  const rawHeaders = lines[0].split(';').map(h => h.trim());
  const normalizedHeaders = rawHeaders.map(h =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const findCol = (patterns: string[]): number => {
    for (const p of patterns) {
      const idx = normalizedHeaders.findIndex(h => h.includes(p));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colMap: Record<string, number> = {
    ref: findCol(['reference', 'ref']),
    code: findCol(['code']),
    description: findCol(['longue description', 'description longue']),
    short_desc: findCol(['breve description', 'breve desc']),
    price: findCol(['prix', 'tarif']),
    pvp: findCol(['pvp']),
    tva: findCol(['tva']),
    brand: findCol(['marque']),
    category: findCol(['categorie']),
    subcategory: findCol(['sous-categorie', 'sous categorie']),
    tax_cop: findCol(['cop']),
    tax_d3e: findCol(['d3e']),
    umv_qty: findCol(['umv']),
    umv_ean: findCol(['ean umv', 'ean unite']),
    uve_qty: findCol(['uve']),
    uve_ean: findCol(['ean uve']),
    env_qty: findCol(['env']),
    env_ean: findCol(['ean env']),
    weight_umv: findCol(['poids umv']),
  };

  const detectedHeaders = Object.entries(colMap)
    .filter(([, idx]) => idx >= 0)
    .map(([key]) => key);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 5) continue;

    const row: Record<string, string> = {};
    for (const [key, idx] of Object.entries(colMap)) {
      if (idx >= 0 && idx < cols.length) {
        row[key] = cols[idx]?.trim() || '';
      }
    }

    // Must have at least a reference or code
    if (!row.ref && !row.code) continue;
    rows.push(row);
  }

  return { rows, headers: detectedHeaders, totalRows: rows.length };
}

// ── LAGERBESTAND.csv — Real-time stock (CSV semicolon, UTF-8) ───────────────

export function parseLagerbestand(text: string): ParsedData {
  const lines = splitLines(text);
  const headers = ['ref', 'qty_available', 'delivery_week'];
  const rows: Record<string, string>[] = [];

  // Skip header row if present
  const startIdx = (lines[0] && /^[a-zA-Z]/.test(lines[0].split(';')[0])) ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 2) continue;
    const ref = cols[0]?.trim();
    if (!ref) continue;

    rows.push({
      ref,
      qty_available: cols[1]?.trim() || '0',
      delivery_week: cols[2]?.trim() || '',
    });
  }

  return { rows, headers, totalRows: rows.length };
}
