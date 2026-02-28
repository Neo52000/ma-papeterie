import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";

const EXTRACTION_PROMPT = `Analyse ce bon de commande fournisseur et extrais TOUTES les lignes produits.

Pour chaque ligne, extrais :
- ref : référence / code article du fournisseur (string, peut être vide)
- name : désignation / nom du produit (string, obligatoire)
- quantity : quantité commandée (number, entier)
- unit_price_ht : prix unitaire hors taxes en euros (number, décimal)
- vat_rate : taux de TVA en % (number, ex: 20, 5.5, 0 — si non trouvé mettre 20)
- ean : code EAN / GTIN si présent (string, peut être vide)

Retourne UNIQUEMENT un JSON valide avec la structure suivante, sans markdown ni explication :
{
  "order_number": "numéro du bon de commande si trouvé, sinon null",
  "order_date": "date au format ISO YYYY-MM-DD si trouvée, sinon null",
  "supplier_name": "nom du fournisseur si trouvé dans le document, sinon null",
  "total_ht": "total HT global si trouvé (number), sinon null",
  "items": [
    {
      "ref": "",
      "name": "",
      "quantity": 1,
      "unit_price_ht": 0.00,
      "vat_rate": 20,
      "ean": ""
    }
  ]
}

Si aucune ligne n'est trouvée, retourne items: [].`;

// ── Anthropic (Claude) ────────────────────────────────────────────────────────
async function parseWithClaude(pdfBase64: string, supplierHint: string): Promise<any> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY non configurée');

  const userText = supplierHint
    ? `Fournisseur attendu : ${supplierHint}. ${EXTRACTION_PROMPT}`
    : EXTRACTION_PROMPT;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: userText },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic ${response.status}: ${err}`);
  }

  const result = await response.json();
  const raw = result.content?.[0]?.text || '{}';

  // Extraire le JSON (Claude peut parfois ajouter du texte autour)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Réponse Claude invalide: ${raw.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

// ── OpenAI (gpt-4o-mini fallback) ────────────────────────────────────────────
async function parseWithOpenAI(pdfBase64: string, supplierHint: string): Promise<any> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY non configurée');

  const userContent: any[] = [
    {
      type: 'text',
      text: supplierHint
        ? `Fournisseur attendu : ${supplierHint}. ${EXTRACTION_PROMPT}`
        : EXTRACTION_PROMPT,
    },
    {
      type: 'file',
      file: {
        filename: 'bon_de_commande.pdf',
        file_data: `data:application/pdf;base64,${pdfBase64}`,
      },
    },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu extrais des données de bons de commande et retournes du JSON valide.' },
        { role: 'user', content: userContent },
      ],
      max_tokens: 4096,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} — ${err}`);
  }

  const result = await response.json();
  const raw = result.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const contentType = req.headers.get('content-type') || '';

    let pdfBase64: string;
    let supplierHint = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('pdf') as File | null;
      supplierHint = (formData.get('supplier') as string) || '';

      if (!file) {
        return new Response(JSON.stringify({ error: 'Fichier PDF manquant dans le champ "pdf"' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const buffer = await file.arrayBuffer();
      // Encodage sûr pour les gros fichiers (évite stack overflow avec spread)
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      pdfBase64 = btoa(binary);
    } else {
      const body = await req.json();
      pdfBase64 = body.pdf_base64;
      supplierHint = body.supplier || '';

      if (!pdfBase64) {
        return new Response(JSON.stringify({ error: 'pdf_base64 manquant' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Essayer Anthropic en premier, puis OpenAI en fallback
    let parsed: any;
    const errors: string[] = [];

    if (Deno.env.get('ANTHROPIC_API_KEY')) {
      try {
        parsed = await parseWithClaude(pdfBase64, supplierHint);
      } catch (e: any) {
        console.warn('Claude failed, trying OpenAI:', e.message);
        errors.push(`Claude: ${e.message}`);
      }
    }

    if (!parsed && Deno.env.get('OPENAI_API_KEY')) {
      try {
        parsed = await parseWithOpenAI(pdfBase64, supplierHint);
      } catch (e: any) {
        errors.push(`OpenAI: ${e.message}`);
      }
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: 'Aucune clé API disponible ou toutes les tentatives ont échoué', errors }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return safeErrorResponse(err, corsHeaders, { status: 500, context: "parse-po-pdf" });
  }
});
