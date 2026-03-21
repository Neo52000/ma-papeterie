import { createHandler } from "../_shared/handler.ts";
import { callAI } from "../_shared/ai-client.ts";

Deno.serve(createHandler({
  name: "agent-descriptions",
  auth: "admin",
  rateLimit: { prefix: "agent-descriptions", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const startTime = Date.now();

  const { product_ids, limit = 10 } = (body || {}) as { product_ids?: string[]; limit?: number };

  // Fetch products needing descriptions
  let query = supabaseAdmin
    .from("products")
    .select("id, name, category, subcategory, ean, brand, description, attributs, dimensions_cm, weight_kg, eco, is_end_of_life, price_ttc, price_ht")
    .eq("is_active", true);

  if (product_ids?.length) {
    query = query.in("id", product_ids);
  } else {
    query = query.or("description.is.null,description.eq.");
    query = query.limit(limit);
  }

  const { data: products, error: fetchError } = await query;
  if (fetchError) throw fetchError;

  if (!products || products.length === 0) {
    return { message: "Aucun produit sans description", processed: 0 };
  }

  let processed = 0, errors = 0;

  for (const product of products) {
    try {
      // Fetch supplier data for this product
      const { data: supplierProducts } = await supabaseAdmin
        .from("supplier_products")
        .select("supplier_reference, supplier_price, notes, quantity_discount, min_order_quantity, source_type, suppliers(name)")
        .eq("product_id", product.id);

      const supplierInfo = (supplierProducts || []).map((sp: any) => ({
        fournisseur: sp.suppliers?.name || "Inconnu",
        reference: sp.supplier_reference,
        prix_achat: sp.supplier_price,
        notes: sp.notes,
        conditionnement: sp.quantity_discount,
        qte_min: sp.min_order_quantity,
        source: sp.source_type,
      }));

      const prompt = `Tu es un rédacteur expert en papeterie et fournitures de bureau pour un site e-commerce français. Génère des descriptions produit riches, précises et vendeuses en exploitant toutes les données disponibles.

PRODUIT :
- Nom : ${product.name}
- Catégorie : ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ""}
- Marque : ${product.brand || "Non spécifiée"}
- EAN : ${product.ean || "Non renseigné"}
- Prix TTC : ${product.price_ttc || "N/A"}€
- Dimensions : ${product.dimensions_cm || "Non renseignées"}
- Poids : ${product.weight_kg ? product.weight_kg + " kg" : "Non renseigné"}
- Attributs : ${JSON.stringify(product.attributs || {})}
- Produit éco-responsable : ${product.eco ? "Oui" : "Non"}
- Fin de série : ${product.is_end_of_life ? "Oui" : "Non"}

DONNÉES FOURNISSEURS (${supplierInfo.length} fournisseur(s)) :
${supplierInfo.length > 0 ? supplierInfo.map((s, i) => `Fournisseur ${i + 1} - ${s.fournisseur} :
  - Réf : ${s.reference || "N/A"}
  - Notes : ${s.notes || "Aucune"}
  - Conditionnement : ${JSON.stringify(s.conditionnement) || "Standard"}
  - Qté min : ${s.qte_min || "1"}
  - Source : ${s.source || "N/A"}`).join("\n") : "Aucune donnée fournisseur disponible."}

CONSIGNES :
- description_courte : 2-3 phrases accrocheuses, met en avant le bénéfice principal et les caractéristiques clés
- description_longue : 5-8 phrases détaillées. Intègre les infos techniques des fournisseurs (matériaux, conditionnement, certifications). Mentionne l'aspect éco si applicable. Ton professionnel mais accessible.
- qualite_score : 0-100, évalue la richesse des données disponibles pour générer la description

Réponds UNIQUEMENT en JSON strict (pas de markdown) :
{
  "description_courte": "...",
  "description_longue": "...",
  "qualite_score": 75
}`;

      const aiData = await callAI(
        [{ role: "user", content: prompt }],
        { temperature: 0.7 }
      );
      const content = aiData.choices?.[0]?.message?.content || "";

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in AI response");

      const descData = JSON.parse(jsonMatch[0]);

      // Update products.description with the short description
      await supabaseAdmin
        .from("products")
        .update({ description: descData.description_courte })
        .eq("id", product.id);

      // Upsert product_seo with both descriptions
      await supabaseAdmin.from("product_seo").upsert({
        product_id: product.id,
        description_courte: descData.description_courte,
        description_longue: descData.description_longue,
        status: "draft",
        generated_at: new Date().toISOString(),
      }, { onConflict: "product_id" });

      processed++;

      await supabaseAdmin.from("agent_logs").insert({
        agent_name: "agent-descriptions",
        action: "generate_description",
        status: "success",
        product_id: product.id,
        output_data: { qualite_score: descData.qualite_score, suppliers_count: supplierInfo.length },
      });

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (productError: any) {
      errors++;
      await supabaseAdmin.from("agent_logs").insert({
        agent_name: "agent-descriptions",
        action: "generate_description",
        status: "error",
        product_id: product.id,
        error_message: productError.message?.substring(0, 500),
      });
    }
  }

  const duration = Date.now() - startTime;

  await supabaseAdmin.from("agent_logs").insert({
    agent_name: "agent-descriptions",
    action: "batch_complete",
    status: errors === 0 ? "success" : "partial",
    duration_ms: duration,
    output_data: { processed, errors, total: products.length },
  });

  return {
    message: "Génération descriptions terminée",
    processed,
    errors,
    total: products.length,
    duration_ms: duration,
  };
}));
