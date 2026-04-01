// Edge Function : process-school-list
// Pipeline unifié : GLM-OCR → Claude Anthropic (parsing) → Matching produits → Résultats
import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedItem {
  nom: string;
  qte: number;
  couleur: string | null;
  format: string | null;
  marque_imposee: boolean;
}

interface MatchedProduct {
  id: string;
  name: string;
  price_ht: number;
  price_ttc: number;
  image_url: string | null;
  stock_quantity: number;
  slug: string;
  brand: string | null;
  eco: boolean;
}

interface MatchResult {
  item: ParsedItem;
  status: "matched" | "partial" | "unmatched";
  confidence: number;
  product: MatchedProduct | null;
  alternatives: MatchedProduct[];
}

// ── System prompt Claude pour le parsing structuré ─────────────────────────

const PARSE_SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de listes scolaires françaises.
Tu reçois le texte brut extrait par OCR d'une liste scolaire (PDF ou photo).

TON UNIQUE OUTPUT est un objet JSON valide, sans aucun texte avant ou après,
sans balises markdown, sans backticks.

Structure exacte :
{
  "classe": "CE2" | "6ème" | null,
  "ecole": "École Jules Ferry" | null,
  "items": [
    {
      "nom": "cahier 96 pages grands carreaux",
      "qte": 3,
      "couleur": "bleu" | null,
      "format": "24x32" | "A4" | null,
      "marque_imposee": false
    }
  ]
}

RÈGLES STRICTES :
1. Normalise les quantités : "x2", "deux", "2 exemplaires", "(×3)" → nombre entier.
   Si aucune quantité précisée → 1 par défaut.
2. Normalise les noms : minuscules, sans ponctuation superflue, sans la marque
   si marque_imposee = false (ex: "cahier Clairefontaine" → "cahier").
3. marque_imposee = true uniquement si la liste dit explicitement "marque imposée",
   "impératif", ou similaire à côté de l'article.
4. Ignore les titres de section ("LISTE POUR LA CLASSE DE...", "MATÉRIEL OBLIGATOIRE"),
   les numéros de ligne, et les mentions administratives (nom de l'école, date,
   signature directeur).
5. Fusionne les doublons évidents (même article listé deux fois).
6. Si un article est illisible ou ambigu, inclus-le quand même avec le texte brut
   dans "nom" pour permettre la recherche.
7. Maximum 60 items. Si plus, ne garder que les 60 premiers.

EXEMPLES D'ENTRÉE → SORTIE :
Entrée : "3 cahiers grands carreaux 96 pages 24x32\\n1 trousse vide\\n2 stylos bille bleus"
Sortie :
{
  "classe": null,
  "ecole": null,
  "items": [
    {"nom": "cahier 96 pages grands carreaux", "qte": 3, "couleur": null, "format": "24x32", "marque_imposee": false},
    {"nom": "trousse vide", "qte": 1, "couleur": null, "format": null, "marque_imposee": false},
    {"nom": "stylo bille", "qte": 2, "couleur": "bleu", "format": null, "marque_imposee": false}
  ]
}`;

// ── Handler principal ──────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "process-school-list",
  auth: "admin",
  rateLimit: { prefix: "process-school", max: 10, windowMs: 3_600_000 },
  maxBodyBytes: 0, // désactiver la limite body (les fichiers vont dans le storage)
}, async ({ supabaseAdmin, body, userId, corsHeaders }) => {
  const { uploadId } = body as { uploadId?: string };
  if (!uploadId) throw new Error("uploadId requis");

  // Récupérer le record upload
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from("school_list_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .single();

  if (uploadError || !upload) throw new Error("Upload introuvable");

  // Passer en status processing
  await supabaseAdmin
    .from("school_list_uploads")
    .update({ status: "processing" })
    .eq("id", uploadId);

  try {
    // ── Étape 1 : Télécharger le fichier depuis le storage ──────────────
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from("school-lists")
      .download(upload.file_path);

    if (fileError || !fileData) throw new Error("Impossible de télécharger le fichier");

    const isImage = upload.file_type?.startsWith("image/") ?? false;
    const isPdf = upload.file_type === "application/pdf";
    const isTextBased = !isImage && !isPdf;

    // ── Étape 2 : Extraction texte (GLM-OCR ou lecture directe) ─────────
    let ocrText: string;

    if (isTextBased) {
      // Fichiers texte/CSV/Excel : lecture directe
      ocrText = await fileData.text();
    } else {
      // Images et PDFs : appel GLM-OCR MaaS API
      ocrText = await callGlmOcr(fileData, upload.file_type);
    }

    // Sauvegarder le texte OCR brut
    await supabaseAdmin
      .from("school_list_uploads")
      .update({ ocr_text: ocrText.substring(0, 10_000) })
      .eq("id", uploadId);

    console.log(`[process-school-list] OCR terminé, ${ocrText.length} chars extraits`);

    // ── Étape 3 : Parsing structuré via Claude Anthropic ────────────────
    const parsed = await callClaudeForParsing(ocrText);

    const items: ParsedItem[] = parsed.items ?? [];
    if (items.length === 0) {
      throw new Error("Aucun article extrait de la liste");
    }

    console.log(`[process-school-list] ${items.length} articles parsés (classe: ${parsed.classe ?? "?"})`);

    // ── Étape 4 : Matching produits (full-text search + fallback) ───────
    const matchResults: MatchResult[] = [];
    let matchedCount = 0;
    let partialCount = 0;
    let unmatchedCount = 0;

    for (const item of items) {
      const result = await matchProduct(supabaseAdmin, item);
      matchResults.push(result);

      if (result.status === "matched") matchedCount++;
      else if (result.status === "partial") partialCount++;
      else unmatchedCount++;
    }

    const stats = {
      total_items: items.length,
      matched: matchedCount,
      partial: partialCount,
      unmatched: unmatchedCount,
    };

    console.log(`[process-school-list] Matching terminé:`, stats);

    // ── Étape 5 : Sauvegarder dans school_list_matches ──────────────────
    // Supprimer les anciens matches pour cet upload
    await supabaseAdmin
      .from("school_list_matches")
      .delete()
      .eq("upload_id", uploadId);

    const matchRows = matchResults.map((r) => ({
      upload_id: uploadId,
      item_label: r.item.nom,
      item_quantity: r.item.qte,
      is_mandatory: true,
      constraints: [r.item.couleur, r.item.format, r.item.marque_imposee ? "marque imposée" : null]
        .filter(Boolean)
        .join(", ") || null,
      match_status: r.status,
      confidence: r.confidence,
      candidates: r.product
        ? [
            toCandidate(r.product, r.confidence, "equilibre"),
            ...r.alternatives.map((a) => toCandidate(a, r.confidence * 0.8, "essentiel")),
          ]
        : [],
      selected_product_id: r.product?.id ?? null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("school_list_matches")
      .insert(matchRows);

    if (insertError) {
      console.error("Insert matches error:", insertError);
      throw new Error("Erreur insertion des correspondances");
    }

    // ── Étape 6 : Construire les 3 paniers ──────────────────────────────
    await buildCarts(supabaseAdmin, uploadId, matchResults);

    // ── Étape 7 : Sauvegarder la session analytique ─────────────────────
    await supabaseAdmin.from("school_list_sessions").insert({
      user_id: userId,
      upload_id: uploadId,
      filename: upload.file_name,
      mime_type: upload.file_type,
      classe: parsed.classe ?? null,
      ecole: parsed.ecole ?? null,
      ocr_text: ocrText.substring(0, 10_000),
      parsed_items: items,
      match_results: matchResults.map((r) => ({
        item: r.item.nom,
        status: r.status,
        confidence: r.confidence,
        product_id: r.product?.id ?? null,
        product_name: r.product?.name ?? null,
      })),
      stats,
    });

    // ── Étape 8 : Mettre à jour le status upload ────────────────────────
    await supabaseAdmin
      .from("school_list_uploads")
      .update({
        status: "completed",
        items_count: items.length,
      })
      .eq("id", uploadId);

    return {
      success: true,
      items_count: items.length,
      classe: parsed.classe ?? null,
      ecole: parsed.ecole ?? null,
      stats,
      matched: matchedCount,
      unmatched: unmatchedCount,
    };
  } catch (error) {
    console.error("[process-school-list] Error:", error);

    await supabaseAdmin
      .from("school_list_uploads")
      .update({ status: "error", error_message: (error as Error).message })
      .eq("id", uploadId);

    return jsonResponse(
      { error: (error as Error).message },
      500,
      corsHeaders,
    );
  }
}));

// ── GLM-OCR MaaS API ──────────────────────────────────────────────────────

async function callGlmOcr(fileBlob: Blob, mimeType: string): Promise<string> {
  const apiKey = Deno.env.get("ZHIPU_API_KEY") || Deno.env.get("GLMOCR_API_KEY") || Deno.env.get("GLM_OCR_API_KEY");
  if (!apiKey) throw new Error("GLM-OCR API key non configurée (ZHIPU_API_KEY)");

  // Convertir le fichier en base64 data URI
  const buffer = await fileBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((s: string, b: number) => s + String.fromCharCode(b), ""),
  );
  const dataUri = `data:${mimeType};base64,${base64}`;

  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/layout_parsing", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-ocr",
      file: dataUri,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`GLM-OCR error ${response.status}:`, errText);
    throw new Error(`GLM-OCR API error: ${response.status}`);
  }

  const result = await response.json();

  // Extraire le texte du résultat GLM-OCR
  // Le format de réponse contient un champ markdown_result ou json_result
  const extractedText =
    result?.output?.markdown_result ??
    result?.output?.content ??
    result?.data?.markdown_result ??
    result?.data?.content ??
    result?.markdown_result ??
    result?.content ??
    result?.choices?.[0]?.message?.content ??
    "";

  if (!extractedText) {
    console.error("GLM-OCR empty result:", JSON.stringify(result).substring(0, 500));
    throw new Error("GLM-OCR n'a pas retourné de texte");
  }

  return String(extractedText);
}

// ── Claude Anthropic API ───────────────────────────────────────────────────

async function callClaudeForParsing(
  ocrText: string,
): Promise<{ classe: string | null; ecole: string | null; items: ParsedItem[] }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.1,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Voici le texte OCR extrait d'une liste scolaire. Analyse-le et retourne le JSON structuré :\n\n${ocrText.substring(0, 8000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Claude API error ${response.status}:`, errText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result?.content?.[0]?.text ?? "";

  // Parser le JSON de la réponse
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      classe: parsed.classe ?? null,
      ecole: parsed.ecole ?? null,
      items: (parsed.items ?? []).map((item: Record<string, unknown>) => ({
        nom: String(item.nom ?? item.label ?? "article inconnu"),
        qte: Number(item.qte ?? item.qty ?? item.quantity ?? 1),
        couleur: item.couleur ? String(item.couleur) : null,
        format: item.format ? String(item.format) : null,
        marque_imposee: Boolean(item.marque_imposee ?? false),
      })),
    };
  } catch {
    console.error("Parse error, raw Claude response:", content.substring(0, 500));
    throw new Error("Impossible de parser la réponse Claude");
  }
}

// ── Matching produit (full-text search + fallback trigram) ──────────────────

async function matchProduct(
  supabaseAdmin: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  item: ParsedItem,
): Promise<MatchResult> {
  const searchQuery = [item.nom, item.couleur, item.format].filter(Boolean).join(" ");

  // Tentative 1 : full-text search PostgreSQL
  const { data: ftsResults } = await supabaseAdmin.rpc("search_school_list_products", {
    search_query: searchQuery,
    max_results: 5,
  });

  if (ftsResults && ftsResults.length > 0) {
    return buildMatchResult(item, ftsResults);
  }

  // Tentative 2 : fallback ILIKE sur les mots-clés principaux
  const keywords = item.nom
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 4);

  if (keywords.length === 0) {
    return { item, status: "unmatched", confidence: 0, product: null, alternatives: [] };
  }

  // Construire une requête ILIKE avec les mots-clés
  let query = supabaseAdmin
    .from("products")
    .select("id, name, description, price_ht, price_ttc, image_url, stock_quantity, slug, brand, eco")
    .eq("is_active", true)
    .gt("stock_quantity", 0);

  for (const kw of keywords) {
    query = query.ilike("name", `%${kw}%`);
  }

  const { data: ilikeResults } = await query.limit(5);

  if (ilikeResults && ilikeResults.length > 0) {
    return buildMatchResult(item, ilikeResults);
  }

  // Tentative 3 : recherche plus souple (un seul mot-clé principal)
  const mainKeyword = keywords[0];
  const { data: looseResults } = await supabaseAdmin
    .from("products")
    .select("id, name, description, price_ht, price_ttc, image_url, stock_quantity, slug, brand, eco")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .ilike("name", `%${mainKeyword}%`)
    .limit(5);

  if (looseResults && looseResults.length > 0) {
    return buildMatchResult(item, looseResults, true);
  }

  return { item, status: "unmatched", confidence: 0, product: null, alternatives: [] };
}

function buildMatchResult(
  item: ParsedItem,
  products: Record<string, unknown>[],
  isLoose = false,
): MatchResult {
  const mapped: MatchedProduct[] = products.map((p) => ({
    id: String(p.id),
    name: String(p.name ?? ""),
    price_ht: Number(p.price_ht ?? p.price_ttc ?? 0),
    price_ttc: Number(p.price_ttc ?? 0),
    image_url: p.image_url ? String(p.image_url) : null,
    stock_quantity: Number(p.stock_quantity ?? 0),
    slug: String(p.slug ?? ""),
    brand: p.brand ? String(p.brand) : null,
    eco: Boolean(p.eco ?? false),
  }));

  const best = mapped[0];
  // Calculer la confiance basée sur la correspondance des mots-clés
  const itemWords = item.nom.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
  const productWords = best.name.toLowerCase().split(/\s+/);
  const matchedWords = itemWords.filter((w: string) => productWords.some((pw: string) => pw.includes(w) || w.includes(pw)));
  let confidence = itemWords.length > 0 ? matchedWords.length / itemWords.length : 0;
  if (isLoose) confidence *= 0.5;
  confidence = Math.round(confidence * 100) / 100;

  const status: MatchResult["status"] =
    confidence >= 0.6 ? "matched" : confidence >= 0.3 ? "partial" : "unmatched";

  return {
    item,
    status,
    confidence,
    product: best,
    alternatives: mapped.slice(1, 3),
  };
}

function toCandidate(product: MatchedProduct, score: number, tier: string) {
  return {
    product_id: product.id,
    name: product.name,
    product_name: product.name,
    price: product.price_ht,
    price_ttc: product.price_ttc,
    eco: product.eco,
    brand: product.brand,
    image_url: product.image_url,
    score: Math.round(score * 100) / 100,
    reason: "correspondance automatique",
    tier,
  };
}

// ── Construction des 3 paniers ─────────────────────────────────────────────

async function buildCarts(
  supabaseAdmin: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2").createClient>,
  uploadId: string,
  matchResults: MatchResult[],
) {
  const tiers = ["essentiel", "equilibre", "premium"] as const;
  const cartItems: Record<string, Array<Record<string, unknown>>> = {
    essentiel: [],
    equilibre: [],
    premium: [],
  };

  for (const result of matchResults) {
    if (!result.product) continue;

    const allProducts = [result.product, ...result.alternatives];

    // Trier par prix pour assigner les tiers
    const byPrice = [...allProducts].sort((a, b) => a.price_ttc - b.price_ttc);
    const ecoProducts = allProducts.filter((p) => p.eco);

    const essentiel = byPrice[0];
    const premium = ecoProducts.length > 0
      ? ecoProducts[0]
      : byPrice[byPrice.length - 1];
    const equilibre = allProducts.find(
      (p) => p.id !== essentiel.id && p.id !== premium.id,
    ) ?? essentiel;

    const tierMap = { essentiel, equilibre, premium };

    for (const tier of tiers) {
      const p = tierMap[tier];
      cartItems[tier].push({
        product_id: p.id,
        product_name: p.name,
        price: p.price_ht,
        price_ttc: p.price_ttc,
        quantity: result.item.qte,
        eco: p.eco,
        image_url: p.image_url,
      });
    }
  }

  // Sauvegarder les 3 paniers
  for (const tier of tiers) {
    const items = cartItems[tier];
    const totalHt = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
    const totalTtc = items.reduce((s, i) => s + (Number(i.price_ttc ?? i.price) * Number(i.quantity)), 0);

    await supabaseAdmin
      .from("school_list_carts")
      .upsert(
        {
          upload_id: uploadId,
          tier,
          total_ht: Math.round(totalHt * 100) / 100,
          total_ttc: Math.round(totalTtc * 100) / 100,
          items_count: items.length,
          items,
        },
        { onConflict: "upload_id,tier" },
      );
  }
}
