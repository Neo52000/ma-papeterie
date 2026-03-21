import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * Analytics Catalogue — Alertes santé du catalogue produits.
 *
 * Retourne les produits en rupture, stock bas, sans image, sans description,
 * ainsi que des statistiques globales.
 */

interface CatalogueProduct {
  id: string;
  name: string;
  slug: string | null;
  stock_quantity: number | null;
  price_ttc: number | null;
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "analytics-catalogue");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const selectCols = "id, name, slug, stock_quantity, price_ttc";

    // Toutes les requêtes en parallèle
    const [
      rupturesRes,
      stockBasRes,
      sansImageRes,
      sansDescriptionRes,
      statsRes,
    ] = await Promise.all([
      // 1. Produits en rupture de stock
      supabase
        .from("products")
        .select(selectCols)
        .eq("is_active", true)
        .lte("stock_quantity", 0)
        .order("price_ttc", { ascending: false })
        .limit(20),

      // 2. Produits avec stock bas (entre 1 et min_stock_alert ou 5 par défaut)
      // On récupère les produits avec stock > 0 et stock <= 5, puis filtre côté JS
      // pour tenir compte de min_stock_alert
      supabase
        .from("products")
        .select(`${selectCols}, min_stock_alert`)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .lte("stock_quantity", 20) // marge large, filtrée côté JS
        .order("stock_quantity", { ascending: true })
        .limit(100),

      // 3. Produits sans image principale
      supabase
        .from("products")
        .select("id, name, slug")
        .eq("is_active", true)
        .or("image_url.is.null,image_url.eq.")
        .limit(20),

      // 4. Produits sans description suffisante (< 50 chars)
      // Supabase JS ne supporte pas LENGTH(), on récupère et filtre en JS
      supabase
        .from("products")
        .select("id, name, slug, description")
        .eq("is_active", true)
        .limit(500),

      // 5. Statistiques globales
      supabase
        .from("products")
        .select("id, is_active, stock_quantity, min_stock_alert, image_url, description")
        .eq("is_active", true),
    ]);

    // Traitement ruptures
    const ruptures: CatalogueProduct[] = (rupturesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock_quantity: p.stock_quantity,
      price_ttc: p.price_ttc,
    }));

    // Traitement stock bas — filtrer avec min_stock_alert
    const stockBasRaw = stockBasRes.data ?? [];
    const stockBas: CatalogueProduct[] = stockBasRaw
      .filter((p) => {
        const seuil = p.min_stock_alert ?? 5;
        return p.stock_quantity > 0 && p.stock_quantity <= seuil;
      })
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        stock_quantity: p.stock_quantity,
        price_ttc: p.price_ttc,
      }));

    // Traitement sans image
    const sansImage: CatalogueProduct[] = (sansImageRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
    }));

    // Traitement sans description (filtre < 50 caractères côté JS)
    const sansDescriptionRaw = sansDescriptionRes.data ?? [];
    const sansDescription: CatalogueProduct[] = sansDescriptionRaw
      .filter((p) => !p.description || p.description.length < 50)
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      }));

    // Calcul statistiques globales
    const allActive = statsRes.data ?? [];
    const total = allActive.length;
    const rupturesCount = allActive.filter(
      (p) => p.stock_quantity !== null && p.stock_quantity <= 0,
    ).length;
    const stockBasCount = allActive.filter((p) => {
      const seuil = p.min_stock_alert ?? 5;
      return p.stock_quantity !== null && p.stock_quantity > 0 && p.stock_quantity <= seuil;
    }).length;
    const sansImageCount = allActive.filter(
      (p) => !p.image_url || p.image_url === "",
    ).length;
    const sansDescriptionCount = allActive.filter(
      (p) => !p.description || p.description.length < 50,
    ).length;

    return new Response(
      JSON.stringify({
        stats: {
          total,
          actifs: total,
          ruptures: rupturesCount,
          stock_bas: stockBasCount,
          sans_image: sansImageCount,
          sans_description: sansDescriptionCount,
        },
        ruptures,
        stock_bas: stockBas,
        sans_image: sansImage,
        sans_description: sansDescription,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[analytics-catalogue] Erreur:", err);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'analyse du catalogue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
