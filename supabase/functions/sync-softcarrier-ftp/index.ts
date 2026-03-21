import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { decodeCp850 } from "../_shared/cp850.ts";

// ─── File definitions ───
// Order matters: herstinfo (brands) first, then preislis (products),
// artx (descriptions), tarifsb2b (B2B prices), lagerbestand (stock)

const FILES = [
  { remote: "HERSTINFO.TXT", source: "herstinfo", encoding: "cp850" },
  { remote: "PREISLIS.TXT", source: "preislis", encoding: "cp850" },
  { remote: "ARTX.IMP", source: "artx", encoding: "cp850" },
  { remote: "TarifsB2B.csv", source: "tarifsb2b", encoding: "utf8-bom" },
  { remote: "LAGERBESTAND.csv", source: "lagerbestand", encoding: "utf8" },
];

const CHUNK_LINES = 2000;

// ─── Helpers ───

function env(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

function log(msg: string) {
  console.log(`[sync-softcarrier-ftp] ${msg}`);
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
      job_name: "sync-softcarrier-ftp",
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
  name: "sync-softcarrier-ftp",
  auth: "admin-or-secret",
  rateLimit: { prefix: "sync-softcarrier-ftp", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const requestedSources: string[] | undefined = (body as any)?.sources;
  const startedAt = Date.now();

  // FTP credentials from Supabase Secrets
  const ftpHost = env("SOFTCARRIER_FTP_HOST");
  const ftpUser = env("SOFTCARRIER_FTP_USER");
  const ftpPassword = env("SOFTCARRIER_FTP_PASSWORD");
  const ftpPath = env("SOFTCARRIER_FTP_PATH", "/");

  if (!ftpHost || !ftpUser || !ftpPassword) {
    const msg =
      "Identifiants FTP manquants. Configurez SOFTCARRIER_FTP_HOST, SOFTCARRIER_FTP_USER et SOFTCARRIER_FTP_PASSWORD dans les secrets Supabase.";
    log(msg);
    await logCronResult(supabaseAdmin, "error", { error: msg }, startedAt);
    return new Response(JSON.stringify({ error: msg, errors: [msg] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter files if specific sources requested
  const filesToSync = requestedSources
    ? FILES.filter((f) => requestedSources.includes(f.source))
    : FILES;

  const results: Record<string, any> = { files: {}, errors: [] as string[] };
  let ftp: any = null;

  try {
    const { Client } = await import("npm:basic-ftp@5.0.5");
    const { Writable } = await import("node:stream");

    ftp = new Client();
    ftp.ftp.verbose = false;

    log(`Connecting to ${ftpHost}...`);
    await Promise.race([
      ftp.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPassword,
        secure: false,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("FTP connection timeout (15s)")),
          15000,
        ),
      ),
    ]);
    log("Connected.");

    for (const file of filesToSync) {
      try {
        log(`Downloading ${file.remote}...`);

        // Download to buffer via Node.js Writable stream
        const chunks: Uint8Array[] = [];
        const writable = new Writable({
          write(
            chunk: Buffer,
            _encoding: string,
            callback: () => void,
          ) {
            chunks.push(new Uint8Array(chunk));
            callback();
          },
        });

        const remotePath =
          ftpPath === "/" ? file.remote : `${ftpPath}/${file.remote}`;
        await ftp.downloadTo(writable, remotePath);

        // Merge chunks
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }

        const sizeMb = (totalLength / (1024 * 1024)).toFixed(1);
        log(`Downloaded ${file.remote} (${sizeMb} Mo)`);

        // Decode: CP850 for .TXT/.IMP, UTF-8 for .csv
        let text: string;
        if (file.encoding === "cp850") {
          text = decodeCp850(buffer);
        } else {
          text = new TextDecoder("utf-8").decode(buffer);
          // Remove BOM if present
          if (text.charCodeAt(0) === 0xfeff) {
            text = text.substring(1);
          }
        }

        // Chunk lines and POST each chunk to import-softcarrier
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const totalLines = lines.length;
        let chunkIdx = 0;
        let totalSuccess = 0;
        let totalErrors = 0;
        let totalSkipped = 0;

        for (let i = 0; i < lines.length; i += CHUNK_LINES) {
          chunkIdx++;
          const chunkLines = lines.slice(i, i + CHUNK_LINES);
          const chunkData = chunkLines.join("\n");

          try {
            const importUrl = `${env("SUPABASE_URL")}/functions/v1/import-softcarrier`;
            const resp = await fetch(importUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
                "x-api-secret": env("API_CRON_SECRET"),
              },
              body: JSON.stringify({ source: file.source, data: chunkData }),
            });

            if (resp.ok) {
              const data = await resp.json();
              totalSuccess += data.success || 0;
              totalErrors += data.errors || 0;
              totalSkipped += data.skipped || 0;
            } else {
              const errText = await resp.text();
              totalErrors += chunkLines.length;
              log(
                `Chunk ${chunkIdx}: HTTP ${resp.status} — ${errText.substring(0, 200)}`,
              );
            }
          } catch (err: any) {
            totalErrors += chunkLines.length;
            log(`Chunk ${chunkIdx}: ${err.message}`);
          }
        }

        results.files[file.source] = {
          lines: totalLines,
          chunks: chunkIdx,
          success: totalSuccess,
          errors: totalErrors,
          skipped: totalSkipped,
          sizeMb,
        };

        log(
          `✓ ${file.remote}: ${totalSuccess} importés, ${totalErrors} erreurs, ${totalSkipped} ignorés (${chunkIdx} chunks)`,
        );
      } catch (err: any) {
        log(`✗ ${file.remote}: ${err.message}`);
        (results.errors as string[]).push(`${file.remote}: ${err.message}`);
      }
    }
  } catch (err: any) {
    log(`Erreur fatale: ${err.message}`);
    (results.errors as string[]).push(err.message);
    await logCronResult(
      supabaseAdmin,
      "error",
      { ...results, fatal: err.message },
      startedAt,
    );

    return new Response(
      JSON.stringify({
        error: err.message,
        errors: [err.message],
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    if (ftp) {
      try {
        ftp.close();
      } catch {
        /* ignore */
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  results.duration_ms = durationMs;

  const status = (results.errors as string[]).length > 0 ? "partial" : "success";
  await logCronResult(supabaseAdmin, status, results, startedAt);

  log(`Terminé en ${(durationMs / 1000).toFixed(1)}s (${status})`);

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
