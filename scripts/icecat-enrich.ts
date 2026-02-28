/**
 * Icecat Product Enrichment Script
 *
 * Enrichit les fiches produit via l'API Icecat (Open Icecat).
 *
 * Usage:
 *   npx tsx scripts/icecat-enrich.ts [flags]
 *
 * Flags:
 *   --ean=<EAN>    Enrichir un seul produit par EAN
 *   --limit=<N>    Limiter à N produits
 *   --force        Ré-enrichir même si icecat_enriched_at existe
 *   --dry-run      Ne pas écrire en base, afficher ce qui serait fait
 *   --verbose      Logs détaillés de chaque requête/réponse
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Load .env.local ───────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ICECAT_API_TOKEN = process.env.ICECAT_API_TOKEN!;
const ICECAT_CONTENT_TOKEN = process.env.ICECAT_CONTENT_TOKEN!;
const ICECAT_SHOP_NAME = process.env.ICECAT_SHOP_NAME ?? "REINE";

const ICECAT_BASE_URL = "https://live.icecat.biz/api";
const RATE_LIMIT_MS = 300;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const singleEan = getArg("ean");
const limit = getArg("limit") ? parseInt(getArg("limit")!, 10) : undefined;
const force = hasFlag("force");
const dryRun = hasFlag("dry-run");
const verbose = hasFlag("verbose");

// ── Types ─────────────────────────────────────────────────────────────────────

interface IcecatProductUpdate {
  icecat_id?: number;
  icecat_title?: string;
  icecat_description?: string;
  icecat_images?: Array<{ url: string; is_main: boolean }>;
  specifications?: Record<
    string,
    Array<{ feature: string; value: string; unit: string }>
  >;
  bullet_points?: string[];
  multimedia?: Array<{ url: string; type: string; description: string }>;
  reasons_to_buy?: Array<{ title: string; description: string; image?: string }>;
  product_story_url?: string;
  icecat_category?: string;
  icecat_brand_logo?: string;
  icecat_warranty?: string;
  icecat_leaflet_url?: string;
  icecat_manual_url?: string;
  icecat_enriched_at: string;
}

interface EnrichResult {
  product_id: string;
  ean: string | null;
  status: "enriched" | "not_found" | "error" | "dry_run";
  icecat_id?: number;
  error?: string;
}

interface DBProduct {
  id: string;
  ean: string | null;
  brand: string | null;
  manufacturer_code: string | null;
  manufacturer_ref: string | null;
  name: string;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryFetch(
  url: string,
  init: RequestInit,
  attempts = RETRY_ATTEMPTS,
): Promise<Response> {
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (i === attempts) throw err;
      if (verbose) console.log(`  Retry ${i + 1}/${attempts} after error...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("All retry attempts exhausted");
}

// ── Icecat API calls ──────────────────────────────────────────────────────────

const ICECAT_HEADERS: Record<string, string> = {
  "api-token": ICECAT_API_TOKEN,
  "content-token": ICECAT_CONTENT_TOKEN,
  "User-Agent": "Ma-Papeterie-Enrichment/1.0",
  Accept: "application/json",
};

async function callIcecat(url: string): Promise<any | null> {
  const res = await retryFetch(url, { headers: ICECAT_HEADERS });

  // 401 = invalid credentials — fatal
  if (res.status === 401) {
    throw new Error(`ICECAT_AUTH_FAIL: HTTP 401 — check tokens`);
  }

  // 403 = product not available in Open Icecat (non-sponsor brand) — not fatal
  if (res.status === 403) {
    if (verbose) console.log(`  Icecat HTTP 403 (non-sponsor brand, skipping)`);
    return null;
  }

  // 400 = GTIN not found in Icecat database — not fatal
  if (res.status === 400) {
    if (verbose) {
      try {
        const body = await res.json();
        console.log(`  Icecat HTTP 400: ${body?.Message || "Bad Request"}`);
      } catch {
        console.log(`  Icecat HTTP 400`);
      }
    }
    return null;
  }

  if (!res.ok) {
    if (verbose) console.log(`  Icecat HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();

  // DemoAccount === true means auth failed — tokens are invalid
  if (json?.data?.DemoAccount === true) {
    throw new Error(
      "ICECAT_AUTH_FAIL: DemoAccount=true — check ICECAT_API_TOKEN and ICECAT_CONTENT_TOKEN",
    );
  }

  // Check for content errors (product not found)
  if (json?.data?.ContentErrors) {
    if (verbose) console.log(`  ContentErrors: ${json.data.ContentErrors}`);
    return null;
  }

  if (json?.msg !== "OK" || !json?.data) {
    if (verbose) console.log(`  msg=${json?.msg}`);
    return null;
  }

  return json;
}

async function fetchIcecatByGtin(ean: string): Promise<any | null> {
  const url = `${ICECAT_BASE_URL}?lang=FR&shopname=${ICECAT_SHOP_NAME}&GTIN=${ean}&content=`;
  return callIcecat(url);
}

async function fetchIcecatByProductCode(
  code: string,
  brand: string,
): Promise<any | null> {
  const encodedCode = encodeURIComponent(code.toUpperCase());
  const encodedBrand = encodeURIComponent(brand);
  const url = `${ICECAT_BASE_URL}?lang=FR&shopname=${ICECAT_SHOP_NAME}&ProductCode=${encodedCode}&Brand=${encodedBrand}&content=`;
  return callIcecat(url);
}

// ── Response parser ───────────────────────────────────────────────────────────

function parseIcecatResponse(json: any): Partial<IcecatProductUpdate> {
  const d = json?.data;
  if (!d) return { icecat_enriched_at: new Date().toISOString() };

  const gi = d.GeneralInfo ?? {};

  // Icecat ID
  const icecatId: number | undefined = gi.IcecatId ?? undefined;

  // Title
  const title: string | undefined = gi.Title || undefined;

  // Description — prefer LongDesc (HTML), fallback to summaries
  const description: string | undefined =
    gi.Description?.LongDesc ||
    gi.SummaryDescription?.LongSummaryDescription ||
    gi.SummaryDescription?.ShortSummaryDescription ||
    undefined;

  // Images — main image + gallery
  const images: Array<{ url: string; is_main: boolean }> = [];
  if (d.Image?.HighPic) {
    images.push({ url: d.Image.HighPic, is_main: true });
  }
  if (Array.isArray(d.Gallery)) {
    for (const g of d.Gallery) {
      const url = g.HighPic || g.Pic500x500 || g.LowPic;
      if (url && !images.some((i) => i.url === url)) {
        images.push({ url, is_main: g.IsMain === "Y" });
      }
    }
  }

  // Specifications — feature groups
  const specifications: Record<
    string,
    Array<{ feature: string; value: string; unit: string }>
  > = {};
  if (Array.isArray(d.FeaturesGroups)) {
    for (const group of d.FeaturesGroups) {
      const groupName = group?.FeatureGroup?.Name?.Value ?? "Autres";
      const features: Array<{ feature: string; value: string; unit: string }> =
        [];
      if (Array.isArray(group.Features)) {
        for (const f of group.Features) {
          features.push({
            feature: f?.Feature?.Name?.Value ?? "",
            value: f?.PresentationValue || f?.Value || "",
            unit: f?.Feature?.Measure?.Signs ?? "",
          });
        }
      }
      if (features.length > 0) {
        specifications[groupName] = features;
      }
    }
  }

  // Bullet points
  const bulletPoints: string[] =
    gi.BulletPoints?.Values || gi.GeneratedBulletPoints?.Values || [];

  // Multimedia
  const multimedia: Array<{ url: string; type: string; description: string }> =
    [];
  if (Array.isArray(d.Multimedia)) {
    for (const m of d.Multimedia) {
      if (m.URL) {
        multimedia.push({
          url: m.URL,
          type: m.ContentType || m.Type || "unknown",
          description: m.Description || "",
        });
      }
    }
  }

  // Reasons to buy
  const reasonsToBuy: Array<{
    title: string;
    description: string;
    image?: string;
  }> = [];
  if (Array.isArray(d.ReasonsToBuy)) {
    for (const r of d.ReasonsToBuy) {
      reasonsToBuy.push({
        title: r?.Title?.Value || "",
        description: r?.Value?.Value || "",
        image: r?.HighPic || undefined,
      });
    }
  }

  // Product story
  const productStoryUrl: string | undefined =
    d.ProductStory?.[0]?.URL || undefined;

  // Category
  const category: string | undefined =
    gi.Category?.Name?.Value || undefined;

  // Brand logo
  const brandLogo: string | undefined = gi.BrandLogo || undefined;

  // Warranty
  const warranty: string | undefined =
    gi.Description?.WarrantyInfo || undefined;

  // Documents
  const leaflet: string | undefined =
    gi.Description?.LeafletPDFURL || undefined;
  const manual: string | undefined =
    gi.Description?.ManualPDFURL || undefined;

  return {
    icecat_id: icecatId,
    icecat_title: title,
    icecat_description: description,
    icecat_images: images.length > 0 ? images : undefined,
    specifications:
      Object.keys(specifications).length > 0 ? specifications : undefined,
    bullet_points: bulletPoints.length > 0 ? bulletPoints : undefined,
    multimedia: multimedia.length > 0 ? multimedia : undefined,
    reasons_to_buy: reasonsToBuy.length > 0 ? reasonsToBuy : undefined,
    product_story_url: productStoryUrl,
    icecat_category: category,
    icecat_brand_logo: brandLogo,
    icecat_warranty: warranty,
    icecat_leaflet_url: leaflet,
    icecat_manual_url: manual,
    icecat_enriched_at: new Date().toISOString(),
  };
}

// ── Enrich single product ─────────────────────────────────────────────────────

async function enrichProduct(
  supabase: SupabaseClient,
  product: DBProduct,
): Promise<EnrichResult> {
  let icecatJson: any = null;

  try {
    // Strategy 1: GTIN (EAN)
    if (product.ean) {
      icecatJson = await fetchIcecatByGtin(product.ean);
      if (verbose)
        console.log(
          `  [GTIN] ${product.ean} → ${icecatJson ? "found" : "not found"}`,
        );
    }

    // Strategy 2: ProductCode + Brand fallback
    if (!icecatJson) {
      const code = product.manufacturer_code || product.manufacturer_ref;
      if (code && product.brand) {
        icecatJson = await fetchIcecatByProductCode(code, product.brand);
        if (verbose)
          console.log(
            `  [ProductCode+Brand] ${code}/${product.brand} → ${icecatJson ? "found" : "not found"}`,
          );
      }
    }
  } catch (err: any) {
    if (err.message?.startsWith("ICECAT_AUTH_FAIL")) {
      throw err; // Fatal — abort entire run
    }
    return {
      product_id: product.id,
      ean: product.ean,
      status: "error",
      error: err.message,
    };
  }

  // Build update payload
  let updatePayload: Partial<IcecatProductUpdate>;

  if (icecatJson) {
    updatePayload = parseIcecatResponse(icecatJson);
  } else {
    // Not found — mark so we don't re-query every run
    updatePayload = { icecat_enriched_at: new Date().toISOString() };
  }

  if (dryRun) {
    if (verbose && icecatJson) {
      console.log(
        `  [DRY-RUN] Would update:`,
        JSON.stringify(
          {
            icecat_id: updatePayload.icecat_id,
            icecat_title: updatePayload.icecat_title,
            specs_groups: updatePayload.specifications
              ? Object.keys(updatePayload.specifications).length
              : 0,
            images: updatePayload.icecat_images?.length ?? 0,
            bullet_points: updatePayload.bullet_points?.length ?? 0,
          },
          null,
          2,
        ),
      );
    }
    return {
      product_id: product.id,
      ean: product.ean,
      status: "dry_run",
      icecat_id: updatePayload.icecat_id,
    };
  }

  // Write to DB
  const { error } = await (supabase as any)
    .from("products")
    .update(updatePayload)
    .eq("id", product.id);

  if (error) {
    return {
      product_id: product.id,
      ean: product.ean,
      status: "error",
      error: error.message,
    };
  }

  return {
    product_id: product.id,
    ean: product.ean,
    status: icecatJson ? "enriched" : "not_found",
    icecat_id: updatePayload.icecat_id,
  };
}

// ── Report generator ──────────────────────────────────────────────────────────

function generateReport(results: EnrichResult[], startTime: number): void {
  const enriched = results.filter((r) => r.status === "enriched").length;
  const notFound = results.filter((r) => r.status === "not_found").length;
  const errors = results.filter((r) => r.status === "error").length;
  const dryRuns = results.filter((r) => r.status === "dry_run").length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n===================================================");
  console.log("  Icecat Enrichment Report");
  console.log("===================================================");
  console.log(`  Total processed : ${results.length}`);
  console.log(`  Enriched        : ${enriched}`);
  console.log(`  Not found       : ${notFound}`);
  if (dryRuns > 0) console.log(`  Dry runs        : ${dryRuns}`);
  if (errors > 0) console.log(`  Errors          : ${errors}`);
  console.log(`  Elapsed         : ${elapsed}s`);
  console.log("===================================================\n");

  // Write JSON report
  const reportPath = path.resolve(
    process.cwd(),
    `icecat-report-${Date.now()}.json`,
  );
  const report = {
    generatedAt: new Date().toISOString(),
    elapsed_s: parseFloat(elapsed),
    total: results.length,
    enriched,
    notFound,
    errors,
    dryRuns,
    results,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report: ${reportPath}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      "FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local",
    );
    process.exit(1);
  }
  if (!ICECAT_API_TOKEN || !ICECAT_CONTENT_TOKEN) {
    console.error(
      "FATAL: ICECAT_API_TOKEN and ICECAT_CONTENT_TOKEN required in .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Build query
  let query = (supabase as any)
    .from("products")
    .select("id, ean, brand, manufacturer_code, manufacturer_ref, name")
    .not("ean", "is", null);

  if (!force) {
    query = query.is("icecat_enriched_at", null);
  }

  if (singleEan) {
    query = query.eq("ean", singleEan);
  }

  if (limit) {
    query = query.limit(limit);
  } else {
    query = query.limit(10000); // Safety cap
  }

  const { data: products, error: fetchError } = await query;

  if (fetchError) {
    console.error("FATAL: Could not fetch products:", fetchError.message);
    process.exit(1);
  }

  const count = products?.length ?? 0;
  console.log(`\nIcecat enrichment — ${count} products to process`);
  if (dryRun) console.log("(DRY RUN — no database writes)");
  if (force) console.log("(FORCE — re-enriching already processed products)");
  console.log("");

  if (count === 0) {
    console.log("Nothing to do.\n");
    return;
  }

  const results: EnrichResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const p = products![i] as DBProduct;
    const progress = `[${i + 1}/${count}]`;
    const label = `${p.name.substring(0, 40)}${p.name.length > 40 ? "..." : ""}`;
    process.stdout.write(`${progress} ${label} (${p.ean}) ... `);

    try {
      const result = await enrichProduct(supabase, p);
      results.push(result);

      const icon =
        result.status === "enriched"
          ? "OK"
          : result.status === "not_found"
            ? "--"
            : result.status === "dry_run"
              ? "DR"
              : "ERR";
      console.log(
        `[${icon}]${result.icecat_id ? ` icecat_id=${result.icecat_id}` : ""}`,
      );
    } catch (err: any) {
      if (err.message?.startsWith("ICECAT_AUTH_FAIL")) {
        console.error("\nFATAL: Icecat authentication failed — aborting.");
        console.error(err.message);
        generateReport(results, startTime);
        process.exit(2);
      }
      results.push({
        product_id: p.id,
        ean: p.ean,
        status: "error",
        error: err.message,
      });
      console.log(`[ERR] ${err.message}`);
    }

    // Rate limiting
    if (i < count - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  generateReport(results, startTime);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
