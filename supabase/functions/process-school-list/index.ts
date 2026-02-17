import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileType } = await req.json();

    console.log(`Processing file of type: ${fileType}`);

    // Prepare the system prompt for extracting school list items
    const systemPrompt = `Tu es un expert en extraction de données de listes scolaires. 
Analyse le contenu fourni et extrait TOUS les articles de fournitures scolaires mentionnés.

Pour chaque article, identifie:
- Le nom exact de l'article (ex: "Cahier 96 pages 24x32cm")
- La quantité demandée (nombre)
- Si c'est obligatoire ou facultatif (si non spécifié, considère comme obligatoire)
- Une description si disponible (marque, spécifications, etc.)

Retourne UNIQUEMENT un tableau JSON avec cette structure, sans aucun texte supplémentaire:
[
  {
    "item_name": "nom de l'article",
    "quantity": nombre,
    "is_mandatory": true/false,
    "description": "description ou null"
  }
]`;

    const userPrompt = `Extrait tous les articles de cette liste scolaire:\n\n${fileContent}`;

    // Call AI for multimodal processing
    const aiResponse = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.3 }
    );

    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("AI Response:", content);

    // Parse the JSON response
    let items = [];
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      items = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      throw new Error("Impossible de parser la réponse de l'IA");
    }

    // Validate the extracted items
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Aucun article n'a été extrait de la liste");
    }

    console.log(`Successfully extracted ${items.length} items`);

    return new Response(
      JSON.stringify({ items }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error processing school list:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur lors du traitement de la liste" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
