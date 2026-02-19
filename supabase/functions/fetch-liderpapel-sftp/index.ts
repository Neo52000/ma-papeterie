import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CatalogRow {
  reference: string;
  description?: string;
  family?: string;
  subfamily?: string;
  ean?: string;
  brand?: string;
  weight_kg?: string;
  dimensions?: string;
  country_origin?: string;
  customs_code?: string;
  is_active?: string;
  [key: string]: string | undefined;
}

interface PriceRow {
  reference: string;
  cost_price?: string;
  suggested_price?: string;
  tva_rate?: string;
  taxe_cop?: string;
  taxe_d3e?: string;
  taxe_mob?: string;
  taxe_scm?: string;
  taxe_sod?: string;
  [key: string]: string | undefined;
}

interface StockRow {
  reference: string;
  stock_quantity?: string;
  [key: string]: string | undefined;
}

function parseCsvLines(text: string, separator = ';'): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());

  return lines.slice(1).map(line => {
    const vals = line.split(separator);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] || '').trim();
    });
    return obj;
  });
}

// Normalize header names to our expected format
function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function mapCatalogRow(raw: Record<string, string>): CatalogRow {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeKey(k)] = v;
  }
  return {
    reference: normalized.reference || normalized.ref || normalized.code || '',
    description: normalized.description || normalized.designation || normalized.libelle || '',
    family: normalized.family || normalized.famille || normalized.categorie || '',
    subfamily: normalized.subfamily || normalized.sous_famille || normalized.sous_categorie || '',
    ean: normalized.ean || normalized.ean13 || normalized.code_barre || '',
    brand: normalized.brand || normalized.marque || '',
    weight_kg: normalized.weight_kg || normalized.poids || normalized.poids_kg || '',
    dimensions: normalized.dimensions || normalized.dim || '',
    country_origin: normalized.country_origin || normalized.pays_origine || normalized.pays || '',
    customs_code: normalized.customs_code || normalized.code_douane || '',
    is_active: normalized.is_active || normalized.actif || '1',
  };
}

function mapPriceRow(raw: Record<string, string>): PriceRow {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeKey(k)] = v;
  }
  return {
    reference: normalized.reference || normalized.ref || normalized.code || '',
    cost_price: normalized.cost_price || normalized.prix_achat || normalized.prix_achat_ht || normalized.prix || '',
    suggested_price: normalized.suggested_price || normalized.prix_conseille || normalized.pvp || normalized.pvp_conseille || normalized.prix_ttc_conseille || '',
    tva_rate: normalized.tva_rate || normalized.tva || normalized.taux_tva || '',
    taxe_cop: normalized.taxe_cop || normalized.cop || '',
    taxe_d3e: normalized.taxe_d3e || normalized.d3e || '',
    taxe_mob: normalized.taxe_mob || normalized.mob || '',
    taxe_scm: normalized.taxe_scm || normalized.scm || '',
    taxe_sod: normalized.taxe_sod || normalized.sod || '',
  };
}

function mapStockRow(raw: Record<string, string>): StockRow {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[normalizeKey(k)] = v;
  }
  return {
    reference: normalized.reference || normalized.ref || normalized.code || '',
    stock_quantity: normalized.stock_quantity || normalized.quantite || normalized.qty || normalized.stock || '',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));

    // Mode 1: Manual upload (CSV content passed directly)
    if (body.catalog_csv || body.prices_csv || body.stock_csv) {
      return await processManualUpload(supabase, body);
    }

    // Mode 2: SFTP fetch
    // Note: SFTP via ssh2 may not work in Deno Edge Functions.
    // We attempt it, but if it fails we return a clear error suggesting manual upload.
    const sftpHost = Deno.env.get('LIDERPAPEL_SFTP_HOST');
    const sftpUser = Deno.env.get('LIDERPAPEL_SFTP_USER');
    const sftpPass = Deno.env.get('LIDERPAPEL_SFTP_PASS');

    if (!sftpHost || !sftpUser || !sftpPass) {
      return new Response(JSON.stringify({
        error: 'SFTP credentials not configured. Please add LIDERPAPEL_SFTP_HOST, LIDERPAPEL_SFTP_USER, LIDERPAPEL_SFTP_PASS as secrets.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try SFTP connection
    try {
      const SftpClient = (await import("npm:ssh2-sftp-client@11")).default;
      const sftp = new SftpClient();

      await sftp.connect({
        host: sftpHost,
        port: 22,
        username: sftpUser,
        password: sftpPass,
        algorithms: {
          serverHostKey: [
            'ssh-rsa',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'ssh-ed25519',
            'rsa-sha2-256',
            'rsa-sha2-512',
          ],
          kex: [
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
          ],
        },
        readyTimeout: 30000,
      });

      // Try to download files
      let catalogCsv = '';
      let pricesCsv = '';
      let stockCsv = '';

      try {
        const catalogBuf = await sftp.get('Catalog.csv');
        catalogCsv = typeof catalogBuf === 'string' ? catalogBuf : new TextDecoder().decode(catalogBuf);
      } catch (e: any) {
        console.log('Catalog.csv not found or error:', e.message);
      }

      try {
        const pricesBuf = await sftp.get('Prices.csv');
        pricesCsv = typeof pricesBuf === 'string' ? pricesBuf : new TextDecoder().decode(pricesBuf);
      } catch (e: any) {
        console.log('Prices.csv not found or error:', e.message);
      }

      try {
        const stockBuf = await sftp.get('Stock.csv');
        stockCsv = typeof stockBuf === 'string' ? stockBuf : new TextDecoder().decode(stockBuf);
      } catch (e: any) {
        console.log('Stock.csv not found (optional):', e.message);
      }

      await sftp.end();

      if (!catalogCsv && !pricesCsv) {
        return new Response(JSON.stringify({ error: 'No CSV files found on SFTP server' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return await processManualUpload(supabase, {
        catalog_csv: catalogCsv,
        prices_csv: pricesCsv,
        stock_csv: stockCsv,
      });

    } catch (sftpError: any) {
      return new Response(JSON.stringify({
        error: `SFTP connection failed: ${sftpError.message}. Please use manual CSV upload instead.`,
        sftp_error: true,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processManualUpload(supabase: any, body: any) {
  const catalogRows = body.catalog_csv ? parseCsvLines(body.catalog_csv, ';') : [];
  const priceRows = body.prices_csv ? parseCsvLines(body.prices_csv, ';') : [];
  const stockRows = body.stock_csv ? parseCsvLines(body.stock_csv, ';') : [];

  // Map and normalize
  const catalogMap = new Map<string, CatalogRow>();
  for (const raw of catalogRows) {
    const mapped = mapCatalogRow(raw);
    if (mapped.reference) catalogMap.set(mapped.reference, mapped);
  }

  const priceMap = new Map<string, PriceRow>();
  for (const raw of priceRows) {
    const mapped = mapPriceRow(raw);
    if (mapped.reference) priceMap.set(mapped.reference, mapped);
  }

  const stockMap = new Map<string, StockRow>();
  for (const raw of stockRows) {
    const mapped = mapStockRow(raw);
    if (mapped.reference) stockMap.set(mapped.reference, mapped);
  }

  // Merge all references
  const allRefs = new Set<string>([
    ...catalogMap.keys(),
    ...priceMap.keys(),
  ]);

  // Build unified rows for import-comlandi liderpapel mode
  const mergedRows: any[] = [];
  for (const ref of allRefs) {
    const cat = catalogMap.get(ref);
    const price = priceMap.get(ref);
    const stock = stockMap.get(ref);

    mergedRows.push({
      reference: ref,
      description: cat?.description || '',
      family: cat?.family || '',
      subfamily: cat?.subfamily || '',
      ean: cat?.ean || '',
      brand: cat?.brand || '',
      weight_kg: cat?.weight_kg || '',
      dimensions: cat?.dimensions || '',
      country_origin: cat?.country_origin || '',
      customs_code: cat?.customs_code || '',
      is_active: cat?.is_active || '1',
      cost_price: price?.cost_price || '',
      suggested_price: price?.suggested_price || '',
      tva_rate: price?.tva_rate || '',
      taxe_cop: price?.taxe_cop || '',
      taxe_d3e: price?.taxe_d3e || '',
      taxe_mob: price?.taxe_mob || '',
      taxe_scm: price?.taxe_scm || '',
      taxe_sod: price?.taxe_sod || '',
      stock_quantity: stock?.stock_quantity || '',
    });
  }

  // Call import-comlandi internally with source=liderpapel
  // We call it directly via the Supabase function URL
  const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-comlandi`;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Process in batches of 500
  const BATCH = 500;
  const totals = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], price_changes: [] as any[] };

  for (let i = 0; i < mergedRows.length; i += BATCH) {
    const batch = mergedRows.slice(i, i + BATCH);

    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ source: 'liderpapel', rows: batch }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      totals.errors += batch.length;
      totals.details.push(`Batch error: ${err}`);
      continue;
    }

    const data = await resp.json();
    totals.created += data.created || 0;
    totals.updated += data.updated || 0;
    totals.skipped += data.skipped || 0;
    totals.errors += data.errors || 0;
    totals.details.push(...(data.details || []));
    totals.price_changes.push(...(data.price_changes || []));
  }

  return new Response(JSON.stringify({
    ...totals,
    catalog_rows: catalogRows.length,
    prices_rows: priceRows.length,
    stock_rows: stockRows.length,
    merged_total: mergedRows.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
