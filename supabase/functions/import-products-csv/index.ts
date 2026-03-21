import { callAI } from "../_shared/ai-client.ts";
import { createHandler } from "../_shared/handler.ts";
import { checkBodySize } from "../_shared/body-limit.ts";

Deno.serve(createHandler({
  name: "import-products-csv",
  auth: "admin",
  rateLimit: { prefix: "import-csv", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, req, corsHeaders }) => {
  // ── Validation taille ─────────────────────────────────────────────────
  const sizeError = checkBodySize(req, corsHeaders);
  if (sizeError) return sizeError;

  const { csvData, columns } = body as any;

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
      const { data: product, error } = await supabaseAdmin
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

  return results;
}));
