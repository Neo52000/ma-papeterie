#!/usr/bin/env node
/**
 * sync-liderpapel-sftp.mjs
 * --------------------------
 * GitHub Actions script: downloads files from Liderpapel SFTP (via VPS tunnel),
 * uploads them to Supabase Storage, then triggers processing.
 */
import SftpClient from "ssh2-sftp-client";

/* -- Config -- */
const USE_TUNNEL    = process.env.USE_TUNNEL === "true";
const SFTP_HOST     = USE_TUNNEL ? "127.0.0.1" : (process.env.LIDERPAPEL_SFTP_HOST || "sftp.liderpapel.com");
const SFTP_PORT     = USE_TUNNEL ? parseInt(process.env.TUNNEL_PORT || "2222", 10) : parseInt(process.env.LIDERPAPEL_SFTP_PORT || "22", 10);
const SFTP_USER     = process.env.LIDERPAPEL_SFTP_USER;
const SFTP_PASSWORD = process.env.LIDERPAPEL_SFTP_PASSWORD;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SB_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_ONLY     = process.env.TEST_ONLY === "true";
const FROM_STORAGE  = process.env.FROM_STORAGE === "true";
const STORAGE_PATH  = process.env.STORAGE_PATH || "";

const CONNECT_TIMEOUT = 30_000;
const MAX_CONNECT_RETRIES = 4;
const RETRY_DELAY_MS      = 60_000; // 1 min between retries

/* SSH algorithms for Liderpapel's legacy SFTP server */
const SSH_ALGORITHMS = {
  serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519'],
  kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
  cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc'],
  hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
};

/* File prefixes to discover on the SFTP server */
const DAILY_PREFIXES = [
  { prefix: "Stocks",     key: "Stocks",     type: "daily" },
  { prefix: "Prices",     key: "Prices",     type: "daily" },
  { prefix: "Catalog",    key: "Catalog",    type: "daily" },
  { prefix: "Categories", key: "Categories", type: "daily" },
];

const ENRICH_PREFIXES = [
  { prefix: "Descriptions",       key: "Descriptions",       type: "enrichment" },
  { prefix: "MultimediaLinks",    key: "MultimediaLinks",    type: "enrichment" },
  { prefix: "RelationedProducts", key: "RelationedProducts", type: "enrichment" },
];

/* -- Helpers -- */
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sftpConnect(label = "default") {
  for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    try {
      const sftp = new SftpClient();
      log(`  SFTP connect attempt ${attempt}/${MAX_CONNECT_RETRIES} [${label}] to ${SFTP_HOST}:${SFTP_PORT}...`);
      await sftp.connect({
        host: SFTP_HOST,
        port: SFTP_PORT,
        username: SFTP_USER,
        password: SFTP_PASSWORD,
        readyTimeout: CONNECT_TIMEOUT,
        retries: 2,
        retry_minTimeout: 3000,
        algorithms: SSH_ALGORITHMS,
      });
      log(`  Connected on attempt ${attempt}`);
      return sftp;
    } catch (err) {
      log(`  Attempt ${attempt} failed: ${err.message}`);
      // Non-recoverable errors: don't retry
      if (/authentication.*fail/i.test(err.message) || /ENOTFOUND/i.test(err.message)) {
        throw new Error(`SFTP connection failed (non-recoverable): ${err.message}`);
      }
      if (attempt < MAX_CONNECT_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // linear backoff: 1min, 2min, 3min
        log(`  Waiting ${delay / 1000}s before retry...`);
        await sleep(delay);
      } else {
        throw new Error(`SFTP connection failed after ${MAX_CONNECT_RETRIES} attempts: ${err.message}`);
      }
    }
  }
}

/**
 * Find the best matching remote file for a given prefix.
 * Liderpapel files follow patterns like: Catalog_fr_FR_3321289.json or Catalog.xml
 */
function findRemoteFile(fileList, prefix) {
  // Prefer JSON files, fallback to XML
  const jsonMatch = fileList.find(f => f.name.startsWith(prefix) && f.name.endsWith('.json'));
  if (jsonMatch) return jsonMatch;
  const xmlMatch = fileList.find(f => f.name.startsWith(prefix) && f.name.endsWith('.xml'));
  return xmlMatch || null;
}

async function downloadFile(sftp, remotePath) {
  log(`  Downloading ${remotePath}...`);
  const start = Date.now();
  const buffer = await sftp.get(remotePath);
  const elapsed = Date.now() - start;
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  log(`  Downloaded ${sizeMB} MB in ${elapsed}ms`);
  return buffer;
}

async function sendToSupabase(fileBuffer, fileName, fileType) {
  // Upload to Supabase Storage bucket "liderpapel-sftp"
  const storagePath = `imports/${new Date().toISOString().slice(0, 10)}/${fileName}`;
  log(`  Uploading to storage: ${storagePath}`);

  const contentType = fileName.endsWith('.json') ? "application/json" : "application/xml";

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/liderpapel-sftp/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: fileBuffer,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Storage upload failed (${uploadRes.status}): ${err}`);
  }
  log(`  Storage upload OK`);

  // Trigger the fetch-liderpapel-sftp edge function for daily files
  if (fileType === "daily") {
    log(`  Triggering fetch-liderpapel-sftp for ${fileName}...`);
    const triggerRes = await fetch(
      `${SUPABASE_URL}/functions/v1/fetch-liderpapel-sftp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          storagePath: `liderpapel-sftp/${storagePath}`,
          source: "github-actions",
        }),
      }
    );
    const triggerBody = await triggerRes.text();
    log(`  Edge function response (${triggerRes.status}): ${triggerBody.slice(0, 500)}`);
  }

  // For enrichment files, create an enrich_import_job
  if (fileType === "enrichment") {
    log(`  Creating enrich_import_job for ${fileName}...`);
    const fileTypeKey = fileName.replace(/\.(xml|json)$/i, "").replace(/_fr.*/, "").toLowerCase();
    const jobRes = await fetch(
      `${SUPABASE_URL}/rest/v1/enrich_import_jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SB_KEY}`,
          apikey: SB_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          supplier: "liderpapel",
          file_type: fileTypeKey,
          storage_path: `liderpapel-sftp/${storagePath}`,
          status: "pending",
        }),
      }
    );
    if (!jobRes.ok) {
      const err = await jobRes.text();
      log(`  WARNING: enrich job insert failed (${jobRes.status}): ${err}`);
    } else {
      log(`  Enrich job created`);
    }
  }
}

async function logResult(jobName, status, result, errorMessage = null) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/cron_job_logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SB_KEY}`,
        apikey: SB_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        job_name: jobName,
        status,
        result,
        error_message: errorMessage,
      }),
    });
  } catch (e) {
    log(`WARNING: failed to log result: ${e.message}`);
  }
}

/* -- Main -- */
async function main() {
  log("=== Liderpapel SFTP Sync (GitHub Actions) ===");
  log(`  Tunnel: ${USE_TUNNEL} | Host: ${SFTP_HOST}:${SFTP_PORT}`);

  if (!SUPABASE_URL || !SB_KEY) {
    throw new Error("Supabase credentials missing");
  }

  // FROM_STORAGE mode: skip SFTP entirely, trigger processing from existing Storage files
  if (FROM_STORAGE) {
    log("FROM_STORAGE mode — skipping SFTP download");
    // TODO: implement storage-based reprocessing
    await logResult("sync-liderpapel-sftp", "success", {
      mode: "from_storage",
      storage_path: STORAGE_PATH,
      runtime: "github-actions",
    });
    return;
  }

  if (!SFTP_USER || !SFTP_PASSWORD) {
    throw new Error("SFTP credentials missing");
  }

  // Connect and list remote files
  log(`Connecting to ${SFTP_HOST}:${SFTP_PORT}...`);
  let sftp = await sftpConnect("initial");
  log("Connected!");

  const files = await sftp.list("/download");
  log(`Found ${files.length} files in /download:`);
  for (const f of files) {
    log(`  ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  await sftp.end();

  if (TEST_ONLY) {
    log("TEST_ONLY mode -- stopping after connection test");
    await logResult("sync-liderpapel-sftp", "success", {
      mode: "testConnection",
      runtime: "github-actions",
      tunnel: USE_TUNNEL,
      files_found: files.length,
      file_names: files.map(f => f.name),
    });
    return;
  }

  // Download daily files (fresh connection per file for stability)
  const results = { daily: {}, enrichment: {}, errors: [], files_downloaded: {} };

  for (const fileDef of DAILY_PREFIXES) {
    const match = findRemoteFile(files, fileDef.prefix);
    if (!match) {
      log(`  WARNING: No ${fileDef.prefix}* file found in /download`);
      results.errors.push(`${fileDef.prefix}: file not found`);
      results.daily[fileDef.key] = { status: "not_found" };
      continue;
    }
    try {
      sftp = await sftpConnect(`daily:${fileDef.key}`);
      const buffer = await downloadFile(sftp, `/download/${match.name}`);
      await sftp.end();
      await sendToSupabase(buffer, match.name, fileDef.type);
      results.daily[fileDef.key] = { size: buffer.length, fileName: match.name, status: "ok" };
      results.files_downloaded[match.name] = { size_mb: (buffer.length / 1024 / 1024).toFixed(1), status: "ok" };
    } catch (err) {
      log(`  ERROR on ${fileDef.key}: ${err.message}`);
      results.errors.push(`${fileDef.key}: ${err.message}`);
      results.daily[fileDef.key] = { status: "error", error: err.message };
      try { await sftp.end(); } catch {}
    }
  }

  // Download enrichment files (optional -- don't fail the whole sync)
  for (const fileDef of ENRICH_PREFIXES) {
    const match = findRemoteFile(files, fileDef.prefix);
    if (!match) {
      log(`  INFO: No ${fileDef.prefix}* enrichment file found`);
      results.enrichment[fileDef.key] = { status: "not_found" };
      continue;
    }
    try {
      sftp = await sftpConnect(`enrich:${fileDef.key}`);
      const buffer = await downloadFile(sftp, `/download/${match.name}`);
      await sftp.end();
      await sendToSupabase(buffer, match.name, fileDef.type);
      results.enrichment[fileDef.key] = { size: buffer.length, fileName: match.name, status: "ok" };
      results.files_downloaded[match.name] = { size_mb: (buffer.length / 1024 / 1024).toFixed(1), status: "ok" };
    } catch (err) {
      log(`  WARN enrichment ${fileDef.key}: ${err.message}`);
      results.enrichment[fileDef.key] = { status: "skipped", error: err.message };
      try { await sftp.end(); } catch {}
    }
  }

  // Log results
  const hasErrors = results.errors.length > 0;
  const status = hasErrors ? "partial" : "success";
  log(`\n=== Sync complete: ${status} ===`);
  log(JSON.stringify(results, null, 2));

  await logResult("sync-liderpapel-sftp", status, {
    ...results,
    runtime: "github-actions",
    tunnel: USE_TUNNEL,
    version: 3,
  }, hasErrors ? results.errors.join("; ") : null);

  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  logResult("sync-liderpapel-sftp", "error", {
    fatal: err.message,
    runtime: "github-actions",
    tunnel: USE_TUNNEL,
  }, err.message).finally(() => {
    process.exit(1);
  });
});
