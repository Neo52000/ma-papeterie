#!/usr/bin/env node
const SftpClient = require('ssh2-sftp-client');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ─── Configuration ─────────────────────────────────────────────────────────

const config = {
  sftp: {
    host: process.env.USE_TUNNEL === 'true' ? '127.0.0.1' : process.env.LIDERPAPEL_SFTP_HOST,
    port: process.env.USE_TUNNEL === 'true' ? parseInt(process.env.TUNNEL_PORT || '2222') : 22,
    username: process.env.LIDERPAPEL_SFTP_USER,
    password: process.env.LIDERPAPEL_SFTP_PASSWORD,
    readyTimeout: 30000, retries: 3, retry_minTimeout: 2000,
    algorithms: {
      serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519'],
      kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
      cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc'],
      hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
    },
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    apiCronSecret: process.env.API_CRON_SECRET,
    bucket: process.env.SUPABASE_BUCKET || 'liderpapel-sync',
  },
  remotePath: process.env.SFTP_REMOTE_PATH || '/download',
  testOnly: process.env.TEST_ONLY === 'true',
  dryRun: process.env.DRY_RUN === 'true',
  includeEnrichment: process.env.INCLUDE_ENRICHMENT === 'true',
};

// Daily files: match by prefix (actual names are like Catalog_fr_FR_***.json)
const DAILY_FILES = [
  { prefix: 'Catalog_fr', bodyKey: 'catalog_json' },
  { prefix: 'Prices_fr', bodyKey: 'prices_json' },
  { prefix: 'Stocks_fr', bodyKey: 'stocks_json' },
];

// Enrichment files: large files uploaded to Storage for background processing
const ENRICH_FILES = [
  { remotePrefix: 'Descriptions_fr', fileType: 'descriptions_json' },
  { remotePrefix: 'MultimediaLinks_fr', fileType: 'multimedia_json' },
  { remotePrefix: 'RelationedProducts_fr', fileType: 'relations_json' },
];

const log = (lvl, msg, d = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), lvl, msg, ...d }));

// ─── Main pipeline ─────────────────────────────────────────────────────────

async function main() {
  log('info', '=== Liderpapel SFTP Sync ===', {
    host: config.sftp.host,
    port: config.sftp.port,
    tunnel: process.env.USE_TUNNEL === 'true',
    test: config.testOnly,
    dryRun: config.dryRun,
    enrichment: config.includeEnrichment,
  });

  const sftp = new SftpClient();
  const results = { daily: null, enrichment: null, errors: [], files: {} };

  try {
    // ─── Connect ───
    await sftp.connect(config.sftp);
    log('info', 'SFTP connected');

    // ─── Test-only mode ───
    if (config.testOnly) {
      const dirs = ['/', '/download', '/upload', '/Manuel'];
      for (const dir of dirs) {
        try {
          const items = await sftp.list(dir);
          log('info', `${dir}: ${items.length} items`);
          items.slice(0, 30).forEach(f =>
            log('info', `  ${f.type === 'd' ? '[DIR]' : '[FILE]'} ${f.name} (${f.size}b)`)
          );
        } catch (e) {
          log('warn', `Cannot list ${dir}: ${e.message}`);
        }
      }
      await sftp.end();
      log('info', '=== Test OK ===');
      return;
    }

    // ─── List remote files ───
    const fileList = await sftp.list(config.remotePath);
    const remoteNames = new Set(fileList.map(f => f.name));
    log('info', `Found ${fileList.length} files in ${config.remotePath}`);

    // ─── Download Categories first (needed before products) ───
    const catFile = fileList.find(f => f.name === 'Categories.json' || f.name.startsWith('Categories_fr'));
    let categoriesJson = null;
    if (catFile) {
      log('info', `Downloading ${catFile.name}...`);
      const buf = await sftp.get(`${config.remotePath}/${catFile.name}`);
      const text = typeof buf === 'string' ? buf : buf.toString('utf-8');
      categoriesJson = JSON.parse(text);
      log('info', `Categories: ${text.length} bytes`);
      results.files[catFile.name] = { size_mb: (text.length / 1048576).toFixed(1), status: 'ok' };
    }

    // ─── Download daily JSON files (match by prefix) ───
    const fetchBody = {};
    for (const file of DAILY_FILES) {
      const match = fileList.find(f => f.name.startsWith(file.prefix) && f.name.endsWith('.json'));
      if (!match) {
        log('warn', `No ${file.prefix}*.json found on SFTP`);
        results.errors.push(`${file.prefix}*.json not found`);
        continue;
      }
      try {
        log('info', `Downloading ${match.name} (${(match.size / 1048576).toFixed(1)} MB)...`);
        const buf = await sftp.get(`${config.remotePath}/${match.name}`);
        const text = typeof buf === 'string' ? buf : buf.toString('utf-8');
        fetchBody[file.bodyKey] = JSON.parse(text);
        results.files[match.name] = { size_mb: (text.length / 1048576).toFixed(1), status: 'ok' };
        log('info', `${match.name}: ${(text.length / 1048576).toFixed(1)} MB`);
      } catch (err) {
        log('error', `Failed to download ${match.name}`, { err: err.message });
        results.errors.push(`${match.name}: ${err.message}`);
        results.files[match.name] = { size_mb: '0', status: 'error' };
      }
    }

    // ─── Download enrichment files (if requested) ───
    if (config.includeEnrichment) {
      const sb = createClient(config.supabase.url, config.supabase.serviceRoleKey);
      for (const file of ENRICH_FILES) {
        const stat = fileList.find(f => f.name.startsWith(file.remotePrefix) && f.name.endsWith('.json'));
        if (!stat) {
          log('warn', `No ${file.remotePrefix}*.json found`);
          continue;
        }
        try {
          log('info', `Downloading ${stat.name} (${(stat.size / 1048576).toFixed(0)} MB)...`);
          const buf = await sftp.get(`${config.remotePath}/${stat.name}`);
          const blob = typeof buf === 'string' ? Buffer.from(buf, 'utf-8') : buf;
          const storagePath = `sftp-sync-${Date.now()}-${stat.name}`;

          // Upload to Supabase Storage
          const { error: upErr } = await sb.storage
            .from('liderpapel-enrichment')
            .upload(storagePath, blob, { contentType: 'application/json', upsert: true });
          if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

          // Create enrichment job
          const { error: jobErr } = await sb.from('enrich_import_jobs').insert({
            storage_path: storagePath,
            file_type: file.fileType,
            file_name: stat.name,
            status: 'pending',
          });
          if (jobErr) log('warn', `Job insert warning: ${jobErr.message}`);

          results.files[stat.name] = { size_mb: (blob.length / 1048576).toFixed(1), status: 'ok' };
          log('info', `Enrichment file ${stat.name} uploaded and job created`);
        } catch (err) {
          log('error', `Enrichment ${stat.name} failed`, { err: err.message });
          results.errors.push(`${stat.name}: ${err.message}`);
        }
      }
      results.enrichment = { status: 'jobs_created' };
    }

    // ─── Close SFTP ───
    await sftp.end();
    log('info', 'SFTP disconnected');

    // ─── Dry-run: stop here ───
    if (config.dryRun) {
      log('info', '=== DRY RUN — skipping import ===', results);
      return;
    }

    // ─── Parse JSON and call import-comlandi directly (bypass fetch-liderpapel-sftp) ───
    const supabaseUrl = config.supabase.url;
    const serviceKey = config.supabase.serviceRoleKey;
    const importComlandiUrl = `${supabaseUrl}/functions/v1/import-comlandi`;
    const importHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    };

    // Helper: navigate into Liderpapel JSON wrapper
    // Structure: { root: { Products: [{ supplierCode, date, Product: [...] }] } }
    function resolveRoot(json) {
      if (!json || typeof json !== 'object') return json;
      if (json.root) return json.root;
      const keys = Object.keys(json);
      if (keys.length === 1 && typeof json[keys[0]] === 'object' && !Array.isArray(json[keys[0]])) {
        return json[keys[0]];
      }
      return json;
    }

    function extractProducts(json, containerKey) {
      const root = resolveRoot(json);
      const container = root?.[containerKey] || root?.[containerKey.toLowerCase()] || [];
      // Liderpapel: [{ supplierCode, date, Product: [...] }]
      if (Array.isArray(container) && container.length > 0 && container[0]?.Product) {
        const inner = container[0].Product;
        return Array.isArray(inner) ? inner : [inner];
      }
      if (Array.isArray(container)) return container;
      const products = container?.Product || container?.product || [];
      return Array.isArray(products) ? products : products ? [products] : [];
    }

    // ─── Import categories directly via Supabase client ───
    if (categoriesJson) {
      const sb = createClient(supabaseUrl, serviceKey);
      const catRoot = resolveRoot(categoriesJson);
      const cats = catRoot?.Categories || catRoot?.categories || [];
      const catArray = Array.isArray(cats) ? cats : (cats?.Category ? (Array.isArray(cats.Category) ? cats.Category : [cats.Category]) : []);
      log('info', `Categories parsed: ${catArray.length}`);

      let catCreated = 0, catUpdated = 0;
      for (const c of catArray) {
        const code = String(c.code || c.Code || '');
        if (!code) continue;
        const texts = c.Texts || c.texts || [];
        const textList = Array.isArray(texts) ? texts : [texts];
        const frText = textList.find(t => (t.lang || '').startsWith('fr')) || textList[0] || {};
        const name = frText.value || frText.Value || c.name || c.Name || c.label || '';
        const level = String(c.level || c.Level || '1');
        const slug = `liderpapel-${code}`;

        const { data: existing } = await sb.from('categories').select('id').eq('slug', slug).maybeSingle();
        if (existing) {
          await sb.from('categories').update({ name, level, updated_at: new Date().toISOString() }).eq('id', existing.id);
          catUpdated++;
        } else {
          await sb.from('categories').insert({ name, slug, level, is_active: true });
          catCreated++;
        }
      }
      log('info', `Categories imported: ${catCreated} created, ${catUpdated} updated`);
      results.categories = { total: catArray.length, created: catCreated, updated: catUpdated };
    }

    // Parse catalog
    const catalogMap = new Map();
    if (fetchBody.catalog_json) {
      const products = extractProducts(fetchBody.catalog_json, 'Products');
      log('info', `Catalog parsed: ${products.length} products`);
      for (const p of products) {
        const id = String(p.id || p.ID || p.ownReference || '');
        if (!id) continue;
        let ean = '';
        const refs = p.References?.Reference || [];
        const refList = Array.isArray(refs) ? refs : [refs];
        for (const ref of refList) {
          const code = ref.refCode || ref.RefCode || '';
          const val = ref.value || ref.Value || '';
          if (code === 'EAN_UMV' || code === 'EAN_UNITARIO' || code === 'EAN_UNIDAD') { if (!ean) ean = val; }
        }
        let family = '', subfamily = '';
        const classifs = p.Classifications?.Classification || [];
        const classifList = Array.isArray(classifs) ? classifs : [classifs];
        for (const c of classifList) {
          const level = c.level || c.Level || '';
          const name = c.name || c.Name || '';
          if (level === '1' || level === 'family') family = name;
          if (level === '2' || level === 'subfamily') subfamily = name;
        }
        const addInfo = p.AdditionalInfo || {};
        catalogMap.set(id, {
          reference: id, family, subfamily, ean,
          description: addInfo.Description || addInfo.description || addInfo.INT_VTE || addInfo.MINI_DESC || '',
          brand: String(addInfo.Brand || addInfo.brand || addInfo.Marca || ''),
          weight_kg: String(p.Weight || addInfo.Weight || ''),
          country_origin: String(p.CountryOfOrigin || ''),
          customs_code: String(p.CustomsCode || ''),
          is_active: String(p.Validity ?? '1') === '0' ? '0' : '1',
        });
      }
    }

    // Parse prices
    const priceMap = new Map();
    if (fetchBody.prices_json) {
      const products = extractProducts(fetchBody.prices_json, 'Products');
      log('info', `Prices parsed: ${products.length} products`);
      for (const p of products) {
        const id = String(p.id || p.ID || p.ownReference || '');
        if (!id) continue;
        const prices = p.Prices?.Price || [];
        const priceList = Array.isArray(prices) ? prices : [prices];
        let costPrice = '', suggestedPrice = '', tvaRate = '';
        for (const pr of priceList) {
          const lines = pr.PriceLines?.PriceLine || [];
          const lineList = Array.isArray(lines) ? lines : [lines];
          for (const line of lineList) {
            if (!costPrice && line.PriceExcTax) costPrice = String(line.PriceExcTax);
          }
          if (!suggestedPrice && pr.PVP) suggestedPrice = String(pr.PVP);
          const taxes = pr.AddTaxes?.AddTax || [];
          const taxList = Array.isArray(taxes) ? taxes : [taxes];
          for (const tax of taxList) {
            if ((tax.taxCode === 'TVA' || tax.taxCode === 'IVA') && !tvaRate) tvaRate = String(tax.value || '');
          }
        }
        priceMap.set(id, { reference: id, cost_price: costPrice, suggested_price: suggestedPrice, tva_rate: tvaRate });
      }
    }

    // Parse stocks — Liderpapel structure:
    // root.Storage = [{ supplierCode, date, Stocks: [{ code, name, Products: [{ Product: [...items...] }] }] }]
    const stockMap = new Map();
    if (fetchBody.stocks_json) {
      const root = resolveRoot(fetchBody.stocks_json);
      const storageContainer = root?.Storage || root?.Stockage || root?.storage || [];
      let stockProducts = [];

      if (Array.isArray(storageContainer) && storageContainer.length > 0) {
        const storageWrapper = storageContainer[0];
        const stockGroups = storageWrapper?.Stocks || storageWrapper?.Stock || [];
        const groupList = Array.isArray(stockGroups) ? stockGroups : [stockGroups];

        // Each group has { code, name, Products } — collect all products from all groups
        for (const group of groupList) {
          const prods = group?.Products || group?.Product || group?.products || [];
          // Products might be: array, or [{ Product: [...] }] wrapper, or direct items
          if (Array.isArray(prods)) {
            // Check if it's a wrapper like [{ supplierCode, Product: [...] }]
            if (prods.length > 0 && prods[0]?.Product) {
              const inner = prods[0].Product;
              stockProducts.push(...(Array.isArray(inner) ? inner : [inner]));
            } else {
              stockProducts.push(...prods);
            }
          } else if (prods?.Product) {
            const inner = prods.Product;
            stockProducts.push(...(Array.isArray(inner) ? inner : [inner]));
          }
        }
      }

      log('info', `Stocks parsed: ${stockProducts.length} items from ${fetchBody.stocks_json ? 'file' : 'none'}`);

      for (const p of stockProducts) {
        const id = String(p.id || p.ID || p.ownReference || '');
        if (!id) continue;
        const stock = p.Stock || p.stock || p;
        const qty = String(stock.AvailableQuantity ?? stock.availableQuantity ?? stock.Quantity ?? stock.quantity ?? '0');
        stockMap.set(id, { reference: id, stock_quantity: qty });
      }
    }

    // Merge all refs and build rows for import-comlandi
    const allRefs = new Set([...catalogMap.keys(), ...priceMap.keys()]);
    const mergedRows = [];
    for (const ref of allRefs) {
      const cat = catalogMap.get(ref) || {};
      const price = priceMap.get(ref) || {};
      const stock = stockMap.get(ref);
      mergedRows.push({
        reference: ref,
        description: cat.description || '',
        family: cat.family || '',
        subfamily: cat.subfamily || '',
        ean: cat.ean || '',
        brand: cat.brand || '',
        weight_kg: cat.weight_kg || '',
        country_origin: cat.country_origin || '',
        customs_code: cat.customs_code || '',
        is_active: cat.is_active || '1',
        cost_price: price.cost_price || '',
        suggested_price: price.suggested_price || '',
        tva_rate: price.tva_rate || '',
        stock_quantity: stock?.stock_quantity || '',
      });
    }

    log('info', `Merged ${mergedRows.length} products from ${catalogMap.size} catalog + ${priceMap.size} prices + ${stockMap.size} stocks`);

    if (mergedRows.length === 0) {
      log('warn', 'No products to import — mergedRows is empty');
      results.errors.push('No products parsed from JSON files');
    } else {
      // Send to import-comlandi in batches of 500
      const BATCH = 500;
      const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };
      for (let i = 0; i < mergedRows.length; i += BATCH) {
        const batch = mergedRows.slice(i, i + BATCH);
        const batchNum = Math.floor(i / BATCH) + 1;
        const totalBatches = Math.ceil(mergedRows.length / BATCH);
        try {
          const resp = await fetch(importComlandiUrl, {
            method: 'POST',
            headers: importHeaders,
            body: JSON.stringify({ source: 'liderpapel', rows: batch }),
          });
          if (resp.ok) {
            const data = await resp.json();
            totals.created += data.created || 0;
            totals.updated += data.updated || 0;
            totals.skipped += data.skipped || 0;
            totals.errors += data.errors || 0;
            if (batchNum % 5 === 0 || batchNum === totalBatches) {
              log('info', `Batch ${batchNum}/${totalBatches}`, totals);
            }
          } else {
            const errText = await resp.text();
            log('error', `Batch ${batchNum} failed`, { status: resp.status, err: errText.substring(0, 200) });
            totals.errors += batch.length;
          }
        } catch (err) {
          log('error', `Batch ${batchNum} error`, { err: err.message });
          totals.errors += batch.length;
        }
      }
      results.daily = totals;
      log('info', 'Import complete', totals);
    }

    // ─── Log result to cron_job_logs ───
    const sb = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    const status = results.errors.length > 0 ? 'partial' : 'success';
    await sb.from('cron_job_logs').insert({
      job_name: 'sync-liderpapel-sftp',
      status,
      result: results,
      duration_ms: Date.now() - startTime,
      executed_at: new Date(startTime).toISOString(),
    }).then(() => log('info', 'Cron result logged'))
      .catch(err => log('warn', 'Failed to log cron result', { err: err.message }));

    log('info', '=== Done ===', { status, errors: results.errors.length });
    if (results.errors.length > 0) process.exit(1);

  } catch (err) {
    log('error', 'Fatal', { err: err.message });
    try { await sftp.end(); } catch (_) {}
    process.exit(1);
  }
}

const startTime = Date.now();
main();
