// ── Icecat Enrichment Edge Function ──────────────────────────────────────────
//
// Enrichit les fiches produit via l'API Icecat (Open Icecat).
// Appelé depuis le dashboard admin.
//
// Body : { product_ids?: string[], ean?: string, limit?: number, force?: boolean }

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────────────────────────────

interface IcecatEnrichBody {
  product_ids?: string[];
  ean?: string;
  limit?: number;
  force?: boolean;
}

interface DBProduct {
  id: string;
  ean: string | null;
  brand: string | null;
  manufacturer_code: string | null;
  manufacturer_ref: string | null;
  name: string;
}

interface IcecatProductUpdate {
  icecat_id?: number;
  icecat_title?: string;
  icecat_description?: string;
  icecat_images?: Array<{ url: string; is_main: boolean }>;
  specifications?: Record<string, Array<{ feature: string; value: string; unit: string }>>;
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
  status: "enriched" | "not_found" | "error";
  icecat_id?: number;
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ICECAT_BASE_URL = "https://live.icecat.biz/api";
const RATE_LIMIT_MS = 300;
const MAX_PRODUCTS = 200;

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Icecat API ───────────────────────────────────────────────────────────────

async function callIcecat(
  url: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 401) {
    throw new Error("ICECAT_AUTH_FAIL: HTTP 401 — check tokens");
  }
  if (res.status === 403 || res.status === 400) return null;
  if (!res.ok) return null;

  const json = await res.json();

  if (json?.data?.DemoAccount === true) {
    throw new Error("ICECAT_AUTH_FAIL: DemoAccount=true — check tokens");
  }
  if (json?.data?.ContentErrors) return null;
  if (json?.msg !== "OK" || !json?.data) return null;

  return json;
}

function buildIcecatHeaders(username: string, password: string): Record<string, string> {
  const credentials = btoa(`${username}:${password}`);
  return {
    Authorization: `Basic ${credentials}`,
    "User-Agent": "Ma-Papeterie-Enrichment/1.0",
    Accept: "application/json",
  };
}

async function fetchByGtin(
  ean: string,
  shopName: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const url = `${ICECAT_BASE_URL}?lang=FR&shopname=${shopName}&GTIN=${ean}&content=`;
  return callIcecat(url, headers);
}

async function fetchByProductCode(
  code: string,
  brand: string,
  shopName: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const encodedCode = encodeURIComponent(code.toUpperCase());
  const encodedBrand = encodeURIComponent(brand);
  const url = `${ICECAT_BASE_URL}?lang=FR&shopname=${shopName}&ProductCode=${encodedCode}&Brand=${encodedBrand}&content=`;
  return callIcecat(url, headers);
}

// ── Response parser ──────────────────────────────────────────────────────────

function parseIcecatResponse(json: unknown): Partial<IcecatProductUpdate> {
  const d = (json as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  if (!d) return { icecat_enriched_at: new Date().toISOString() };

  const gi = (d.GeneralInfo ?? {}) as Record<string, unknown>;

  const icecatId = gi.IcecatId as number | undefined;
  const title = (gi.Title as string) || undefined;

  const desc = gi.Description as Record<string, unknown> | undefined;
  const summary = gi.SummaryDescription as Record<string, unknown> | undefined;
  const description: string | undefined =
    (desc?.LongDesc as string) ||
    (summary?.LongSummaryDescription as string) ||
    (summary?.ShortSummaryDescription as string) ||
    undefined;

  // Images
  const images: Array<{ url: string; is_main: boolean }> = [];
  const imgData = d.Image as Record<string, unknown> | undefined;
  if (imgData?.HighPic) {
    images.push({ url: imgData.HighPic as string, is_main: true });
  }
  const gallery = d.Gallery as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(gallery)) {
    for (const g of gallery) {
      const url = (g.HighPic || g.Pic500x500 || g.LowPic) as string | undefined;
      if (url && !images.some((i) => i.url === url)) {
        images.push({ url, is_main: g.IsMain === "Y" });
      }
    }
  }

  // Specifications
  const specifications: Record<string, Array<{ feature: string; value: string; unit: string }>> = {};
  const featuresGroups = d.FeaturesGroups as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(featuresGroups)) {
    for (const group of featuresGroups) {
      const fg = group.FeatureGroup as Record<string, unknown> | undefined;
      const nameObj = fg?.Name as Record<string, unknown> | undefined;
      const groupName = (nameObj?.Value as string) ?? "Autres";
      const features: Array<{ feature: string; value: string; unit: string }> = [];
      const feats = group.Features as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(feats)) {
        for (const f of feats) {
          const feat = f.Feature as Record<string, unknown> | undefined;
          const fName = feat?.Name as Record<string, unknown> | undefined;
          const measure = feat?.Measure as Record<string, unknown> | undefined;
          features.push({
            feature: (fName?.Value as string) ?? "",
            value: (f.PresentationValue as string) || (f.Value as string) || "",
            unit: (measure?.Signs as string) ?? "",
          });
        }
      }
      if (features.length > 0) {
        specifications[groupName] = features;
      }
    }
  }

  // Bullet points
  const bp = gi.BulletPoints as Record<string, unknown> | undefined;
  const gbp = gi.GeneratedBulletPoints as Record<string, unknown> | undefined;
  const bulletPoints: string[] = (bp?.Values as string[]) || (gbp?.Values as string[]) || [];

  // Multimedia
  const multimedia: Array<{ url: string; type: string; description: string }> = [];
  const mm = d.Multimedia as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(mm)) {
    for (const m of mm) {
      if (m.URL) {
        multimedia.push({
          url: m.URL as string,
          type: (m.ContentType || m.Type || "unknown") as string,
          description: (m.Description || "") as string,
        });
      }
    }
  }

  // Reasons to buy
  const reasonsToBuy: Array<{ title: string; description: string; image?: string }> = [];
  const rtb = d.ReasonsToBuy as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(rtb)) {
    for (const r of rtb) {
      const rTitle = r.Title as Record<string, unknown> | undefined;
      const rValue = r.Value as Record<string, unknown> | undefined;
      reasonsToBuy.push({
        title: (rTitle?.Value as string) || "",
        description: (rValue?.Value as string) || "",
        image: (r.HighPic as string) || undefined,
      });
    }
  }

  const productStoryArr = d.ProductStory as Array<Record<string, unknown>> | undefined;
  const productStoryUrl = productStoryArr?.[0]?.URL as string | undefined;

  const catObj = gi.Category as Record<string, unknown> | undefined;
  const catName = catObj?.Name as Record<string, unknown> | undefined;
  const category = catName?.Value as string | undefined;

  const brandLogo = gi.BrandLogo as string | undefined;
  const warranty = desc?.WarrantyInfo as string | undefined;
  const leaflet = desc?.LeafletPDFURL as string | undefined;
  const manual = desc?.ManualPDFURL as string | undefined;

  return {
    icecat_id: icecatId,
    icecat_title: title,
    icecat_description: description,
    icecat_images: images.length > 0 ? images : undefined,
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
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

// ── Enrich single product ────────────────────────────────────────────────────

async function enrichProduct(
  supabase: SupabaseClient,
  product: DBProduct,
  shopName: string,
  icecatHeaders: Record<string, string>,
): Promise<EnrichResult> {
  let icecatJson: unknown | null = null;

  try {
    // Strategy 1: GTIN (EAN)
    if (product.ean) {
      icecatJson = await fetchByGtin(product.ean, shopName, icecatHeaders);
    }

    // Strategy 2: ProductCode + Brand fallback
    if (!icecatJson) {
      const code = product.manufacturer_code || product.manufacturer_ref;
      if (code && product.brand) {
        icecatJson = await fetchByProductCode(code, product.brand, shopName, icecatHeaders);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("ICECAT_AUTH_FAIL")) throw err;
    return { product_id: product.id, ean: product.ean, status: "error", error: msg };
  }

  const updatePayload = icecatJson
    ? parseIcecatResponse(icecatJson)
    : { icecat_enriched_at: new Date().toISOString() };

  const { error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", product.id);

  if (error) {
    return { product_id: product.id, ean: product.ean, status: "error", error: error.message };
  }

  return {
    product_id: product.id,
    ean: product.ean,
    status: icecatJson ? "enriched" : "not_found",
    icecat_id: (updatePayload as IcecatProductUpdate).icecat_id,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "icecat-enrich",
      auth: "admin-or-secret",
      rateLimit: { prefix: "icecat-enrich", max: 5, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, corsHeaders, userId }) => {
      const startTime = Date.now();
      const params = body as IcecatEnrichBody;

      // Validate input
      if (!params?.product_ids && !params?.ean && !params?.limit) {
        return jsonResponse(
          { error: "Au moins un paramètre requis : product_ids, ean ou limit" },
          400,
          corsHeaders,
        );
      }

      // Read Icecat credentials (HTTP Basic Auth)
      // Try env vars first, fall back to vault secrets
      let icecatUser = Deno.env.get("ICECAT_USERNAME");
      let icecatPass = Deno.env.get("ICECAT_PASSWORD");
      if (!icecatUser || !icecatPass) {
        const { data: secrets } = await supabaseAdmin
          .schema("vault")
          .from("decrypted_secrets")
          .select("name, decrypted_secret")
          .in("name", ["ICECAT_USERNAME", "ICECAT_PASSWORD"]);
        if (secrets) {
          for (const s of secrets) {
            if (s.name === "ICECAT_USERNAME") icecatUser = s.decrypted_secret;
            if (s.name === "ICECAT_PASSWORD") icecatPass = s.decrypted_secret;
          }
        }
      }
      if (!icecatUser || !icecatPass) {
        return jsonResponse(
          { error: "ICECAT_USERNAME et ICECAT_PASSWORD requis (env vars ou vault)" },
          500,
          corsHeaders,
        );
      }
      const shopName = Deno.env.get("ICECAT_SHOP_NAME") ?? "REINE";
      const icecatHeaders = buildIcecatHeaders(icecatUser, icecatPass);

      // Build query
      let query = supabaseAdmin
        .from("products")
        .select("id, ean, brand, manufacturer_code, manufacturer_ref, name");

      if (params.product_ids?.length) {
        const ids = params.product_ids.slice(0, MAX_PRODUCTS);
        query = query.in("id", ids);
        if (!params.force) {
          query = query.is("icecat_enriched_at", null);
        }
      } else if (params.ean) {
        query = query.eq("ean", params.ean);
        if (!params.force) {
          query = query.is("icecat_enriched_at", null);
        }
      } else {
        query = query.not("ean", "is", null);
        query = query.is("image_url", null);
        query = query.is("description", null);
        if (!params.force) {
          query = query.is("icecat_enriched_at", null);
        }
        query = query.limit(Math.min(params.limit ?? MAX_PRODUCTS, MAX_PRODUCTS));
      }

      const { data: products, error: fetchError } = await query;
      if (fetchError) {
        return jsonResponse(
          { error: `Erreur DB : ${fetchError.message}` },
          500,
          corsHeaders,
        );
      }

      const productList = (products ?? []) as DBProduct[];
      if (productList.length === 0) {
        return { success: true, total: 0, enriched: 0, not_found: 0, errors: 0, results: [] };
      }

      // Process products
      const results: EnrichResult[] = [];
      let enrichedCount = 0;
      let notFoundCount = 0;
      let errorCount = 0;

      for (let i = 0; i < productList.length; i++) {
        const result = await enrichProduct(
          supabaseAdmin,
          productList[i],
          shopName,
          icecatHeaders,
        );
        results.push(result);

        if (result.status === "enriched") enrichedCount++;
        else if (result.status === "not_found") notFoundCount++;
        else errorCount++;

        // Rate limiting between Icecat API calls
        if (i < productList.length - 1) {
          await sleep(RATE_LIMIT_MS);
        }
      }

      const summary = {
        success: true,
        total: productList.length,
        enriched: enrichedCount,
        not_found: notFoundCount,
        errors: errorCount,
        results,
      };

      // Log to cron_job_logs when called without userId (cron mode)
      if (!userId) {
        await supabaseAdmin.from("cron_job_logs").insert({
          job_name: "icecat-enrich-daily",
          status: errorCount > 0 ? "partial" : "success",
          result: JSON.stringify({
            total: productList.length,
            enriched: enrichedCount,
            not_found: notFoundCount,
            errors: errorCount,
          }),
          duration_ms: Date.now() - startTime,
        });
      }

      return summary;
    },
  ),
);
