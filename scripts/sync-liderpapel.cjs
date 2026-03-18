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

    // ─── Debug: log JSON structure of each file ───
    if (categoriesJson) {
      const cj = typeof categoriesJson === 'object' ? categoriesJson : JSON.parse(categoriesJson);
      log('info', 'Categories JSON structure', { type: typeof cj, topKeys: Object.keys(cj).slice(0, 10), isArray: Array.isArray(cj) });
      if (cj.root) log('info', 'Categories root keys', { keys: Object.keys(cj.root).slice(0, 10) });
    }
    for (const [key, val] of Object.entries(fetchBody)) {
      const obj = typeof val === 'object' ? val : JSON.parse(val);
      log('info', `${key} JSON structure`, { type: typeof obj, topKeys: Object.keys(obj).slice(0, 10), isArray: Array.isArray(obj) });
      if (obj.root) log('info', `${key} root keys`, { keys: Object.keys(obj.root).slice(0, 10) });
      // Log first product structure if available
      const products = obj?.root?.Products?.Product || obj?.Products?.Product || obj?.root?.products?.product;
      if (products) {
        const first = Array.isArray(products) ? products[0] : products;
        log('info', `${key} first product keys`, { keys: first ? Object.keys(first).slice(0, 15) : 'none', count: Array.isArray(products) ? products.length : 1 });
      } else {
        log('info', `${key} NO Products.Product found — checking alternatives`, {
          hasRoot: !!obj.root,
          rootKeys: obj.root ? Object.keys(obj.root).slice(0, 10) : [],
          directKeys: Object.keys(obj).slice(0, 10)
        });
      }
    }

    // ─── Dry-run: stop here ───
    if (config.dryRun) {
      log('info', '=== DRY RUN — skipping import ===', results);
      return;
    }

    // ─── Call fetch-liderpapel-sftp to import data into DB ───
    const supabaseUrl = config.supabase.url;
    const serviceKey = config.supabase.serviceRoleKey;
    const apiCronSecret = config.supabase.apiCronSecret;
    const functionUrl = `${supabaseUrl}/functions/v1/fetch-liderpapel-sftp`;
    const importHeaders = {
      'Content-Type': 'application/json',
      ...(apiCronSecret ? { 'x-api-secret': apiCronSecret } : {}),
      ...(serviceKey ? { 'Authorization': `Bearer ${serviceKey}` } : {}),
    };

    // Import categories first
    if (categoriesJson) {
      log('info', 'Importing categories...');
      const catResp = await fetch(functionUrl, {
        method: 'POST',
        headers: importHeaders,
        body: JSON.stringify({ categories_json: categoriesJson }),
      });
      if (catResp.ok) {
        const catData = await catResp.json();
        log('info', 'Categories imported', { total: catData.categories?.total || 0 });
      } else {
        const errText = await catResp.text();
        log('error', 'Categories import failed', { status: catResp.status, err: errText.substring(0, 200) });
        results.errors.push(`Categories import: ${errText.substring(0, 200)}`);
      }
    }

    // Import daily files ONE BY ONE to avoid Edge Function timeout
    const dailyKeys = Object.keys(fetchBody);
    if (dailyKeys.length > 0) {
      for (const key of dailyKeys) {
        const label = key.replace('_json', '');
        const payload = { [key]: fetchBody[key] };
        const bodySize = JSON.stringify(payload).length;
        log('info', `Importing ${label} (${(bodySize / 1048576).toFixed(1)} MB)...`);
        try {
          const resp = await fetch(functionUrl, {
            method: 'POST',
            headers: importHeaders,
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            const data = await resp.json();
            log('info', `${label} import done`, {
              created: data.created || 0,
              updated: data.updated || 0,
              errors: data.errors || 0,
            });
            results.daily = results.daily || {};
            results.daily[label] = data;
          } else {
            const errText = await resp.text();
            log('error', `${label} import failed`, { status: resp.status, err: errText.substring(0, 200) });
            results.errors.push(`${label}: ${errText.substring(0, 200)}`);
          }
        } catch (err) {
          log('error', `${label} import error`, { err: err.message });
          results.errors.push(`${label}: ${err.message}`);
        }
      }
    } else {
      log('warn', 'No daily files downloaded — skipping import');
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
