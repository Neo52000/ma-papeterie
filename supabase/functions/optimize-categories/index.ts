import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * Optimize Categories
 *
 * Analyse l'arborescence des catégories et retourne :
 * - Statistiques par catégorie (nombre de produits, sous-catégories)
 * - Catégories vides ou quasi-vides
 * - Produits sans catégorie ou avec "Non classé"
 * - Doublons potentiels (noms similaires)
 * - Suggestions de fusion/restructuration
 *
 * Paramètres :
 * - action : "analyze" | "uncategorized" | "duplicates" | "empty" (défaut: "analyze")
 * - min_similarity : number — Seuil de similarité pour doublons (défaut: 0.7)
 * - limit : number — Limite de résultats (défaut: 100)
 */

// ── Fuzzy matching utilities ──

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(/\s+/).filter(Boolean));
  const wordsB = new Set(nb.split(/\s+/).filter(Boolean));
  const inter = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = union > 0 ? inter / union : 0;

  const maxLen = Math.max(na.length, nb.length);
  const lev = maxLen > 0 ? 1 - levenshtein(na, nb) / maxLen : 0;

  return jaccard * 0.6 + lev * 0.4;
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "optimize-categories");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "analyze";
    const minSimilarity = body.min_similarity || 0.7;
    const limit = Math.min(body.limit || 100, 500);

    // Load all categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, slug, level, parent_id, is_active, sort_order")
      .order("level")
      .order("sort_order");

    if (catError) throw catError;

    // Count products per category
    const { data: productCounts } = await supabase
      .rpc("get_category_product_counts")
      .catch(() => ({ data: null }));

    // Fallback: manual count if RPC doesn't exist
    let countMap = new Map<string, number>();
    if (productCounts) {
      for (const pc of productCounts) {
        countMap.set(pc.category_id, pc.count);
      }
    } else {
      // Count via category_id
      const { data: products } = await supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true)
        .not("category_id", "is", null);

      if (products) {
        for (const p of products) {
          countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
        }
      }
    }

    // Count products by text category field (for uncategorized detection)
    const { data: textCategoryCounts } = await supabase
      .from("products")
      .select("category")
      .eq("is_active", true);

    const textCatMap = new Map<string, number>();
    if (textCategoryCounts) {
      for (const p of textCategoryCounts) {
        const cat = p.category || "Non classé";
        textCatMap.set(cat, (textCatMap.get(cat) || 0) + 1);
      }
    }

    switch (action) {
      // ── Full analysis ──
      case "analyze": {
        const totalProducts = textCategoryCounts?.length || 0;
        const totalCategories = categories?.length || 0;
        const activeCategories = categories?.filter((c: any) => c.is_active).length || 0;

        // Categories with product counts
        const categoryStats = (categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          is_active: c.is_active,
          product_count: countMap.get(c.id) || 0,
          has_children: (categories || []).some((ch: any) => ch.parent_id === c.id),
        }));

        // Empty categories (no products and no children with products)
        const emptyCategories = categoryStats.filter(
          (c) => c.product_count === 0 && c.is_active
        );

        // Uncategorized products count
        const uncategorizedCount =
          (textCatMap.get("Non classé") || 0) +
          (textCatMap.get("") || 0);

        // Products without category_id
        const { count: nullCategoryCount } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .is("category_id", null);

        // Level distribution
        const levelDist: Record<string, number> = {};
        for (const c of categories || []) {
          levelDist[c.level] = (levelDist[c.level] || 0) + 1;
        }

        // Potential duplicates (similar names at same level)
        const duplicates: Array<{ a: any; b: any; score: number }> = [];
        const cats = categories || [];
        for (let i = 0; i < cats.length; i++) {
          for (let j = i + 1; j < cats.length; j++) {
            if (cats[i].level !== cats[j].level) continue;
            const score = similarity(cats[i].name, cats[j].name);
            if (score >= minSimilarity && score < 1.0) {
              duplicates.push({
                a: { id: cats[i].id, name: cats[i].name, level: cats[i].level },
                b: { id: cats[j].id, name: cats[j].name, level: cats[j].level },
                score: Math.round(score * 100) / 100,
              });
            }
          }
        }
        duplicates.sort((a, b) => b.score - a.score);

        return new Response(
          JSON.stringify({
            summary: {
              total_products: totalProducts,
              total_categories: totalCategories,
              active_categories: activeCategories,
              empty_categories: emptyCategories.length,
              uncategorized_products: uncategorizedCount,
              products_without_category_id: nullCategoryCount || 0,
              potential_duplicates: duplicates.length,
              level_distribution: levelDist,
            },
            empty_categories: emptyCategories.slice(0, limit),
            potential_duplicates: duplicates.slice(0, limit),
            top_categories: categoryStats
              .filter((c) => c.product_count > 0)
              .sort((a, b) => b.product_count - a.product_count)
              .slice(0, 20),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Uncategorized products ──
      case "uncategorized": {
        const { data: uncategorized, count } = await supabase
          .from("products")
          .select("id, name, ean, brand, category, subcategory", { count: "exact" })
          .eq("is_active", true)
          .is("category_id", null)
          .order("name")
          .limit(limit);

        // Suggest categories for each product based on text category
        const suggestions = (uncategorized || []).map((p: any) => {
          const textCat = p.category || "";
          let bestMatch: { id: string; name: string; score: number } | null = null;

          for (const c of categories || []) {
            if (!c.is_active) continue;
            const score = similarity(textCat, c.name);
            if (score > (bestMatch?.score || 0.4)) {
              bestMatch = { id: c.id, name: c.name, score: Math.round(score * 100) / 100 };
            }
          }

          return {
            product_id: p.id,
            name: p.name,
            ean: p.ean,
            brand: p.brand,
            text_category: textCat,
            text_subcategory: p.subcategory,
            suggested_category: bestMatch,
          };
        });

        return new Response(
          JSON.stringify({ uncategorized: suggestions, total: count || 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Duplicate detection ──
      case "duplicates": {
        const cats = categories || [];
        const duplicates: Array<{
          a: { id: string; name: string; level: string; product_count: number };
          b: { id: string; name: string; level: string; product_count: number };
          score: number;
        }> = [];

        for (let i = 0; i < cats.length; i++) {
          for (let j = i + 1; j < cats.length; j++) {
            if (cats[i].level !== cats[j].level) continue;
            const score = similarity(cats[i].name, cats[j].name);
            if (score >= minSimilarity && score < 1.0) {
              duplicates.push({
                a: {
                  id: cats[i].id,
                  name: cats[i].name,
                  level: cats[i].level,
                  product_count: countMap.get(cats[i].id) || 0,
                },
                b: {
                  id: cats[j].id,
                  name: cats[j].name,
                  level: cats[j].level,
                  product_count: countMap.get(cats[j].id) || 0,
                },
                score: Math.round(score * 100) / 100,
              });
            }
          }
        }

        duplicates.sort((a, b) => b.score - a.score);

        return new Response(
          JSON.stringify({ duplicates: duplicates.slice(0, limit), total: duplicates.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Empty categories ──
      case "empty": {
        const emptyList = (categories || [])
          .filter((c: any) => c.is_active && (countMap.get(c.id) || 0) === 0)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            level: c.level,
            parent_id: c.parent_id,
            has_children: (categories || []).some((ch: any) => ch.parent_id === c.id),
          }));

        return new Response(
          JSON.stringify({ empty_categories: emptyList, total: emptyList.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}`, valid_actions: ["analyze", "uncategorized", "duplicates", "empty"] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'analyse des catégories" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
