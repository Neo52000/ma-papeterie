// ─── SFTP sync for ALSO supplier (consommables) ─────────────────────────────
// Downloads pricelist-1.txt.zip from paco.also.com, unzips, parses the TXT,
// and sends rows in chunks to import-also.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ─── Helpers ───

function env(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

function log(msg: string) {
  console.log(`[sync-also-sftp] ${msg}`);
}

const CHUNK_ROWS = 2000;

/** Classify SFTP errors into actionable categories. */
function classifySftpError(err: any): { type: string; message: string } {
  const msg = String(err?.message ?? err);
  if (/unsupported algorithm/i.test(msg) || /unknown cipher/i.test(msg))
    return { type: "runtime_cipher_unsupported", message: msg };
  if (/no matching.*cipher/i.test(msg) || /handshake failed/i.test(msg))
    return { type: "no_common_cipher", message: msg };
  if (/authentication.*fail/i.test(msg) || /all configured.*failed/i.test(msg))
    return { type: "auth_failed", message: msg };
  if (/timeout/i.test(msg) || /timed?\s*out/i.test(msg))
    return { type: "timeout", message: msg };
  if (/ENOTFOUND|ECONNREFUSED|ENETUNREACH/i.test(msg))
    return { type: "network_error", message: msg };
  if (/no such file/i.test(msg))
    return { type: "file_not_found", message: msg };
  return { type: "unknown", message: msg };
}

/** Auto-detect delimiter from a header line */
function detectDelimiter(headerLine: string): string {
  const candidates = ['\t', ';', '|', ','];
  let bestDelim = '\t';
  let bestCount = 0;
  for (const delim of candidates) {
    const count = headerLine.split(delim).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelim = delim;
    }
  }
  return bestDelim;
}

/** Parse TXT content into row objects */
function parseTxtToRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(headerLine);
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  log(`Detected ${headers.length} columns, delimiter: ${JSON.stringify(delimiter)}, ${lines.length - 1} data rows`);

  return lines.slice(1).map(line => {
    const vals = line.split(delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] || '').trim().replace(/^"|"$/g, '');
    });
    return obj;
  });
}

// ─── Log result to cron_job_logs ───

async function logCronResult(
  supabase: any,
  status: string,
  result: any,
  startedAt: number,
) {
  try {
    await supabase.from("cron_job_logs").insert({
      job_name: "sync-also-sftp",
      status,
      result,
      duration_ms: Date.now() - startedAt,
      executed_at: new Date(startedAt).toISOString(),
    });
  } catch (err: any) {
    console.error("Failed to log cron result:", err.message);
  }
}

// ─── Main handler ───

Deno.serve(createHandler({
  name: "sync-also-sftp",
  auth: "admin-or-secret",
  rateLimit: { prefix: "sync-also-sftp", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const testOnly: boolean = (body as any)?.test_only === true;
  const startedAt = Date.now();

  // SFTP credentials from Supabase Secrets
  const sftpHost = env("ALSO_SFTP_HOST");
  const sftpUser = env("ALSO_SFTP_USER");
  const sftpPassword = env("ALSO_SFTP_PASSWORD");
  const sftpPath = env("ALSO_SFTP_PATH", "/");

  if (!sftpHost || !sftpUser || !sftpPassword) {
    const msg = "Identifiants SFTP manquants. Configurez ALSO_SFTP_HOST, ALSO_SFTP_USER et ALSO_SFTP_PASSWORD dans les secrets Supabase.";
    log(msg);
    await logCronResult(supabaseAdmin, "error", { error: msg }, startedAt);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sftpConfig = {
    host: sftpHost,
    port: 22,
    username: sftpUser,
    password: sftpPassword,
    readyTimeout: 10000,
    retries: 1,
  };

  let sftp: any = null;

  try {
    // Load SFTP client
    const SftpClient = (await import("npm:ssh2-sftp-client@11")).default;
    sftp = new SftpClient();
    sftp.on("error", (err: any) => {
      log(`SFTP error event (handled): ${err?.message ?? err}`);
    });

    log(`Connecting to ${sftpHost}...`);
    await Promise.race([
      sftp.connect(sftpConfig),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SFTP connection timeout (10s)")), 10000)
      ),
    ]);
    log("Connected.");

    // ── Test-only mode ──
    if (testOnly) {
      log("Test mode — listing files...");
      const fileList = await sftp.list(sftpPath);
      const files = fileList.map((f: any) => ({
        name: f.name,
        size: f.size,
        date: f.modifyTime,
        type: f.type === 'd' ? 'directory' : 'file',
      }));
      sftp.end();
      const durationMs = Date.now() - startedAt;
      return new Response(JSON.stringify({
        test_only: true,
        connected: true,
        host: sftpHost,
        path: sftpPath,
        file_list: files,
        duration_ms: durationMs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Download pricelist ZIP ──
    const targetFile = "pricelist-1.txt.zip";
    const remotePath = sftpPath === "/" ? targetFile : `${sftpPath}/${targetFile}`;

    log(`Downloading ${remotePath}...`);
    const buffer: Buffer = await sftp.get(remotePath);
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    log(`Downloaded ${targetFile} (${sizeMb} MB)`);

    sftp.end();

    // ── Unzip ──
    log("Unzipping...");
    const { unzipSync } = await import("npm:fflate@0.8");
    const zipData = new Uint8Array(buffer);
    const unzipped = unzipSync(zipData);

    // Find the first TXT/CSV file
    const entries = Object.entries(unzipped);
    const txtEntry = entries.find(([name]) => /\.(txt|csv|tsv)$/i.test(name));
    const [fileName, fileData] = txtEntry || entries[0] || [];

    if (!fileData) {
      throw new Error("Archive ZIP vide — aucun fichier trouvé");
    }

    log(`Extracted: ${fileName} (${(fileData.length / 1024).toFixed(0)} KB)`);

    // Decode text (try UTF-8, fallback to Latin-1)
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(fileData);
    } catch {
      text = new TextDecoder("iso-8859-1").decode(fileData);
    }
    // Remove BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

    // ── Parse TXT to rows ──
    const rows = parseTxtToRows(text);
    log(`Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      const msg = "Fichier tarif vide après parsing";
      await logCronResult(supabaseAdmin, "warning", { warning: msg }, startedAt);
      return new Response(JSON.stringify({ warning: msg, rows: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Send chunks to import-also ──
    const importUrl = `${env("SUPABASE_URL")}/functions/v1/import-also`;
    const totals = { created: 0, updated: 0, skipped: 0, errors: 0 };
    let chunkIdx = 0;

    for (let i = 0; i < rows.length; i += CHUNK_ROWS) {
      chunkIdx++;
      const chunk = rows.slice(i, i + CHUNK_ROWS);

      try {
        const resp = await fetch(importUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
            "x-api-secret": env("API_CRON_SECRET"),
          },
          body: JSON.stringify({ rows: chunk, mode: "enrich" }),
        });

        if (resp.ok) {
          const data = await resp.json();
          totals.created += data.created || 0;
          totals.updated += data.updated || 0;
          totals.skipped += data.skipped || 0;
          totals.errors += data.errors || 0;
        } else {
          const errText = await resp.text();
          totals.errors += chunk.length;
          log(`Chunk ${chunkIdx}: HTTP ${resp.status} — ${errText.substring(0, 200)}`);
        }
      } catch (err: any) {
        totals.errors += chunk.length;
        log(`Chunk ${chunkIdx}: ${err.message}`);
      }
    }

    log(`Import complete: ${totals.created} created, ${totals.updated} updated, ${totals.skipped} skipped, ${totals.errors} errors (${chunkIdx} chunks)`);

    const result = {
      file: targetFile,
      extracted: fileName,
      total_rows: rows.length,
      chunks: chunkIdx,
      import_result: totals,
      duration_ms: Date.now() - startedAt,
    };

    await logCronResult(supabaseAdmin, totals.errors > 0 ? "partial" : "success", result, startedAt);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    if (sftp) {
      try { sftp.end(); } catch (_) { /* ignore */ }
    }

    const classified = classifySftpError(err);
    let diagnostic = err.message;

    switch (classified.type) {
      case "auth_failed":
        diagnostic = `Authentification SFTP échouée. Vérifiez ALSO_SFTP_USER et ALSO_SFTP_PASSWORD.`;
        break;
      case "timeout":
        diagnostic = `Connexion SFTP timeout (10s). Vérifiez que ${sftpHost} est accessible.`;
        break;
      case "network_error":
        diagnostic = `Serveur SFTP inaccessible : ${sftpHost}. Vérifiez le nom d'hôte et le réseau.`;
        break;
      case "file_not_found":
        diagnostic = `Fichier introuvable sur le SFTP. Vérifiez ALSO_SFTP_PATH (actuel : "${sftpPath}").`;
        break;
      case "no_common_cipher":
      case "runtime_cipher_unsupported":
        diagnostic = `Négociation de chiffrement échouée avec ${sftpHost}. Mise à jour du client SFTP peut être nécessaire.`;
        break;
    }

    log(`Erreur fatale: ${diagnostic}`);
    await logCronResult(supabaseAdmin, "error", {
      error: diagnostic,
      error_type: classified.type,
    }, startedAt);

    return new Response(JSON.stringify({
      error: diagnostic,
      error_type: classified.type,
      duration_ms: Date.now() - startedAt,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
