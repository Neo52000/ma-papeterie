// Types for supplier pricing data
export interface SupplierPricingRow {
  supplier_reference: string;
  product_name?: string;
  ean?: string;
  supplier_price: number;
  stock_quantity?: number;
  lead_time_days?: number;
  min_order_quantity?: number;
  quantity_discount?: Record<string, number>;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, string | number | null>[];
  format: 'csv' | 'xml' | 'json';
}

export interface ColumnMapping {
  supplier_reference: string;
  product_name?: string;
  ean?: string;
  supplier_price: string;
  stock_quantity?: string;
  lead_time_days?: string;
  min_order_quantity?: string;
}

// ============ CSV PARSER ============

/**
 * Détecte automatiquement le séparateur CSV
 */
function detectCsvSeparator(content: string): string {
  const firstLine = content.split('\n')[0];
  const separators = [';', ',', '\t', '|'];
  
  let bestSeparator = ',';
  let maxCount = 0;
  
  for (const sep of separators) {
    const count = (firstLine.match(new RegExp(`\\${sep}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestSeparator = sep;
    }
  }
  
  return bestSeparator;
}

/**
 * Parse une ligne CSV en tenant compte des guillemets
 */
function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Convertit une chaîne en nombre (gestion format européen)
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  
  // Nettoyer la chaîne
  let cleaned = value.toString().trim();
  
  // Supprimer les espaces et caractères de devise
  cleaned = cleaned.replace(/[€$£\s]/g, '');
  
  // Détecter le format européen (virgule comme séparateur décimal)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    // Format 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse un fichier CSV
 */
export function parseCsv(content: string): ParsedData {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return { headers: [], rows: [], format: 'csv' };
  }
  
  const separator = detectCsvSeparator(content);
  const headers = parseCsvLine(lines[0], separator).map(h => h.replace(/^["']|["']$/g, ''));
  
  const rows: Record<string, string | number | null>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], separator);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    
    const row: Record<string, string | number | null> = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Essayer de parser comme nombre
      const numValue = parseNumber(value);
      row[header] = numValue !== null ? numValue : value;
    });
    rows.push(row);
  }
  
  return { headers, rows, format: 'csv' };
}

// ============ XML PARSER ============

/**
 * Extrait le texte d'une balise XML
 */
function extractXmlText(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Trouve tous les éléments d'une balise XML
 */
function findXmlElements(xml: string, tagNames: string[]): string[] {
  for (const tagName of tagNames) {
    const regex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'gi');
    const matches = xml.match(regex);
    if (matches && matches.length > 0) {
      return matches;
    }
  }
  return [];
}

/**
 * Extrait tous les champs d'un élément XML
 */
function extractXmlFields(element: string): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // Matcher toutes les balises avec contenu texte
  const regex = /<([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
  let match;
  
  while ((match = regex.exec(element)) !== null) {
    const tagName = match[1].toLowerCase();
    const value = match[2].trim();
    if (value) {
      fields[tagName] = value;
    }
  }
  
  return fields;
}

/**
 * Parse un fichier XML
 */
export function parseXml(content: string): ParsedData {
  // Balises communes pour les produits
  const productTags = ['product', 'produit', 'article', 'item', 'ligne', 'row', 'entry'];
  
  const elements = findXmlElements(content, productTags);
  
  if (elements.length === 0) {
    return { headers: [], rows: [], format: 'xml' };
  }
  
  const rows: Record<string, string | number | null>[] = [];
  const allHeaders = new Set<string>();
  
  // Premier passage : collecter tous les headers
  for (const element of elements) {
    const fields = extractXmlFields(element);
    Object.keys(fields).forEach(key => allHeaders.add(key));
  }
  
  // Deuxième passage : construire les lignes
  for (const element of elements) {
    const fields = extractXmlFields(element);
    const row: Record<string, string | number | null> = {};
    
    allHeaders.forEach(header => {
      const value = fields[header] || '';
      const numValue = parseNumber(value);
      row[header] = numValue !== null ? numValue : value;
    });
    
    rows.push(row);
  }
  
  return { 
    headers: Array.from(allHeaders), 
    rows, 
    format: 'xml' 
  };
}

// ============ JSON PARSER ============

/**
 * Aplatit un objet imbriqué
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === null || value === undefined) {
      result[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      // Pour les tableaux, on les stocke comme JSON string
      result[newKey] = JSON.stringify(value);
    } else if (typeof value === 'number') {
      result[newKey] = value;
    } else if (typeof value === 'string') {
      const numValue = parseNumber(value);
      result[newKey] = numValue !== null ? numValue : value;
    } else {
      result[newKey] = String(value);
    }
  }
  
  return result;
}

/**
 * Parse un fichier JSON
 */
export function parseJson(content: string): ParsedData {
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(content);
  } catch {
    return { headers: [], rows: [], format: 'json' };
  }
  
  let items: Record<string, unknown>[] = [];
  
  // Format tableau direct
  if (Array.isArray(parsed)) {
    items = parsed.filter(item => typeof item === 'object' && item !== null) as Record<string, unknown>[];
  } 
  // Format objet avec propriété contenant le tableau
  else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    // Chercher des propriétés communes pour les produits
    const productKeys = ['products', 'produits', 'items', 'articles', 'data', 'rows', 'results', 'catalogue'];
    
    for (const key of productKeys) {
      if (Array.isArray(obj[key])) {
        items = (obj[key] as unknown[]).filter(
          item => typeof item === 'object' && item !== null
        ) as Record<string, unknown>[];
        break;
      }
    }
    
    // Si aucune clé connue, chercher le premier tableau
    if (items.length === 0) {
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          items = (obj[key] as unknown[]).filter(
            item => typeof item === 'object' && item !== null
          ) as Record<string, unknown>[];
          break;
        }
      }
    }
  }
  
  if (items.length === 0) {
    return { headers: [], rows: [], format: 'json' };
  }
  
  // Aplatir tous les objets et collecter les headers
  const rows: Record<string, string | number | null>[] = [];
  const allHeaders = new Set<string>();
  
  for (const item of items) {
    const flattened = flattenObject(item);
    Object.keys(flattened).forEach(key => allHeaders.add(key));
    rows.push(flattened);
  }
  
  // S'assurer que chaque row a toutes les colonnes
  const headers = Array.from(allHeaders);
  for (const row of rows) {
    for (const header of headers) {
      if (!(header in row)) {
        row[header] = null;
      }
    }
  }
  
  return { headers, rows, format: 'json' };
}

// ============ UNIFIED PARSER ============

export type FileFormat = 'csv' | 'xml' | 'json';

/**
 * Détecte automatiquement le format du fichier
 */
export function detectFormat(content: string, filename?: string): FileFormat {
  // D'abord par extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'xml') return 'xml';
    if (ext === 'json') return 'json';
  }
  
  // Ensuite par contenu
  const trimmed = content.trim();
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    return 'xml';
  }
  
  return 'csv';
}

/**
 * Parse un fichier selon son format
 */
export function parseFile(content: string, format: FileFormat): ParsedData {
  switch (format) {
    case 'csv':
      return parseCsv(content);
    case 'xml':
      return parseXml(content);
    case 'json':
      return parseJson(content);
    default:
      return parseCsv(content);
  }
}

/**
 * Applique le mapping de colonnes pour extraire les données normalisées
 */
export function applyColumnMapping(
  rows: Record<string, string | number | null>[],
  mapping: ColumnMapping
): SupplierPricingRow[] {
  return rows
    .map(row => {
      const refValue = row[mapping.supplier_reference];
      const priceValue = row[mapping.supplier_price];
      
      // Skip si référence ou prix manquant
      if (!refValue || priceValue === null || priceValue === undefined) {
        return null;
      }
      
      const result: SupplierPricingRow = {
        supplier_reference: String(refValue),
        supplier_price: typeof priceValue === 'number' ? priceValue : parseNumber(priceValue) || 0,
      };
      
      // Champs optionnels
      if (mapping.product_name && row[mapping.product_name]) {
        result.product_name = String(row[mapping.product_name]);
      }
      
      if (mapping.ean && row[mapping.ean]) {
        result.ean = String(row[mapping.ean]).replace(/\s/g, '');
      }
      
      if (mapping.stock_quantity && row[mapping.stock_quantity] !== null) {
        const stock = parseNumber(row[mapping.stock_quantity]);
        if (stock !== null) result.stock_quantity = Math.round(stock);
      }
      
      if (mapping.lead_time_days && row[mapping.lead_time_days] !== null) {
        const leadTime = parseNumber(row[mapping.lead_time_days]);
        if (leadTime !== null) result.lead_time_days = Math.round(leadTime);
      }
      
      if (mapping.min_order_quantity && row[mapping.min_order_quantity] !== null) {
        const minQty = parseNumber(row[mapping.min_order_quantity]);
        if (minQty !== null) result.min_order_quantity = Math.round(minQty);
      }
      
      return result;
    })
    .filter((row): row is SupplierPricingRow => row !== null);
}

/**
 * Suggestions automatiques de mapping basées sur les noms de colonnes
 */
export function suggestColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  
  const patterns = {
    supplier_reference: [/ref/i, /reference/i, /sku/i, /code/i, /article/i, /numero/i],
    product_name: [/nom/i, /name/i, /designation/i, /libelle/i, /description/i, /titre/i, /product/i],
    ean: [/ean/i, /gtin/i, /barcode/i, /code.?barre/i, /upc/i],
    supplier_price: [/prix/i, /price/i, /tarif/i, /cout/i, /cost/i, /ht/i, /pa/i, /achat/i],
    stock_quantity: [/stock/i, /qty/i, /quantite/i, /quantity/i, /dispo/i, /available/i],
    lead_time_days: [/delai/i, /lead/i, /livraison/i, /delivery/i, /jour/i, /day/i],
    min_order_quantity: [/min/i, /minimum/i, /moq/i],
  };
  
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    for (const header of headers) {
      for (const pattern of fieldPatterns) {
        if (pattern.test(header)) {
          mapping[field as keyof ColumnMapping] = header;
          break;
        }
      }
      if (mapping[field as keyof ColumnMapping]) break;
    }
  }
  
  return mapping;
}
