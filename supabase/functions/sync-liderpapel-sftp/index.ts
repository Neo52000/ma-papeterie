import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import SftpClient from "npm:ssh2-sftp-client@11.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── File definitions ───

/** Small daily files: downloaded fully then POSTed to fetch-liderpapel-sftp */
const DAILY_FILES = [
  { remote: "Catalog.json", bodyKey: "catalog_json" },
  { remote: "Prices.json", bodyKey: "prices_json" },
  { remote: "Stocks.json", bodyKey: "stocks_json" },
];

/** Large enrichment files: uploaded to Storage → process-enrich-file */
const ENRICH_FILES = [
  { remote: "Descriptions_fr.json", fileType: "descriptions_json" },
  { remote: "MultimediaLinks_fr.json", fileType: "multimedia_json" },
  { remote: "RelationedProducts_fr.json", fileType: "relations_json" },
];

// ─── Helpers ───

function env(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

function log(msg: string) {
  console.log(`[sync-liderpapel-sftp] ${msg}`);
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
  const sftpConfig = {
    host: env("LIDERPAPEL_SFTP_HOST", "sftp.liderpapel.com"),
    port: parseInt(env("LIDERPAPEL_SFTP_PORT", "22"), 10),
    username: env("LIDERPAPEL_SFTP_USER"),
    password: env("LIDERPAPEL_SFTP_PASSWORD"),
    readyTimeout: 15000,
    retries: 2,
    retry_factor: 2,
    retry_minTimeout: 2000,
  };

  const remotePath = env("LIDERPAPEL_SFTP_PATH", "/");

  if (!sftpConfig.username || !sftpConfig.password) {
    const msg =
      "Identifiants SFTP manquants. Configurez LIDERPAPEL_SFTP_USER et LIDERPAPEL_SFTP_PASSWORD dans les secrets Supabase.";
    log(msg);
    await logCronResult(supabase, "error", { error: msg }, startedAt);
    // Return 200 so supabase.functions.invoke surfaces the error message properly
    return new Response(JSON.stringify({ error: msg, errors: [msg] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sftp = new SftpClient();
  const results: Record<string, any> = {
    daily: {},
    enrichment: {},
    errors: [] as string[],
  };

  try {
    log(`Connecting to ${sftpConfig.host}:${sftpConfig.port}...`);
    await sftp.connect(sftpConfig);
    log("Connected.");

    // ─── 1. List available files ───
    let fileList: any[];
    try {
      fileList = await sftp.list(remotePath);
      log(`Found ${fileList.length} files in ${remotePath}`);
    } catch (err: any) {
      throw new Error(`Impossible de lister ${remotePath}: ${err.message}`);
    }

    const remoteNames = new Set(fileList.map((f: any) => f.name));

    // ─── 2. Download & process daily files (Catalog, Prices, Stock) ───
    const fetchBody: Record<string, any> = {};
    let dailyDownloaded = 0;

    if (enrichmentOnly) {
      log("Mode enrichissement seul — fichiers quotidiens ignorés");
    }

    for (const file of enrichmentOnly ? [] : DAILY_FILES) {
      if (!remoteNames.has(file.remote)) {
        log(`⚠ ${file.remote} introuvable sur le SFTP — ignoré`);
        results.errors.push(`${file.remote} introuvable`);
        continue;
      }

      try {
        log(`Downloading ${file.remote}...`);
        const buffer = await sftp.get(`${remotePath}/${file.remote}`);
        const text =
          typeof buffer === "string"
            ? buffer
            : new TextDecoder().decode(buffer);
        const json = JSON.parse(text);
        fetchBody[file.bodyKey] = json;
        dailyDownloaded++;

        const sizeMb = (text.length / (1024 * 1024)).toFixed(1);
        log(`✓ ${file.remote} (${sizeMb} Mo)`);
      } catch (err: any) {
        log(`✗ ${file.remote}: ${err.message}`);
        results.errors.push(`${file.remote}: ${err.message}`);
      }
    }

    // Send daily files to fetch-liderpapel-sftp
    if (dailyDownloaded > 0) {
      log(`Sending ${dailyDownloaded} file(s) to fetch-liderpapel-sftp...`);
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
        log(
          `✓ Import: ${data.created || 0} créés, ${data.updated || 0} modifiés, ${data.errors || 0} erreurs`,
        );
      } else {
        const errText = await resp.text();
        results.errors.push(`fetch-liderpapel-sftp: ${errText}`);
        log(`✗ fetch-liderpapel-sftp: ${errText}`);
      }
    } else {
      log("Aucun fichier quotidien téléchargé — import ignoré");
    }

    // ─── 3. Enrichment files (upload to Storage → async processing) ───
    if (includeEnrichment) {
      for (const file of ENRICH_FILES) {
        if (!remoteNames.has(file.remote)) {
          log(`⚠ ${file.remote} introuvable — ignoré`);
          continue;
        }

        try {
          // Check file size first
          const stat = fileList.find((f: any) => f.name === file.remote);
          const sizeMb = stat ? (stat.size / (1024 * 1024)).toFixed(0) : "?";
          log(`Downloading ${file.remote} (${sizeMb} Mo) for enrichment...`);

          const buffer = await sftp.get(`${remotePath}/${file.remote}`);
          const blob =
            buffer instanceof Buffer
              ? new Blob([buffer], { type: "application/json" })
              : new Blob([buffer], { type: "application/json" });

          const storagePath = `sftp-sync-${Date.now()}-${file.remote}`;

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
              file_name: file.remote,
              status: "pending",
            })
            .select("id")
            .single();

          if (jobErr || !job) {
            throw new Error(`Création job: ${jobErr?.message || "?"}`);
          }

          // Trigger async processing
          await supabase.functions.invoke("process-enrich-file", {
            body: {
              storagePath,
              fileType: file.fileType,
              jobId: job.id,
            },
          });

          results.enrichment[file.fileType] = {
            jobId: job.id,
            status: "processing",
            sizeMb,
          };
          log(
            `✓ ${file.remote} → job ${job.id} (traitement en arrière-plan)`,
          );
        } catch (err: any) {
          log(`✗ ${file.remote}: ${err.message}`);
          results.errors.push(`${file.remote}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    log(`Erreur fatale: ${err.message}`);
    results.errors.push(err.message);
    await logCronResult(
      supabase,
      "error",
      { ...results, fatal: err.message },
      startedAt,
    );

    return new Response(
      JSON.stringify({ error: err.message, errors: [err.message], details: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    try {
      await sftp.end();
    } catch { /* ignore */ }
  }

  const durationMs = Date.now() - startedAt;
  results.duration_ms = durationMs;

  const status = results.errors.length > 0 ? "partial" : "success";
  await logCronResult(supabase, status, results, startedAt);

  log(`Terminé en ${(durationMs / 1000).toFixed(1)}s (${status})`);

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
