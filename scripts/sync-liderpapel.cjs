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
    bucket: process.env.SUPABASE_BUCKET || 'liderpapel-sync',
  },
  remotePath: process.env.SFTP_REMOTE_PATH || '/',
  testOnly: process.env.TEST_ONLY === 'true',
  dryRun: process.env.DRY_RUN === 'true',
  includeEnrichment: process.env.INCLUDE_ENRICHMENT === 'true',
};

// Daily files: download JSON content and send to fetch-liderpapel-sftp
const DAILY_FILES = [
  { remote: 'Catalog.json', bodyKey: 'catalog_json' },
  { remote: 'Prices.json', bodyKey: 'prices_json' },
  { remote: 'Stocks.json', bodyKey: 'stocks_json' },
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
      const items = await sftp.list('/');
      log('info', `Root: ${items.length} items`);
      items.slice(0, 30).forEach(f =>
        log('info', `  ${f.type === 'd' ? '[DIR]' : '[FILE]'} ${f.name} (${f.size}b)`)
      );
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

    // ─── Download daily JSON files ───
    const fetchBody = {};
    for (const file of DAILY_FILES) {
      if (!remoteNames.has(file.remote)) {
        log('warn', `${file.remote} not found on SFTP`);
        results.errors.push(`${file.remote} not found`);
        continue;
      }
      try {
        log('info', `Downloading ${file.remote}...`);
        const buf = await sftp.get(`${config.remotePath}/${file.remote}`);
        const text = typeof buf === 'string' ? buf : buf.toString('utf-8');
        fetchBody[file.bodyKey] = JSON.parse(text);
        results.files[file.remote] = { size_mb: (text.length / 1048576).toFixed(1), status: 'ok' };
        log('info', `${file.remote}: ${(text.length / 1048576).toFixed(1)} MB`);
      } catch (err) {
        log('error', `Failed to download ${file.remote}`, { err: err.message });
        results.errors.push(`${file.remote}: ${err.message}`);
        results.files[file.remote] = { size_mb: '0', status: 'error' };
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

    // ─── Call fetch-liderpapel-sftp to import data into DB ───
    const supabaseUrl = config.supabase.url;
    const serviceKey = config.supabase.serviceRoleKey;
    const functionUrl = `${supabaseUrl}/functions/v1/fetch-liderpapel-sftp`;

    // Import categories first
    if (categoriesJson) {
      log('info', 'Importing categories...');
      const catResp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
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

    // Import daily files (Catalog + Prices + Stocks)
    const dailyKeys = Object.keys(fetchBody);
    if (dailyKeys.length > 0) {
      log('info', `Importing ${dailyKeys.length} daily file(s)...`);
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(fetchBody),
      });

      if (resp.ok) {
        const data = await resp.json();
        results.daily = data;
        log('info', 'Daily import done', {
          created: data.created || 0,
          updated: data.updated || 0,
          errors: data.errors || 0,
        });
      } else {
        const errText = await resp.text();
        log('error', 'Daily import failed', { status: resp.status, err: errText.substring(0, 200) });
        results.errors.push(`Daily import: ${errText.substring(0, 200)}`);
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
