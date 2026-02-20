import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données de bons de commande fournisseurs.

Analyse le document PDF fourni et extrait TOUTES les lignes de produits.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Expect multipart form data: pdf (file) + supplier (string, optional)
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
      pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    } else {
      // JSON body: { pdf_base64, supplier }
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

    const userContent: any[] = [
      {
        type: 'text',
        text: supplierHint
          ? `Fournisseur attendu : ${supplierHint}. Extrais toutes les lignes de ce bon de commande PDF.`
          : 'Extrais toutes les lignes de ce bon de commande PDF.',
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
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 4096,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', errText);
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return new Response(JSON.stringify({ error: 'Réponse OpenAI non valide', raw: rawContent }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('parse-po-pdf error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
