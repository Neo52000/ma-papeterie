#!/usr/bin/env node
/**
 * Sync Liderpapel SFTP -> Supabase
 * SSH tunnel mode via VPS for cloud environments blocked by SFTP firewall
 */
const SftpClient = require('ssh2-sftp-client');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const config = {
  sftp: {
    host: process.env.USE_TUNNEL === 'true' ? '127.0.0.1' : process.env.LIDERPAPEL_SFTP_HOST,
    port: process.env.USE_TUNNEL === 'true' ? parseInt(process.env.TUNNEL_PORT || '2222') : 22,
    username: process.env.LIDERPAPEL_SFTP_USER,
    password: process.env.LIDERPAPEL_SFTP_PASSWORD,
    readyTimeout: 30000,
    retries: 3,
    retry_minTimeout: 2000,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_BUCKET || 'liderpapel-sync',
  },
  remotePath: process.env.SFTP_REMOTE_PATH || '/',
  extensions: (process.env.FILE_EXTENSIONS || '.csv,.xml,.xlsx,.txt').split(','),
  testOnly: process.env.TEST_ONLY === 'true',
  dryRun: process.env.DRY_RUN === 'true',
};

const log = (lvl, msg, d = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), lvl, msg, ...d }));

async function ensureBucket(sb) {
  const { data } = await sb.storage.listBuckets();
  if (!data?.some(b => b.name === config.supabase.bucket)) {
    log('info', 'Creating bucket', { bucket: config.supabase.bucket });
    const { error } = await sb.storage.createBucket(config.supabase.bucket, { public: false });
    if (error && !error.message.includes('already exists')) throw error;
  }
}

async function listFiles(sftp) {
  const all = await sftp.list(config.remotePath);
  return all.filter(f =>
    f.type === '-' && config.extensions.includes(path.extname(f.name).toLowerCase())
  );
}

async function sync(sftp, sb, file) {
  const remote = path.posix.join(config.remotePath, file.name);
  const dest = `sync/${new Date().toISOString().split('T')[0]}/${file.name}`;
  log('info', 'Download', { name: file.name, size: file.size });
  const buf = await sftp.get(remote);
  if (config.dryRun) { log('info', 'DRY_RUN skip', { name: file.name }); return 'dry'; }
  const { error } = await sb.storage.from(config.supabase.bucket)
    .upload(dest, buf, { contentType: 'application/octet-stream', upsert: true });
  if (error) { log('error', 'Upload fail', { name: file.name, err: error.message }); return 'error'; }
  log('info', 'Uploaded', { name: file.name, dest, size: buf.length });
  return 'ok';
}

async function main() {
  log('info', '=== Liderpapel SFTP Sync ===', {
    host: config.sftp.host, port: config.sftp.port,
    tunnel: process.env.USE_TUNNEL === 'true', test: config.testOnly,
  });
  const sftp = new SftpClient();
  try {
    await sftp.connect(config.sftp);
    log('info', 'Connected');
    if (config.testOnly) {
      const items = await sftp.list('/');
      log('info', `Root: ${items.length} items`);
      items.slice(0, 20).forEach(f =>
        log('info', `  ${f.type === 'd' ? '[DIR]' : '[FILE]'} ${f.name} (${f.size}b)`)
      );
      await sftp.end();
      log('info', '=== Test OK ===');
      return;
    }
    const sb = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    await ensureBucket(sb);
    const files = await listFiles(sftp);
    log('info', `Found ${files.length} files`);
    let ok = 0, err = 0;
    for (const f of files) {
      try { const r = await sync(sftp, sb, f); r === 'error' ? err++ : ok++; }
      catch (e) { log('error', f.name, { err: e.message }); err++; }
    }
    await sftp.end();
    log('info', '=== Done ===', { ok, err });
    if (err > 0) process.exit(1);
  } catch (e) {
    log('error', 'Fatal', { err: e.message });
    try { await sftp.end(); } catch (_) {}
    process.exit(1);
  }
}
main();
