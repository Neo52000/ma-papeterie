import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * Enrich Missing Data
 *
 * Identifie les produits avec données manquantes et retourne une liste
 * priorisée pour l'enrichissement (crawl, saisie manuelle, etc.).
 *
 * Paramètres :
 * - missing : string[] — Champs manquants à chercher (ex: ["image", "description", "weight", "dimensions"])
 * - limit : number — Nombre max de résultats (défaut: 50)
 * - offset : number — Pagination
 * - supplier : string — Filtrer par fournisseur (optionnel)
 * - sort_by : "priority" | "name" | "created_at" — Tri (défaut: "priority" basé sur complétude)
 */

interface MissingField {
  field: string;
  column: string;
  jsonPath?: string;
}

const FIELD_MAPPINGS: Record<string, MissingField> = {
  image: { field: "image", column: "image_url" },
  description: { field: "description", column: "description" },
  weight: { field: "weight", column: "weight_kg" },
  dimensions: { field: "dimensions", column: "dimensions_cm" },
  brand: { field: "brand", column: "brand" },
  ean: { field: "ean", column: "ean" },
  price: { field: "price", column: "price_ttc" },
  category: { field: "category", column: "category_id" },
  color: { field: "color", column: "color" },
};

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "enrich-missing-data");
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
    const missing: string[] = body.missing || ["image", "description", "weight", "dimensions"];
    const limit = Math.min(body.limit || 50, 200);
    const offset = body.offset || 0;
    const supplier = body.supplier || null;
    const sortBy = body.sort_by || "priority";
    const activeOnly = body.active_only !== false;

    // Validate requested fields
    const validFields = missing.filter((f) => FIELD_MAPPINGS[f]);
    if (validFields.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No valid fields specified",
          valid_fields: Object.keys(FIELD_MAPPINGS),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the query — find products where ANY of the requested fields is null/empty
    let query = supabase
      .from("products")
      .select(
        "id, name, ean, brand, category, subcategory, image_url, description, weight_kg, dimensions_cm, color, price_ttc, category_id, is_active, created_at, updated_at",
        { count: "exact" },
      );

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    // Build OR filter for missing fields
    const orConditions = validFields.map((f) => {
      const mapping = FIELD_MAPPINGS[f];
      // Check for null or empty string
      return `${mapping.column}.is.null`;
    });
    query = query.or(orConditions.join(","));

    // Filter by supplier if specified
    if (supplier) {
      const { data: supplierProducts } = await supabase
        .from("supplier_products")
        .select("product_id")
        .eq("supplier_id", supplier);

      if (supplierProducts && supplierProducts.length > 0) {
        const productIds = supplierProducts.map((sp: any) => sp.product_id);
        query = query.in("id", productIds);
      }
    }

    // Sorting
    if (sortBy === "name") {
      query = query.order("name");
    } else if (sortBy === "created_at") {
      query = query.order("created_at", { ascending: false });
    } else {
      // Priority: products missing more fields first, then by name
      query = query.order("updated_at", { ascending: true });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;
    if (error) throw error;

    // Compute missing fields per product and completeness score
    const enrichedProducts = (products || []).map((p: any) => {
      const missingFields: string[] = [];
      let totalChecked = 0;
      let totalPresent = 0;

      for (const f of Object.keys(FIELD_MAPPINGS)) {
        const mapping = FIELD_MAPPINGS[f];
        totalChecked++;
        const value = p[mapping.column];
        if (value === null || value === undefined || value === "" || value === 0) {
          missingFields.push(f);
        } else {
          totalPresent++;
        }
      }

      const completeness = totalChecked > 0 ? Math.round((totalPresent / totalChecked) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        ean: p.ean,
        brand: p.brand,
        category: p.category,
        image_url: p.image_url,
        completeness,
        missing_fields: missingFields,
        missing_count: missingFields.length,
      };
    });

    // Sort by priority (most missing fields first)
    if (sortBy === "priority") {
      enrichedProducts.sort((a: any, b: any) => b.missing_count - a.missing_count);
    }

    // Aggregate stats
    const stats: Record<string, number> = {};
    for (const f of Object.keys(FIELD_MAPPINGS)) {
      stats[f] = 0;
    }

    // Count total missing per field (from full dataset, not just this page)
    for (const f of Object.keys(FIELD_MAPPINGS)) {
      const mapping = FIELD_MAPPINGS[f];
      const { count: missingCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is(mapping.column, null)
        .eq("is_active", true);
      stats[f] = missingCount || 0;
    }

    return new Response(
      JSON.stringify({
        products: enrichedProducts,
        total: count || 0,
        limit,
        offset,
        stats,
        requested_fields: validFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'analyse des données manquantes" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
