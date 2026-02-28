import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'agent-seo');
  if (!checkRateLimit(rlKey, 10, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const startTime = Date.now();

  try {
    const { product_ids, limit = 10 } = await req.json().catch(() => ({}));

    // Fetch products needing SEO
    let query = supabase
      .from("products")
      .select("id, name, description, category, ean, price, price_ttc, attributs, badge, eco")
      .eq("is_active", true);

    if (product_ids?.length) {
      query = query.in("id", product_ids);
    } else {
      // Products without SEO yet
      const { data: existingSeo } = await supabase
        .from("product_seo")
        .select("product_id");
      const existingIds = existingSeo?.map(s => s.product_id) || [];
      if (existingIds.length > 0) {
        query = query.not("id", "in", `(${existingIds.join(",")})`);
      }
      query = query.limit(limit);
    }

    const { data: products, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: "No products need SEO", processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0, errors = 0;

    for (const product of products) {
      try {
        const prompt = `Tu es un expert SEO e-commerce pour une papeterie française. Génère du contenu SEO optimisé pour ce produit :

Nom : ${product.name}
Catégorie : ${product.category}
Description actuelle : ${product.description || "Aucune"}
EAN : ${product.ean || "Non renseigné"}
Prix TTC : ${product.price_ttc || product.price}€
Attributs : ${JSON.stringify(product.attributs || {})}
Écologique : ${product.eco ? "Oui" : "Non"}

Génère au format JSON strict (sans markdown) :
{
  "meta_title": "titre < 60 caractères avec mot-clé principal",
  "meta_description": "description < 160 caractères incitative",
  "description_courte": "2-3 phrases accrocheuses pour la fiche produit",
  "description_longue": "5-8 phrases détaillées, avantages, usage, qualité",
  "json_ld": { "@context": "https://schema.org", "@type": "Product", "name": "...", "description": "...", "sku": "${product.ean || ""}", "offers": { "@type": "Offer", "price": "${product.price_ttc || product.price}", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" } },
  "seo_score": 0-100
}`;

        const aiData = await callAI(
          [{ role: "user", content: prompt }],
          { temperature: 0.7 }
        );
        const content = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in AI response");

        const seoData = JSON.parse(jsonMatch[0]);

        // Upsert SEO data
        await supabase.from("product_seo").upsert({
          product_id: product.id,
          meta_title: seoData.meta_title,
          meta_description: seoData.meta_description,
          description_courte: seoData.description_courte,
          description_longue: seoData.description_longue,
          json_ld: seoData.json_ld,
          seo_score: seoData.seo_score || 50,
          status: "draft",
          generated_at: new Date().toISOString(),
        }, { onConflict: "product_id" });

        processed++;

        // Log success
        await supabase.from("agent_logs").insert({
          agent_name: "agent-seo",
          action: "generate_seo",
          status: "success",
          product_id: product.id,
          output_data: { seo_score: seoData.seo_score, meta_title: seoData.meta_title },
        });

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (productError: any) {
        errors++;
        await supabase.from("agent_logs").insert({
          agent_name: "agent-seo",
          action: "generate_seo",
          status: "error",
          product_id: product.id,
          error_message: productError.message?.substring(0, 500),
        });
      }
    }

    const duration = Date.now() - startTime;

    await supabase.from("agent_logs").insert({
      agent_name: "agent-seo",
      action: "batch_complete",
      status: errors === 0 ? "success" : "partial",
      duration_ms: duration,
      output_data: { processed, errors, total: products.length },
    });

    return new Response(JSON.stringify({
      message: "SEO generation completed",
      processed,
      errors,
      total: products.length,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    await supabase.from("agent_logs").insert({
      agent_name: "agent-seo",
      action: "batch_complete",
      status: "error",
      duration_ms: duration,
      error_message: error.message,
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
