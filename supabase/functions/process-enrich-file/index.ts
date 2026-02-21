import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractProductList(json: any): any[] {
  const root = json?.root || json;
  const container = root?.Products || root?.products || root;
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

/**
 * Robust parser: tries JSON.parse first, then recovers valid objects
 * character-by-character for truncated files.
 */
function parseJsonRobust(text: string): { products: any[]; truncated: boolean } {
  try {
    const json = JSON.parse(text);
    return { products: extractProductList(json), truncated: false };
  } catch {
    // File is truncated — extract complete objects before the cut
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
      if (ch === '{') {
        if (depth === 0) objStart = pos;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const objStr = text.slice(objStart, pos + 1);
          try { products.push(JSON.parse(objStr)); } catch { /* skip corrupt */ }
          objStart = -1;
        }
      }
      pos++;
    }
    return { products, truncated: true };
  }
}

// ─── Background processing (runs via EdgeRuntime.waitUntil) ───────────────────

async function processFile(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  fileType: string,
  jobId: string | null,
): Promise<void> {
  const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-liderpapel-sftp`;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Update job status to processing
    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    console.log(`[process-enrich-file] Downloading ${storagePath} (type: ${fileType})`);

    // Download file from Storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from('liderpapel-enrichment')
      .download(storagePath);

    if (downloadError || !blob) {
      throw new Error(`Erreur téléchargement Storage: ${downloadError?.message || 'fichier introuvable'}`);
    }

    const text = await blob.text();
    console.log(`[process-enrich-file] File downloaded, size: ${text.length} chars`);

    // Parse JSON (robust for truncated files)
    const { products, truncated } = parseJsonRobust(text);
    console.log(`[process-enrich-file] Parsed ${products.length} products (truncated: ${truncated})`);

    if (products.length === 0) {
      throw new Error('Aucun produit trouvé dans le fichier JSON');
    }

    // Update total_rows
    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({ total_rows: products.length, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    // Process in batches of 300, calling fetch-liderpapel-sftp
    const BATCH = 300;
    const aggregated: Record<string, any> = {
      total: products.length,
      updated: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      truncated,
    };

    let processed = 0;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const body: Record<string, any> = {};
      body[fileType] = { Products: { Product: batch } };

      try {
        const resp = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          const data = await resp.json();
          const resultKey = fileType === 'descriptions_json' ? 'descriptions'
            : fileType === 'multimedia_json' ? 'multimedia'
            : 'relations';

          if (data[resultKey]) {
            aggregated.updated = (aggregated.updated || 0) + (data[resultKey].updated || 0);
            aggregated.created = (aggregated.created || 0) + (data[resultKey].created || 0);
            aggregated.skipped = (aggregated.skipped || 0) + (data[resultKey].skipped || 0);
            aggregated.errors = (aggregated.errors || 0) + (data[resultKey].errors || 0);
          }
        } else {
          const errText = await resp.text();
          console.error(`[process-enrich-file] Batch error at offset ${i}: ${errText}`);
          aggregated.errors = (aggregated.errors || 0) + batch.length;
        }
      } catch (batchErr: any) {
        console.error(`[process-enrich-file] Batch exception at offset ${i}: ${batchErr.message}`);
        aggregated.errors = (aggregated.errors || 0) + batch.length;
      }

      processed += batch.length;

      // Update progress every batch
      if (jobId) {
        await supabase.from('enrich_import_jobs')
          .update({ processed_rows: processed, updated_at: new Date().toISOString() })
          .eq('id', jobId);
      }

      console.log(`[process-enrich-file] Progress: ${processed}/${products.length}`);
    }

    // Cleanup: delete file from Storage
    await supabase.storage.from('liderpapel-enrichment').remove([storagePath]);
    console.log(`[process-enrich-file] Cleaned up ${storagePath}`);

    // Mark job as done
    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({
          status: 'done',
          processed_rows: processed,
          result: aggregated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    console.log(`[process-enrich-file] Done: ${JSON.stringify(aggregated)}`);

  } catch (err: any) {
    console.error('[process-enrich-file] Fatal error:', err.message);

    if (jobId) {
      await supabase.from('enrich_import_jobs')
        .update({
          status: 'error',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
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

    // Launch background processing — EdgeRuntime.waitUntil keeps the worker
    // alive until processFile resolves, even after the HTTP response is sent.
    // This prevents gateway timeouts on large files (tens of thousands of rows).
    const processing = processFile(supabase, storagePath, fileType, jobId ?? null);
    // @ts-ignore — EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(processing);
    } else {
      // Local dev fallback: await normally (may be slower but correct)
      await processing;
    }

    // Return immediately so the client can start polling enrich_import_jobs
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
