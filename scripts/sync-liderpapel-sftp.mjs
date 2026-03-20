#!/usr/bin/env node
/**
 * sync-liderpapel-sftp.mjs
 * --------------------------
 * GitHub Actions script: downloads files from Liderpapel SFTP,
 * uploads them to Supabase Storage, then triggers processing.
 *
 * Runs on GitHub Actions (Azure runners) which can reach sftp.liderpapel.com
 * unlike Netlify/AWS Lambda which gets ETIMEDOUT.
 */
import SftpClient from "ssh2-sftp-client";

/* -- Config -- */
const SFTP_HOST     = process.env.LIDERPAPEL_SFTP_HOST || "sftp.liderpapel.com";
const SFTP_PORT     = parseInt(process.env.LIDERPAPEL_SFTP_PORT || "22", 10);
const SFTP_USER     = process.env.LIDERPAPEL_SFTP_USER;
const SFTP_PASSWORD = process.env.LIDERPAPEL_SFTP_PASSWORD;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SB_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_ONLY     = process.env.TEST_ONLY === "true";

const CONNECT_TIMEOUT = 30_000;
const DL_TIMEOUT      = 300_000; // 5 min per file
const MAX_CONNECT_RETRIES = 4;
const RETRY_DELAY_MS      = 60_000; // 1 min between retries

/* Files to download -> maps to edge function expectations */
const DAILY_FILES = [
  { remote: "/download/Stocks.xml",      key: "Stocks",     type: "daily" },
  { remote: "/download/Prices.xml",      key: "Prices",     type: "daily" },
  { remote: "/download/Catalog.xml",     key: "Catalog",    type: "daily" },
  { remote: "/download/Categories.xml",  key: "Categories", type: "daily" },
];

const ENRICH_FILES = [
  { remote: "/download/Descriptions.xml",       key: "Descriptions",       type: "enrichment" },
  { remote: "/download/MultimediaLinks.xml",    key: "MultimediaLinks",    type: "enrichment" },
  { remote: "/download/RelationedProducts.xml", key: "RelationedProducts", type: "enrichment" },
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
      log(`  SFTP connect attempt ${attempt}/${MAX_CONNECT_RETRIES} [${label}]...`);
      await sftp.connect({
        host: SFTP_HOST,
        port: SFTP_PORT,
        username: SFTP_USER,
        password: SFTP_PASSWORD,
        readyTimeout: CONNECT_TIMEOUT,
        retries: 2,
        retry_minTimeout: 3000,
      });
      log(`  Connected on attempt ${attempt}`);
      return sftp;
    } catch (err) {
      log(`  Attempt ${attempt} failed: ${err.message}`);
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

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/liderpapel-sftp/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/xml",
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
          file_type: fileName.replace(".xml", "").toLowerCase(),
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

  if (!SFTP_USER || !SFTP_PASSWORD) {
    throw new Error("SFTP credentials missing");
  }
  if (!SUPABASE_URL || !SB_KEY) {
    throw new Error("Supabase credentials missing");
  }

  // Test connection (with retry -- SFTP server unreliable at night)
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
      files_found: files.length,
    });
    return;
  }

  // Download daily files
  const results = { daily: {}, enrichment: {}, errors: [] };

  for (const file of DAILY_FILES) {
    try {
      sftp = await sftpConnect(`daily:${file.key}`);
      const buffer = await downloadFile(sftp, file.remote);
      await sftp.end();
      await sendToSupabase(buffer, `${file.key}.xml`, file.type);
      results.daily[file.key] = { size: buffer.length, status: "ok" };
    } catch (err) {
      log(`  ERROR on ${file.key}: ${err.message}`);
      results.errors.push(`${file.key}: ${err.message}`);
      results.daily[file.key] = { status: "error", error: err.message };
      try { await sftp.end(); } catch {}
    }
  }

  // Download enrichment files (optional -- don't fail the whole sync)
  for (const file of ENRICH_FILES) {
    try {
      sftp = await sftpConnect(`enrich:${file.key}`);
      const buffer = await downloadFile(sftp, file.remote);
      await sftp.end();
      await sendToSupabase(buffer, `${file.key}.xml`, file.type);
      results.enrichment[file.key] = { size: buffer.length, status: "ok" };
    } catch (err) {
      log(`  WARN enrichment ${file.key}: ${err.message}`);
      results.enrichment[file.key] = { status: "skipped", error: err.message };
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
    version: 2,
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
  }, err.message).finally(() => {
    process.exit(1);
  });
});
