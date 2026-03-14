// ─── Polyfill: patch crypto.getCiphers() for ssh2 compatibility ───────────────
// ssh2 pre-filters its cipher list against crypto.getCiphers(). Deno's
// node:crypto only reports ~7 ciphers, causing ssh2 to reject ciphers that
// Deno CAN handle (AES-CBC, AES-GCM, AES-CTR).
//
// IMPORTANT: Use default import (mutable object), NOT namespace import
// (`import * as` creates an immutable Module Namespace — patches silently fail).
// deno-lint-ignore no-unused-vars
import crypto from "node:crypto";

/** Patch crypto.getCiphers and load ssh2-sftp-client. Must be called before
 *  any ssh2 usage. Returns the SftpClient constructor. */
async function loadSftpClient(): Promise<any> {
  // deno-lint-ignore no-explicit-any
  const c = crypto as any;
  const origGetCiphers = c.getCiphers;

  const NEEDED_CIPHERS = [
    "aes-256-ctr", "aes-192-ctr", "aes-128-ctr",
    "aes-256-gcm", "aes-128-gcm",
    "aes-256-cbc", "aes-192-cbc", "aes-128-cbc",
  ];

  c.getCiphers = () => {
    const list: string[] = origGetCiphers ? origGetCiphers() : [];
    for (const cipher of NEEDED_CIPHERS) {
      if (!list.includes(cipher)) list.push(cipher);
    }
    // Remove chacha20 — ssh2 maps chacha20-poly1305@openssh.com to OpenSSL
    // "chacha20", but Deno's createCipheriv("chacha20") fails at connect time.
    return list.filter((n: string) => !n.startsWith("chacha20"));
  };

  const patchedCiphers = c.getCiphers();
  log(`runtime: Deno ${Deno.version?.deno ?? "?"} / V8 ${Deno.version?.v8 ?? "?"}`);
  log(`patched getCiphers: ${patchedCiphers.length} ciphers (added: ${NEEDED_CIPHERS.filter((n: string) => patchedCiphers.includes(n)).join(", ")})`);

  const mod = await import("npm:ssh2-sftp-client@9.1.0");
  return mod.default;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireApiSecret, requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

// ─── File definitions ───

/** Small daily files: downloaded fully then POSTed to fetch-liderpapel-sftp */
const DAILY_FILES = [
  { remote: "Catalog.json", bodyKey: "catalog_json" },
  { remote: "Prices.json", bodyKey: "prices_json" },
  { remote: "Stocks.json", bodyKey: "stocks_json" },
];

/** Large enrichment files: uploaded to Storage → process-enrich-file
 *  Liderpapel adds a locale+date suffix to filenames, e.g.:
 *    MultimediaLinks_fr_FR_3321289.json
 *  We match by prefix so any suffix variant is found automatically.
 */
const ENRICH_FILES = [
  { remotePrefix: "Descriptions_fr", fileType: "descriptions_json" },
  { remotePrefix: "MultimediaLinks_fr", fileType: "multimedia_json" },
  { remotePrefix: "RelationedProducts_fr", fileType: "relations_json" },
];

// ─── Helpers ───

function env(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

function log(msg: string) {
  console.log(`[sync-liderpapel-sftp] ${msg}`);
}

/** Classify SFTP errors into actionable categories for diagnostics. */
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
  if (/impossible de lister|no such file/i.test(msg))
    return { type: "list_failed", message: msg };
  return { type: "unknown", message: msg };
}

// ─── Background enrichment task ───────────────────────────────────────────────
// Runs via EdgeRuntime.waitUntil() so it outlives the HTTP response timeout.
// Opens its own SFTP connection to keep the main request handler fast.

async function runEnrichmentAsync(
  supabase: ReturnType<typeof createClient>,
  sftpConfig: Record<string, any>,
  remotePath: string,
): Promise<void> {
  const startedAt = Date.now();
  const results: Record<string, any> = { enrichment: {}, errors: [] as string[] };
  let sftp: any = null;

  try {
    const SftpClient = await loadSftpClient();

    sftp = new SftpClient();
    sftp.on("error", (err: any) => {
      log(`[bg] SFTP error event (handled): ${err?.message ?? err}`);
    });

    log("[bg] Connecting to SFTP...");
    await Promise.race([
      sftp.connect(sftpConfig),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SFTP connection timeout (10s)")), 10000)
      ),
    ]);
    log("[bg] Connected.");

    let fileList: any[];
    try {
      fileList = await sftp.list(remotePath);
      log(`[bg] Found ${fileList.length} files in ${remotePath}`);
    } catch (err: any) {
      throw new Error(`Impossible de lister ${remotePath}: ${err.message}`);
    }

    for (const file of ENRICH_FILES) {
      // Prefix match: Liderpapel adds locale/date suffixes to filenames
      // e.g. MultimediaLinks_fr.json → MultimediaLinks_fr_FR_3321289.json
      const stat = fileList.find(
        (f: any) => f.name.startsWith(file.remotePrefix) && f.name.endsWith(".json"),
      );
      if (!stat) {
        log(`[bg] ⚠ Aucun fichier ${file.remotePrefix}*.json trouvé — ignoré`);
        continue;
      }
      const actualRemote = stat.name;

      try {
        const sizeMb = (stat.size / (1024 * 1024)).toFixed(0);
        log(`[bg] Downloading ${actualRemote} (${sizeMb} Mo)...`);

        const buffer = await sftp.get(`${remotePath}/${actualRemote}`);
        const blob = new Blob([buffer], { type: "application/json" });
        const storagePath = `sftp-sync-${Date.now()}-${actualRemote}`;

        // Upload to Storage
        const { error: uploadErr } = await supabase.storage
          .from("liderpapel-enrichment")
          .upload(storagePath, blob, {
            contentType: "application/json",
            upsert: true,
          });

        if (uploadErr) {
          throw new Error(`Upload Storage: ${uploadErr.message}`);
        }

        // Create job entry
        const { data: job, error: jobErr } = await supabase
          .from("enrich_import_jobs")
          .insert({
            storage_path: storagePath,
            file_type: file.fileType,
            file_name: actualRemote,
            status: "pending",
          })
          .select("id")
          .single();

        if (jobErr || !job) {
          throw new Error(`Création job: ${jobErr?.message || "?"}`);
        }

        // Trigger async processing (process-enrich-file uses waitUntil internally
        // and returns immediately — a FunctionsFetchError means the gateway closed
        // the connection after the function started, not that it failed).
        const { error: invokeErr } = await supabase.functions.invoke("process-enrich-file", {
          body: {
            storagePath,
            fileType: file.fileType,
            jobId: job.id,
          },
        });

        if (invokeErr) {
          const isFetchError =
            invokeErr.message?.includes("Failed to send") ||
            invokeErr.name === "FunctionsFetchError" ||
            invokeErr.name === "FunctionsRelayError";
          if (!isFetchError) {
            throw new Error(`Déclenchement process-enrich-file: ${invokeErr.message}`);
          }
          log(`[bg] process-enrich-file: gateway timeout ignoré (job ${job.id} tourne en arrière-plan)`);
        }

        results.enrichment[file.fileType] = {
          jobId: job.id,
          status: "processing",
          sizeMb,
          fileName: actualRemote,
        };
        log(`[bg] ✓ ${actualRemote} → job ${job.id}`);
      } catch (err: any) {
        log(`[bg] ✗ ${actualRemote}: ${err.message}`);
        results.errors.push(`${actualRemote}: ${err.message}`);
      }
    }
  } catch (err: any) {
    log(`[bg] Fatal: ${err.message}`);
    results.errors.push(err.message);
  } finally {
    if (sftp) {
      try { await sftp.end(); } catch { /* ignore */ }
    }
  }

  const status = results.errors.length > 0 ? "partial" : "success";
  await logCronResult(supabase, status, results, startedAt);
  log(`[bg] Enrichissement terminé (${status})`);
}

// ─── Main handler ───

Deno.serve(async (req) => {
  // Global try/catch: guarantee a response with CORS headers even if the
  // function crashes unexpectedly (import failure, runtime error, etc.).
  // Without this, Supabase returns 500 without CORS → browser blocks it →
  // supabase-js reports "Failed to send a request to the Edge Function".
  let corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  try {

  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'sync-liderpapel');
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Accept either admin JWT (browser) or API secret (cron/internal)
  const hasApiSecret = req.headers.get('x-api-secret');
  if (hasApiSecret) {
    const secretError = requireApiSecret(req, corsHeaders);
    if (secretError) return secretError;
  } else {
    const authResult = await requireAdmin(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;
  }

  const supabase = createClient(
    env("SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const body = await req.json().catch(() => ({}));
  const includeEnrichment = body.includeEnrichment === true;
  const enrichmentOnly = body.enrichmentOnly === true;
  const startedAt = Date.now();

  // SFTP connection settings — from Supabase Secrets
  const sshDebug = env("LIDERPAPEL_SFTP_DEBUG") === "true";

  // Allow cipher override via secret (comma-separated ssh2 cipher names)
  const cipherOverride = env("LIDERPAPEL_SFTP_CIPHERS");
  const cipherList = cipherOverride
    ? cipherOverride.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [
        // AES-CTR first (streaming, no padding, widely supported)
        "aes256-ctr", "aes192-ctr", "aes128-ctr",
        // AES-GCM (authenticated encryption, no HMAC needed)
        "aes256-gcm@openssh.com", "aes128-gcm@openssh.com",
        // AES-CBC fallback (universally supported, needs HMAC)
        "aes256-cbc", "aes128-cbc",
      ];

  log(`cipher config: ${cipherList.join(", ")}${cipherOverride ? " (override)" : ""}`);

  const sftpConfig: Record<string, any> = {
    host: env("LIDERPAPEL_SFTP_HOST", "sftp.liderpapel.com"),
    port: parseInt(env("LIDERPAPEL_SFTP_PORT", "22"), 10),
    username: env("LIDERPAPEL_SFTP_USER"),
    password: env("LIDERPAPEL_SFTP_PASSWORD"),
    readyTimeout: 8000,
    retries: 0,
    algorithms: {
      serverHostKey: [
        "ssh-rsa",
        "ssh-dss",
        "rsa-sha2-256",
        "rsa-sha2-512",
        "ecdsa-sha2-nistp256",
        "ecdsa-sha2-nistp384",
        "ecdsa-sha2-nistp521",
        "ssh-ed25519",
      ],
      kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "ecdh-sha2-nistp256",
        "ecdh-sha2-nistp384",
        "ecdh-sha2-nistp521",
        "diffie-hellman-group14-sha256",
        "diffie-hellman-group16-sha512",
        "diffie-hellman-group18-sha512",
        "diffie-hellman-group14-sha1",
      ],
      cipher: cipherList,
      hmac: [
        "hmac-sha2-256",
        "hmac-sha2-512",
        "hmac-sha1",
      ],
    },
  };

  // Enable ssh2 debug logging when LIDERPAPEL_SFTP_DEBUG=true
  if (sshDebug) {
    sftpConfig.debug = (msg: string) => {
      // Redact potential credential leaks from ssh2 debug output
      const redacted = msg.replace(/password[=:]\s*\S+/gi, "password=***").replace(/passphrase[=:]\s*\S+/gi, "passphrase=***");
      log(`[ssh2] ${redacted}`);
    };
  }

  const remotePath = env("LIDERPAPEL_SFTP_PATH", "/");

  if (!sftpConfig.username || !sftpConfig.password) {
    const msg =
      "Identifiants SFTP manquants. Configurez LIDERPAPEL_SFTP_USER et LIDERPAPEL_SFTP_PASSWORD dans les secrets Supabase.";
    log(msg);
    await logCronResult(supabase, "error", { error: msg }, startedAt);
    return new Response(JSON.stringify({ error: msg, errors: [msg] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Enrichment-only mode ─────────────────────────────────────────────────
  // Downloading 3 large SFTP files (89 MB + 31 MB + ...) takes > 60 seconds.
  // Return 200 immediately and process via EdgeRuntime.waitUntil().
  if (enrichmentOnly) {
    log("Mode enrichissement seul — traitement en arrière-plan");
    const bgTask = runEnrichmentAsync(supabase, sftpConfig, remotePath);
    // @ts-ignore — EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined") {
      // @ts-ignore
      EdgeRuntime.waitUntil(bgTask);
    } else {
      await bgTask; // local dev fallback
    }
    return new Response(
      JSON.stringify({
        enrichment: {
          status: "started",
          message: "Téléchargement SFTP et traitement lancés en arrière-plan. Suivez la progression dans la section Enrichissement.",
        },
        errors: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ─── Daily (and full) mode — synchronous ─────────────────────────────────
  const results: Record<string, any> = {
    daily: {},
    enrichment: {},
    errors: [] as string[],
    steps: [] as { step: string; status: string; duration_ms?: number; details?: string }[],
    files_downloaded: {} as Record<string, { size_mb: string; status: string }>,
  };

  let sftp: any = null;

  try {
    const SftpClient = await loadSftpClient();

    sftp = new SftpClient();
    sftp.on("error", (err: any) => {
      log(`SFTP error event (handled): ${err?.message ?? err}`);
    });

    log(`Connecting to ${sftpConfig.host}:${sftpConfig.port} as ${sftpConfig.username ? sftpConfig.username.slice(0, 2) + "***" : "??"}...`);
    const connectStart = Date.now();
    try {
      await Promise.race([
        sftp.connect(sftpConfig),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SFTP connection timeout (10s)")), 10000)
        ),
      ]);
    } catch (connErr: any) {
      const classified = classifySftpError(connErr);
      results.steps.push({ step: "Connexion SFTP", status: "error", duration_ms: Date.now() - connectStart, details: `${classified.type}: ${classified.message}` });
      throw connErr;
    }
    results.steps.push({ step: "Connexion SFTP", status: "ok", duration_ms: Date.now() - connectStart });
    log("Connected.");

    let fileList: any[];
    try {
      fileList = await sftp.list(remotePath);
      log(`Found ${fileList.length} files in ${remotePath}`);
    } catch (err: any) {
      throw new Error(`Impossible de lister ${remotePath}: ${err.message}`);
    }

    const remoteNames = new Set(fileList.map((f: any) => f.name));

    // ─── Download & process daily files (Catalog, Prices, Stock) ───
    const fetchBody: Record<string, any> = {};
    let dailyDownloaded = 0;

    for (const file of DAILY_FILES) {
      if (!remoteNames.has(file.remote)) {
        log(`⚠ ${file.remote} introuvable sur le SFTP — ignoré`);
        results.errors.push(`${file.remote} introuvable`);
        continue;
      }

      try {
        log(`Downloading ${file.remote}...`);
        const dlStart = Date.now();
        const buffer = await sftp.get(`${remotePath}/${file.remote}`);
        const text =
          typeof buffer === "string"
            ? buffer
            : new TextDecoder().decode(buffer);
        const json = JSON.parse(text);
        fetchBody[file.bodyKey] = json;
        dailyDownloaded++;

        const sizeMb = (text.length / (1024 * 1024)).toFixed(1);
        results.files_downloaded[file.remote] = { size_mb: sizeMb, status: "ok" };
        results.steps.push({ step: `Téléchargement ${file.remote}`, status: "ok", duration_ms: Date.now() - dlStart, details: `${sizeMb} Mo` });
        log(`✓ ${file.remote} (${sizeMb} Mo)`);
      } catch (err: any) {
        log(`✗ ${file.remote}: ${err.message}`);
        results.files_downloaded[file.remote] = { size_mb: "0", status: "error" };
        results.steps.push({ step: `Téléchargement ${file.remote}`, status: "error", details: err.message });
        results.errors.push(`${file.remote}: ${err.message}`);
      }
    }

    // Download & import Categories.json first (ensures supplier_category_mappings exist before products)
    const catRemote = fileList.find((f: any) => f.name === "Categories.json" || f.name.startsWith("Categories_fr"));
    if (catRemote) {
      try {
        const catStart = Date.now();
        log(`Downloading ${catRemote.name} (categories pre-step)...`);
        const catBuffer = await sftp.get(`${remotePath}/${catRemote.name}`);
        const catText = typeof catBuffer === "string" ? catBuffer : new TextDecoder().decode(catBuffer);
        const catJson = JSON.parse(catText);
        const catSizeMb = (catText.length / (1024 * 1024)).toFixed(1);
        results.files_downloaded[catRemote.name] = { size_mb: catSizeMb, status: "ok" };

        // Send categories to fetch-liderpapel-sftp first
        const catResp = await fetch(`${env("SUPABASE_URL")}/functions/v1/fetch-liderpapel-sftp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ categories_json: catJson }),
        });
        const catData = catResp.ok ? await catResp.json() : null;
        results.categories = catData?.categories || null;
        results.steps.push({
          step: "Import catégories",
          status: catResp.ok ? "ok" : "error",
          duration_ms: Date.now() - catStart,
          details: catData?.categories ? `${catData.categories.total || 0} catégories` : "échec",
        });
        log(`✓ Catégories: ${catData?.categories?.total || 0} traitées`);
      } catch (err: any) {
        log(`⚠ Categories.json: ${err.message}`);
        results.steps.push({ step: "Import catégories", status: "error", details: err.message });
      }
    }

    // Send daily files to fetch-liderpapel-sftp
    if (dailyDownloaded > 0) {
      log(`Sending ${dailyDownloaded} file(s) to fetch-liderpapel-sftp...`);
      const importStart = Date.now();
      const functionUrl = `${env("SUPABASE_URL")}/functions/v1/fetch-liderpapel-sftp`;
      const resp = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(fetchBody),
      });

      if (resp.ok) {
        const data = await resp.json();
        results.daily = data;
        const importDuration = Date.now() - importStart;
        results.steps.push({
          step: "Import produits",
          status: data.errors > 0 ? "partial" : "ok",
          duration_ms: importDuration,
          details: `${data.created || 0} créés, ${data.updated || 0} modifiés, ${data.skipped || 0} ignorés, ${data.errors || 0} erreurs — ${data.catalog_count || 0} catalogue, ${data.prices_count || 0} prix, ${data.stock_count || 0} stocks`,
        });
        log(
          `✓ Import: ${data.created || 0} créés, ${data.updated || 0} modifiés, ${data.errors || 0} erreurs`,
        );
      } else {
        const errText = await resp.text();
        results.steps.push({ step: "Import produits", status: "error", duration_ms: Date.now() - importStart, details: errText.substring(0, 200) });
        results.errors.push(`fetch-liderpapel-sftp: ${errText}`);
        log(`✗ fetch-liderpapel-sftp: ${errText}`);
      }
    } else {
      results.steps.push({ step: "Import produits", status: "skipped", details: "Aucun fichier quotidien téléchargé" });
      log("Aucun fichier quotidien téléchargé — import ignoré");
    }

    // ─── Full mode: start enrichment in background after daily sync ───
    if (includeEnrichment) {
      log("Mode complet — enrichissement lancé en arrière-plan après sync quotidienne");
      // Close the current SFTP connection first; runEnrichmentAsync opens its own
      try { await sftp.end(); sftp = null; } catch { /* ignore */ }

      const bgTask = runEnrichmentAsync(supabase, sftpConfig, remotePath);
      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined") {
        // @ts-ignore
        EdgeRuntime.waitUntil(bgTask);
      } else {
        await bgTask;
      }
      results.enrichment = { status: "started", message: "Traitement en arrière-plan" };
    }
  } catch (err: any) {
    const classified = classifySftpError(err);
    log(`Erreur fatale [${classified.type}]: ${err.message}`);
    results.errors.push(err.message);
    await logCronResult(
      supabase,
      "error",
      { ...results, fatal: err.message, error_type: classified.type },
      startedAt,
    );

    return new Response(
      JSON.stringify({ error: err.message, error_type: classified.type, errors: [err.message], details: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    if (sftp) {
      try { await sftp.end(); } catch { /* ignore */ }
    }
  }

  const durationMs = Date.now() - startedAt;
  results.duration_ms = durationMs;

  const status = results.errors.length > 0 ? "partial" : "success";
  await logCronResult(supabase, status, results, startedAt);

  log(`Terminé en ${(durationMs / 1000).toFixed(1)}s (${status})`);

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  } catch (fatalErr: any) {
    // Global safety net — ensures CORS headers are always returned
    log(`CRASH: ${fatalErr?.message ?? fatalErr}`);
    return new Response(
      JSON.stringify({ error: fatalErr?.message ?? "Erreur interne", errors: [fatalErr?.message ?? "Erreur interne"] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ─── Log result to cron_job_logs ───

async function logCronResult(
  supabase: any,
  status: string,
  result: any,
  startedAt: number,
) {
  try {
    await supabase.from("cron_job_logs").insert({
      job_name: "sync-liderpapel-sftp",
      status,
      result,
      duration_ms: Date.now() - startedAt,
      executed_at: new Date(startedAt).toISOString(),
    });
  } catch (err: any) {
    console.error("Failed to log cron result:", err.message);
  }
}
