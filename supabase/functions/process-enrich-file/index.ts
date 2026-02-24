import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Concurrency helper ───────────────────────────────────────────────────────
// Runs an array of async tasks with a maximum concurrency limit.
async function pAll<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function extractProductList(json: any, containerKey = 'Products'): any[] {
  const root = json?.root || json;
  const container = root?.[containerKey] || root?.[containerKey.toLowerCase()] || root;
  if (Array.isArray(container)) {
    const all: any[] = [];
    for (const item of container) {
      const prods = item?.Product || item?.product || [];
      all.push(...(Array.isArray(prods) ? prods : [prods]));
    }
    return all;
  }
  const products = container?.Product || container?.product || [];
  return Array.isArray(products) ? products : products ? [products] : [];
}

function parseJsonRobust(text: string): { products: any[]; truncated: boolean } {
  try {
    const json = JSON.parse(text);
    return { products: extractProductList(json), truncated: false };
  } catch {
    const products: any[] = [];
    const productArrayStart = text.indexOf('"Product"');
    if (productArrayStart === -1) return { products, truncated: true };
    const arrayOpenIdx = text.indexOf('[', productArrayStart);
    if (arrayOpenIdx === -1) return { products, truncated: true };

    let pos = arrayOpenIdx + 1;
    let depth = 0;
    let objStart = -1;
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === '{') { if (depth === 0) objStart = pos; depth++; }
      else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const s = text.slice(objStart, pos + 1);
          try { products.push(JSON.parse(s)); } catch { /* skip */ }
          objStart = -1;
        }
      }
      pos++;
    }
    return { products, truncated: true };
  }
}

// ─── Ref → product_id resolver (parallel, concurrency=8) ─────────────────────

async function batchFindProductIds(
  supabase: ReturnType<typeof createClient>,
  refs: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (refs.length === 0) return map;
  const CHUNK = 500;
  const CONCURRENCY = 8;

  // Build chunks
  const chunks: string[][] = [];
  for (let i = 0; i < refs.length; i += CHUNK) chunks.push(refs.slice(i, i + CHUNK));

  // 1. Via RPC — all chunks in parallel (max 8 concurrent)
  const rpcResults = await pAll(
    chunks.map(chunk => () => supabase.rpc('find_products_by_refs', { refs: chunk })),
    CONCURRENCY,
  );
  for (const { data, error } of rpcResults) {
    if (error) console.error('[process-enrich-file] RPC error:', error.message);
    if (data) {
      for (const r of data) {
        if (r.matched_ref && r.product_id && !map.has(r.matched_ref)) {
          map.set(r.matched_ref, r.product_id);
        }
      }
    }
  }

  // 2. Fallback: supplier_products — only for unmatched refs
  const unmatched = refs.filter(r => !map.has(r));
  if (unmatched.length === 0) return map;

  const unChunks: string[][] = [];
  for (let i = 0; i < unmatched.length; i += CHUNK) unChunks.push(unmatched.slice(i, i + CHUNK));

  const spResults = await pAll(
    unChunks.map(chunk => () =>
      supabase
        .from('supplier_products')
        .select('supplier_reference, product_id')
        .in('supplier_reference', chunk),
    ),
    CONCURRENCY,
  );
  for (const { data } of spResults) {
    if (data) {
      for (const r of data) {
        if (r.supplier_reference && r.product_id && !map.has(r.supplier_reference)) {
          map.set(r.supplier_reference, r.product_id);
        }
      }
    }
  }

  return map;
}

// ─── Inline processors ────────────────────────────────────────────────────────

async function processDescriptions(
  supabase: ReturnType<typeof createClient>,
  products: any[],
): Promise<{ updated: number; skipped: number; errors: number; skip_reasons: { not_found: number; no_content: number }; sample_not_found: string[] }> {
  const allRefs = products.map((p: any) => String(p.id || '')).filter(Boolean);
  const refMap = await batchFindProductIds(supabase, allRefs);
  let updated = 0, skipped = 0, errors = 0;
  let skip_not_found = 0, skip_no_content = 0;
  const sample_not_found: string[] = [];
  const upsertRows: any[] = [];

  for (const p of products) {
    const refId = String(p.id || '');
    const productId = refMap.get(refId);
    if (!productId) {
      skipped++; skip_not_found++;
      if (sample_not_found.length < 100) sample_not_found.push(refId);
      continue;
    }

    const descs = p.Descriptions?.Description || p.descriptions?.Description || [];
    const descList = Array.isArray(descs) ? descs : [descs];
    let metaTitle = '', descCourte = '', descLongue = '', descDetaillee = '', metaDesc = '';

    for (const desc of descList) {
      const code = desc.DescCode || desc.descCode || '';
      const texts = desc.Texts?.Text || desc.texts?.Text || [];
      const textList = Array.isArray(texts) ? texts : [texts];
      const frText = textList.find((t: any) => (t.lang || t.Lang || '').startsWith('fr')) || textList[0];
      const value = frText?.value || frText?.Value || frText?.['#text'] || (typeof frText === 'string' ? frText : '');
      if (!value) continue;
      if (code === 'INT_VTE') metaTitle = value;
      else if (code === 'MINI_DESC') descCourte = value;
      else if (code === 'TXT_RCOM') descLongue = value;
      else if (code === 'ABRV_DEC') metaDesc = value;
      else if (code === 'AMPL_DESC' && !descLongue) descLongue = value;
      else if ((code === 'DETAILED' || code === 'COMP' || code === 'TECH_SHEET' || code === 'DETALLADA') && !descDetaillee) descDetaillee = value;
    }

    if (!metaTitle && !descCourte && !descLongue && !metaDesc && !descDetaillee) {
      skipped++; skip_no_content++;
      continue;
    }

    const row: Record<string, any> = { product_id: productId, status: 'imported', description_source: 'supplier', lang: 'fr' };
    if (metaTitle) row.meta_title = metaTitle;
    if (descCourte) row.description_courte = descCourte;
    if (descLongue) row.description_longue = descLongue;
    if (descDetaillee) row.description_detaillee = descDetaillee;
    if (metaDesc) row.meta_description = metaDesc;
    upsertRows.push(row);
  }

  // Parallel upserts (concurrency = 8)
  const BATCH = 200;
  const chunks: any[][] = [];
  for (let i = 0; i < upsertRows.length; i += BATCH) chunks.push(upsertRows.slice(i, i + BATCH));

  const results = await pAll(
    chunks.map(chunk => () => supabase.from('product_seo').upsert(chunk, { onConflict: 'product_id' })),
    8,
  );
  for (let i = 0; i < results.length; i++) {
    const { error } = results[i];
    const size = chunks[i].length;
    if (error) errors += size; else updated += size;
  }

  return { updated, skipped, errors, skip_reasons: { not_found: skip_not_found, no_content: skip_no_content }, sample_not_found };
}

async function processMultimedia(
  supabase: ReturnType<typeof createClient>,
  products: any[],
): Promise<{ created: number; skipped: number; errors: number; images_synced: number; skip_reasons: { not_found: number; no_images: number }; sample_not_found: string[] }> {
  const allRefs = products.map((p: any) => String(p.id || '')).filter(Boolean);
  const refMap = await batchFindProductIds(supabase, allRefs);
  let created = 0, skipped = 0, errors = 0;
  let skip_not_found = 0, skip_no_images = 0;
  const sample_not_found: string[] = [];
  const upsertRows: any[] = [];

  for (const p of products) {
    const refId = String(p.id || '');
    const productId = refMap.get(refId);
    if (!productId) {
      skipped++; skip_not_found++;
      if (sample_not_found.length < 100) sample_not_found.push(refId);
      continue;
    }

    const links = p.MultimediaLinks?.MultimediaLink || p.multimediaLinks?.MultimediaLink || [];
    const linkList = Array.isArray(links) ? links : [links];
    let isFirst = true;
    for (const link of linkList) {
      const mmlType = (link.mmlType || link.MmlType || '').toUpperCase();
      const active = link.Active !== false && link.active !== false && link.Active !== 'false';
      if (mmlType !== 'IMG' || !active) continue;
      const url = link.Url || link.url || '';
      if (!url) continue;
      upsertRows.push({ product_id: productId, url_originale: url, alt_seo: link.Name || link.name || null, source: 'liderpapel', is_principal: isFirst });
      isFirst = false;
    }
    if (isFirst) { skipped++; skip_no_images++; }
  }

  const productIdsWithImages = [...new Set(upsertRows.map((r: any) => r.product_id))];

  // Delete existing liderpapel images — parallel (concurrency = 8)
  const DEL_CHUNK = 200;
  const delChunks: string[][] = [];
  for (let i = 0; i < productIdsWithImages.length; i += DEL_CHUNK) {
    delChunks.push(productIdsWithImages.slice(i, i + DEL_CHUNK));
  }
  await pAll(
    delChunks.map(chunk => () =>
      supabase.from('product_images').delete()
        .in('product_id', chunk)
        .eq('source', 'liderpapel'),
    ),
    8,
  );

  // Insert new images — parallel (concurrency = 8)
  const INS_CHUNK = 200;
  const insChunks: any[][] = [];
  for (let i = 0; i < upsertRows.length; i += INS_CHUNK) insChunks.push(upsertRows.slice(i, i + INS_CHUNK));

  const insResults = await pAll(
    insChunks.map(chunk => () => supabase.from('product_images').insert(chunk)),
    8,
  );
  for (let i = 0; i < insResults.length; i++) {
    const { error } = insResults[i];
    const size = insChunks[i].length;
    if (error) errors += size; else created += size;
  }

  // Sync principal image URL to products.image_url — parallel (concurrency = 8)
  let images_synced = 0;
  const principalImages = upsertRows.filter((r: any) => r.is_principal);
  const SYNC_CHUNK = 500;
  const syncChunks: any[][] = [];
  for (let i = 0; i < principalImages.length; i += SYNC_CHUNK) syncChunks.push(principalImages.slice(i, i + SYNC_CHUNK));

  const syncResults = await pAll(
    syncChunks.map(chunk => () =>
      supabase.rpc('batch_upsert_product_image_url', {
        pairs: chunk.map((img: any) => ({ id: img.product_id, url: img.url_originale })),
      }),
    ),
    8,
  );
  for (const { data } of syncResults) {
    if (data) images_synced += (data ?? 0);
  }

  return { created, skipped, errors, images_synced, skip_reasons: { not_found: skip_not_found, no_images: skip_no_images }, sample_not_found };
}

async function processRelations(
  supabase: ReturnType<typeof createClient>,
  products: any[],
): Promise<{ created: number; skipped: number; errors: number; skip_reasons: { no_id: number; no_relations: number } }> {
  let created = 0, skipped = 0, errors = 0;
  let skip_no_id = 0, skip_no_relations = 0;
  const insertRows: any[] = [];

  for (const p of products) {
    const refId = String(p.id || '');
    if (!refId) { skipped++; skip_no_id++; continue; }
    const rels = p.RelationedProducts?.RelationedProduct || p.relationedProducts?.RelationedProduct || [];
    const relList = Array.isArray(rels) ? rels : [rels];
    for (const rel of relList) {
      const relatedId = String(rel.id || rel.Id || '');
      const relType = rel.type || rel.Type || rel.relationType || 'alternative';
      if (!relatedId) continue;
      insertRows.push({ product_id: refId, related_product_id: relatedId, relation_type: relType });
    }
    if (relList.length === 0) { skipped++; skip_no_relations++; }
  }

  // Parallel inserts (concurrency = 8)
  const BATCH = 200;
  const chunks: any[][] = [];
  for (let i = 0; i < insertRows.length; i += BATCH) chunks.push(insertRows.slice(i, i + BATCH));

  const results = await pAll(
    chunks.map(chunk => () => supabase.from('product_relations').insert(chunk)),
    8,
  );
  for (let i = 0; i < results.length; i++) {
    const { error } = results[i];
    const size = chunks[i].length;
    if (error) errors += size; else created += size;
  }

  return { created, skipped, errors, skip_reasons: { no_id: skip_no_id, no_relations: skip_no_relations } };
}

// ─── Background processing ────────────────────────────────────────────────────

async function processFile(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  fileType: string,
  jobId: string | null,
): Promise<void> {
  try {
    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    console.log(`[process-enrich-file] Downloading ${storagePath} (type: ${fileType})`);

    const { data: blob, error: downloadError } = await supabase.storage
      .from('liderpapel-enrichment')
      .download(storagePath);

    if (downloadError || !blob) {
      throw new Error(`Erreur téléchargement Storage: ${downloadError?.message || 'fichier introuvable'}`);
    }

    // Detect gzip (magic bytes 0x1f 0x8b) — client compresses files > 20 MB
    const rawBuf = await blob.arrayBuffer();
    const magic = new Uint8Array(rawBuf, 0, 2);
    let text: string;
    if (magic[0] === 0x1f && magic[1] === 0x8b) {
      const ds = new DecompressionStream('gzip');
      const inStream = new ReadableStream({
        start(ctrl) { ctrl.enqueue(new Uint8Array(rawBuf)); ctrl.close(); },
      });
      text = await new Response(inStream.pipeThrough(ds)).text();
      console.log(`[process-enrich-file] Decompressed: ${rawBuf.byteLength} → ${text.length} chars`);
    } else {
      text = new TextDecoder().decode(rawBuf);
    }

    console.log(`[process-enrich-file] File ready, size: ${text.length} chars`);

    const { products, truncated } = parseJsonRobust(text);
    console.log(`[process-enrich-file] Parsed ${products.length} products (truncated: ${truncated})`);

    if (products.length === 0) {
      throw new Error('Aucun produit trouvé dans le fichier JSON');
    }

    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ total_rows: products.length, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    // ── Process with fully parallelized DB ops ─────────────────────────────
    let result: Record<string, any> = { total: products.length, truncated };

    if (fileType === 'descriptions_json') {
      const r = await processDescriptions(supabase, products);
      result = { ...result, ...r };
    } else if (fileType === 'multimedia_json') {
      const r = await processMultimedia(supabase, products);
      result = { ...result, ...r };
    } else if (fileType === 'relations_json') {
      const r = await processRelations(supabase, products);
      result = { ...result, ...r };
    } else {
      throw new Error(`Type de fichier non supporté: ${fileType}`);
    }

    console.log(`[process-enrich-file] Done: ${JSON.stringify(result)}`);

    // Cleanup
    await supabase.storage.from('liderpapel-enrichment').remove([storagePath]);

    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ status: 'done', processed_rows: products.length, result, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

  } catch (err: any) {
    console.error('[process-enrich-file] Fatal error:', err.message);
    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ status: 'error', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }
  }
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { storagePath, fileType, jobId } = await req.json();

    if (!storagePath || !fileType) {
      return new Response(JSON.stringify({ error: 'storagePath and fileType are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Launch background processing via waitUntil (Supabase Edge Runtime).
    // With all DB calls parallelized (concurrency=8), processing 77k products
    // takes ~30-60s instead of 3-5 min, well within the 150s runtime limit.
    const processing = processFile(supabase, storagePath, fileType, jobId ?? null);
    // @ts-ignore — EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(processing);
    } else {
      await processing;
    }

    return new Response(JSON.stringify({ jobId, status: 'processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[process-enrich-file] Request error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
