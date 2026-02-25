import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

serve(async (req) => {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;

  const corsHeaders = getCorsHeaders(req);

  // ── Rate Limiting ───────────────────────────────────────────────────────────
  const rlKey = getRateLimitKey(req, 'import-csv');
  if (!checkRateLimit(rlKey, 5, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }

  // ── Authentification admin ──────────────────────────────────────────────────
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  try {
    const { csvData, columns } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Parsing CSV robuste (gère les guillemets et virgules dans les valeurs)
    function parseCsvRow(row: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    const rows = csvData.trim().split('\n').slice(1); // Skip header
    const results: { success: Array<{ product: string; id: string }>; errors: Array<{ row: string; error: string }> } = { success: [], errors: [] };

    for (const row of rows) {
      try {
        const values = parseCsvRow(row);
        const rowData: Record<string, string> = {};

        columns.forEach((col: string, idx: number) => {
          rowData[col] = values[idx] ?? '';
        });

        // Use AI to enrich and validate data
        const aiData = await callAI(
          [
            {
              role: 'system',
              content: 'Tu es un assistant expert en enrichissement de données produits. Retourne UNIQUEMENT un objet JSON valide sans texte additionnel.'
            },
            {
              role: 'user',
              content: `Enrichis et valide ces données produit. Retourne un JSON avec: name, description, category (Scolaire/Bureau/Eco/Vintage), price_ht, price_ttc, tva_rate, ean, eco (boolean). Données: ${JSON.stringify(rowData)}`
            }
          ],
          {
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_product",
                  description: "Enrichit et valide les données produit",
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string", enum: ["Scolaire", "Bureau", "Eco", "Vintage"] },
                      price_ht: { type: "number" },
                      price_ttc: { type: "number" },
                      tva_rate: { type: "number" },
                      ean: { type: "string" },
                      eco: { type: "boolean" }
                    },
                    required: ["name", "category", "price_ttc"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "enrich_product" } }
          }
        );
        const enrichedData = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);

        // Calculate missing fields
        if (!enrichedData.price_ht && enrichedData.price_ttc) {
          enrichedData.price_ht = enrichedData.price_ttc / (1 + (enrichedData.tva_rate || 20) / 100);
        }

        // Insert or update product
        const { data: product, error } = await supabase
          .from('products')
          .upsert({
            ...enrichedData,
            price: enrichedData.price_ttc,
            is_active: true,
            stock_quantity: parseInt(rowData.stock_quantity || '0'),
          }, { onConflict: 'ean' })
          .select()
          .single();

        if (error) throw error;
        results.success.push({ product: enrichedData.name, id: product.id });
      } catch (err) {
        // ── Erreur sanitisée (pas de détails internes exposés) ──────────────
        console.error('Row import error:', err);
        results.errors.push({
          row: row.substring(0, 100),
          error: 'Erreur de traitement de la ligne',
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne lors de l\'import CSV' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
