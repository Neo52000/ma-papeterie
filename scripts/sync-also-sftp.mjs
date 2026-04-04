#!/usr/bin/env node
/**
 * sync-also-sftp.mjs
 * -------------------
 * GitHub Actions script: downloads pricelist-1.txt.zip from ALSO SFTP,
 * unzips, parses the TXT (positional columns, semicolon-delimited),
 * and sends rows in chunks to the import-also Edge Function.
 */
import SftpClient from "ssh2-sftp-client";
import { unzipSync } from "fflate";

/* -- Config -- */
const SFTP_HOST     = process.env.ALSO_SFTP_HOST || "paco.also.com";
const SFTP_PORT     = parseInt(process.env.ALSO_SFTP_PORT || "22", 10);
const SFTP_USER     = process.env.ALSO_SFTP_USER;
const SFTP_PASSWORD = process.env.ALSO_SFTP_PASSWORD;
const SFTP_PATH     = process.env.ALSO_SFTP_PATH || "/";
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SB_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_SECRET    = process.env.API_CRON_SECRET || "";
const TEST_ONLY     = process.env.TEST_ONLY === "true";
const IMPORT_MODE   = process.env.IMPORT_MODE || "enrich";

const TARGET_FILE   = "pricelist-1.txt.zip";
const CHUNK_ROWS    = 2000;
const CONNECT_TIMEOUT = 30_000;

/* Positional columns (no header row) */
const ALSO_COLUMNS = [
  'article_number', 'manufacturer_ref', 'manufacturer', 'ean',
  'description', 'stock', 'price', 'rrp_ht',
  'category_1', 'category_2', 'category_3', 'deee_flag',
  'weight', 'available_stock', 'tva_rate', 'tva_amount',
];

/* -- Helpers -- */
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function parseTxtToRows(text) {
  const clean = text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  log(`Parsing ${lines.length} rows (positional, semicolon-delimited)`);

  return lines.map(line => {
    const vals = line.split(';');
    const obj = {};
    ALSO_COLUMNS.forEach((col, i) => {
      obj[col] = (vals[i] || '').trim();
    });
    return obj;
  });
}

function decodeText(data) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    return text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
  } catch {
    return new TextDecoder('iso-8859-1').decode(data);
  }
}

async function postChunk(rows, mode, chunkIdx) {
  const url = `${SUPABASE_URL}/functions/v1/import-also`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SB_KEY}`,
      'x-api-secret': API_SECRET,
    },
    body: JSON.stringify({ rows, mode }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Chunk ${chunkIdx}: HTTP ${resp.status} — ${errText.substring(0, 300)}`);
  }

  return resp.json();
}

/* -- Main -- */
async function main() {
  if (!SFTP_USER || !SFTP_PASSWORD) {
    log("ERROR: ALSO_SFTP_USER and ALSO_SFTP_PASSWORD must be set");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SB_KEY) {
    log("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    process.exit(1);
  }

  const sftp = new SftpClient();
  const startedAt = Date.now();

  try {
    log(`Connecting to ${SFTP_HOST}:${SFTP_PORT}...`);
    await sftp.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      password: SFTP_PASSWORD,
      readyTimeout: CONNECT_TIMEOUT,
      retries: 2,
      retry_minTimeout: 5000,
    });
    log("Connected.");

    // List files
    const fileList = await sftp.list(SFTP_PATH);
    log(`Found ${fileList.length} file(s) in ${SFTP_PATH}`);
    for (const f of fileList) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      log(`  ${f.name} (${sizeMb} MB)`);
    }

    if (TEST_ONLY) {
      log("Test mode — disconnecting.");
      await sftp.end();
      log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
      return;
    }

    // Download ZIP
    const remotePath = SFTP_PATH === "/" ? TARGET_FILE : `${SFTP_PATH}/${TARGET_FILE}`;
    log(`Downloading ${remotePath}...`);
    const buffer = await sftp.get(remotePath);
    const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);
    log(`Downloaded ${TARGET_FILE} (${sizeMb} MB)`);

    await sftp.end();
    log("SFTP disconnected.");

    // Unzip
    log("Unzipping...");
    const zipData = new Uint8Array(buffer);
    const unzipped = unzipSync(zipData);

    const entries = Object.entries(unzipped);
    const txtEntry = entries.find(([name]) => /\.(txt|csv|tsv)$/i.test(name));
    const [fileName, fileData] = txtEntry || entries[0] || [];

    if (!fileData) {
      throw new Error("Archive ZIP vide — aucun fichier trouvé");
    }

    log(`Extracted: ${fileName} (${(fileData.length / 1024).toFixed(0)} KB)`);

    // Parse
    const text = decodeText(fileData);
    const rows = parseTxtToRows(text);
    log(`Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      log("WARNING: No rows to import");
      return;
    }

    // Send chunks to import-also
    const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };
    const totalChunks = Math.ceil(rows.length / CHUNK_ROWS);

    for (let i = 0; i < rows.length; i += CHUNK_ROWS) {
      const chunkIdx = Math.floor(i / CHUNK_ROWS) + 1;
      const chunk = rows.slice(i, i + CHUNK_ROWS);

      try {
        const data = await postChunk(chunk, IMPORT_MODE, chunkIdx);
        totals.created += data.created || 0;
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;

        if (chunkIdx % 10 === 0 || chunkIdx === totalChunks) {
          log(`Progress: ${chunkIdx}/${totalChunks} chunks — ${totals.created} created, ${totals.updated} updated, ${totals.errors} errors`);
        }
      } catch (err) {
        log(`ERROR chunk ${chunkIdx}: ${err.message}`);
        totals.errors += chunk.length;
      }
    }

    const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    log(`\nImport complete in ${durationSec}s:`);
    log(`  Created:  ${totals.created}`);
    log(`  Updated:  ${totals.updated}`);
    log(`  Skipped:  ${totals.skipped}`);
    log(`  Errors:   ${totals.errors}`);
    log(`  Total:    ${rows.length} rows, ${totalChunks} chunks`);

    if (totals.errors > 0) {
      process.exitCode = 1;
    }

  } catch (err) {
    log(`FATAL: ${err.message}`);
    try { await sftp.end(); } catch { /* ignore */ }
    process.exit(1);
  }
}

main();
