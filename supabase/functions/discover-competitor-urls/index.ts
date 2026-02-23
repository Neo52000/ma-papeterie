/**
 * discover-competitor-urls
 *
 * For each product × competitor, searches the competitor site by EAN (or name),
 * extracts candidate product URLs from the HTML using regex, then uses AI to
 * pick the best match. Saves results in competitor_product_map.
 *
 * Body (all optional):
 *   productIds?: string[]   — limit to specific products (default: up to 50 with EAN)
 *   competitorIds?: string[] — limit to specific competitors (default: all enabled)
 *   dryRun?: boolean        — simulate without writing to DB (default: false)
 *   batchSize?: number      — products per run (default: 20)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Search URL patterns per domain ──────────────────────────────────────────
// EAN search gives the most precise results.
const SEARCH_PATH: Record<string, string> = {
  "bureau-vallee.fr": "/recherche?q=",
  "jpg.fr":           "/recherche?q=",
  "bruneau.fr":       "/recherche?q=",
  "welcome-office.com": "/search?q=",
};

// ── URL filter: keep only links that look like product pages ─────────────────
const PRODUCT_LINK_RE: Record<string, RegExp> = {
  "bureau-vallee.fr":   /\/p-\d+|\/produits?\//i,
  "jpg.fr":             /\/produits?\//i,
  "bruneau.fr":         /\/produit\//i,
  "welcome-office.com": /\/p\//i,
};
const DEFAULT_PRODUCT_LINK_RE = /\/produits?\//i;

// ── Rate limit between requests (ms) ─────────────────────────────────────────
const DEFAULT_DELAY_MS = 4000;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return ""; }
}

/** Extract all <a href="..."> values from raw HTML */
function extractHrefs(html: string, baseUrl: string): string[] {
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
    try {
      hrefs.push(new URL(href, baseUrl).href);
    } catch { /* relative URL resolve failed */ }
  }
  return hrefs;
}

/** Keep only links that look like product pages, deduplicated */
function filterProductLinks(hrefs: string[], domain: string, baseUrl: string): string[] {
  const re = PRODUCT_LINK_RE[domain] ?? DEFAULT_PRODUCT_LINK_RE;
  const seen = new Set<string>();
  const results: string[] = [];
  for (const href of hrefs) {
    if (!href.startsWith(baseUrl)) continue;
    if (!re.test(href)) continue;
    // Strip query/hash
    const clean = href.split("?")[0].split("#")[0];
    if (seen.has(clean)) continue;
    seen.add(clean);
    results.push(clean);
    if (results.length >= 8) break; // max 8 candidates
  }
  return results;
}

/** Ask AI to pick the best matching product URL */
async function pickBestUrl(
  productName: string,
  productEan: string | null,
  candidateUrls: string[],
  competitorName: string,
): Promise<string | null> {
  if (candidateUrls.length === 0) return null;
  if (candidateUrls.length === 1) return candidateUrls[0];

  const prompt = `Tu es un expert en matching produit e-commerce.

Produit recherché : "${productName}"${productEan ? ` (EAN: ${productEan})` : ""}
Site concurrent : ${competitorName}

URLs de pages produit trouvées dans les résultats de recherche :
${candidateUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Quelle URL correspond le mieux à notre produit ?
Réponds UNIQUEMENT avec le numéro (1, 2, 3…) de la meilleure URL, ou 0 si aucune ne correspond.`;

  try {
    const resp = await callAI(
      [
        { role: "system", content: "Tu es un assistant de matching produit. Réponds uniquement avec un chiffre." },
        { role: "user", content: prompt },
      ],
      { temperature: 0 },
    );
    const idx = parseInt(resp.choices[0].message.content.trim(), 10);
    if (idx > 0 && idx <= candidateUrls.length) return candidateUrls[idx - 1];
  } catch (e: any) {
    console.error("[discover] AI error:", e.message);
    // Fallback: return first candidate
    return candidateUrls[0];
  }
  return null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dryRun === true;
    const batchSize: number = Math.min(body.batchSize ?? 20, 50);
    const requestedProductIds: string[] | undefined = body.productIds;
    const requestedCompetitorIds: string[] | undefined = body.competitorIds;

    // ── Load competitors ───────────────────────────────────────────────────
    let competitorQuery = supabase.from("competitors").select("*").eq("enabled", true);
    if (requestedCompetitorIds?.length) {
      competitorQuery = competitorQuery.in("id", requestedCompetitorIds);
    }
    const { data: competitors, error: cErr } = await competitorQuery;
    if (cErr) throw cErr;
    if (!competitors?.length) {
      return new Response(JSON.stringify({ error: "Aucun concurrent activé en base" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[discover] ${competitors.length} concurrent(s) actif(s)`);

    // ── Load products with EAN ─────────────────────────────────────────────
    let productQuery = supabase
      .from("products")
      .select("id, name, ean")
      .eq("is_active", true)
      .not("ean", "is", null)
      .limit(batchSize);
    if (requestedProductIds?.length) {
      productQuery = productQuery.in("id", requestedProductIds);
    }
    const { data: products, error: pErr } = await productQuery;
    if (pErr) throw pErr;
    if (!products?.length) {
      return new Response(JSON.stringify({ error: "Aucun produit avec EAN trouvé" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[discover] ${products.length} produit(s) à traiter`);

    // ── Already mapped pairs (skip re-discovery) ───────────────────────────
    const { data: existingMaps } = await supabase
      .from("competitor_product_map")
      .select("product_id, competitor_id")
      .in("product_id", products.map((p) => p.id));

    const alreadyMapped = new Set(
      (existingMaps ?? []).map((m) => `${m.product_id}_${m.competitor_id}`),
    );

    // ── Discovery loop ─────────────────────────────────────────────────────
    const stats = { found: 0, skipped: 0, not_found: 0, errors: 0 };
    const details: Array<{ product: string; competitor: string; url: string | null; status: string }> = [];

    for (const product of products) {
      for (const competitor of competitors) {
        const pairKey = `${product.id}_${competitor.id}`;
        if (alreadyMapped.has(pairKey)) {
          stats.skipped++;
          continue;
        }

        const domain = extractDomain(competitor.base_url);
        const searchPath = SEARCH_PATH[domain] ?? "/recherche?q=";
        const query = encodeURIComponent(product.ean ?? product.name);
        const searchUrl = `${competitor.base_url}${searchPath}${query}`;

        console.log(`[discover] ${competitor.name} — ${product.name} (EAN: ${product.ean}) → ${searchUrl}`);

        try {
          // Fetch search results page
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 12000);
          const resp = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "fr-FR,fr;q=0.9",
            },
          });
          clearTimeout(tid);

          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          const html = await resp.text();
          const allHrefs = extractHrefs(html, competitor.base_url);
          const candidates = filterProductLinks(allHrefs, domain, competitor.base_url);

          console.log(`[discover]   ${candidates.length} candidats trouvés`);

          if (candidates.length === 0) {
            stats.not_found++;
            details.push({ product: product.name, competitor: competitor.name, url: null, status: "not_found" });
          } else {
            const bestUrl = await pickBestUrl(product.name, product.ean, candidates, competitor.name);

            if (!bestUrl) {
              stats.not_found++;
              details.push({ product: product.name, competitor: competitor.name, url: null, status: "no_match" });
            } else {
              console.log(`[discover]   ✓ ${bestUrl}`);
              if (!dryRun) {
                await supabase.from("competitor_product_map").upsert({
                  product_id: product.id,
                  competitor_id: competitor.id,
                  product_url: bestUrl,
                  pack_size: 1,
                  active: true,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "product_id,competitor_id" });
              }
              stats.found++;
              details.push({ product: product.name, competitor: competitor.name, url: bestUrl, status: dryRun ? "dry_run" : "mapped" });
            }
          }

          // Rate limit
          const rateMs = competitor.rate_limit_ms ?? DEFAULT_DELAY_MS;
          await delay(rateMs);

        } catch (err: any) {
          console.error(`[discover] ✗ ${competitor.name} / ${product.name}: ${err.message}`);
          stats.errors++;
          details.push({ product: product.name, competitor: competitor.name, url: null, status: `error: ${err.message}` });
          await delay(2000);
        }
      }
    }

    console.log(`[discover] Terminé: ${JSON.stringify(stats)}`);

    return new Response(
      JSON.stringify({ success: true, dry_run: dryRun, stats, details }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("[discover] Fatal:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
