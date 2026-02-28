import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Non authentifié");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) throw new Error("Non authentifié");

    const { uploadId } = await req.json();
    if (!uploadId) throw new Error("uploadId requis");

    // Get the upload record
    const { data: upload, error: uploadError } = await supabase
      .from('school_list_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) throw new Error("Upload introuvable");

    // Update status to processing
    await supabase
      .from('school_list_uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    // Download file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('school-lists')
      .download(upload.file_path);

    if (fileError || !fileData) throw new Error("Impossible de télécharger le fichier");

    // Prepare content for AI based on file type
    let contentForAI: any[];
    const isImage = upload.file_type.startsWith('image/');
    const isPdf = upload.file_type === 'application/pdf';

    if (isImage) {
      // Convert to base64 for vision model
      const buffer = await fileData.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''));
      contentForAI = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrait tous les articles de fournitures scolaires de cette image de liste scolaire."
            },
            {
              type: "image_url",
              image_url: { url: `data:${upload.file_type};base64,${base64}` }
            }
          ]
        }
      ];
    } else {
      // Text-based files
      const text = await fileData.text();
      contentForAI = [
        {
          role: "user",
          content: `Extrait tous les articles de cette liste scolaire:\n\n${text}`
        }
      ];

      // Save OCR text
      await supabase
        .from('school_list_uploads')
        .update({ ocr_text: text.substring(0, 10000) })
        .eq('id', uploadId);
    }

    const systemPrompt = `Tu es un expert en extraction de listes scolaires françaises.
Analyse le contenu et extrait TOUS les articles de fournitures scolaires.

Pour chaque article, identifie:
- label: nom exact (ex: "Cahier 96 pages 24x32cm grands carreaux")
- qty: quantité demandée (nombre entier, défaut 1)
- mandatory: obligatoire ou facultatif (défaut true)
- constraints: marque/couleur/taille/format si précisé (string ou null)

Retourne UNIQUEMENT un JSON valide:
{"items": [{"label": "...", "qty": 1, "mandatory": true, "constraints": "..."}]}`;

    const aiResponse = await callAI(
      [
        { role: "system", content: systemPrompt },
        ...(isImage ? contentForAI : contentForAI)
      ],
      { temperature: 0.2 }
    );

    const content = aiResponse.choices?.[0]?.message?.content || "";
    console.log("AI extraction result length:", content.length);

    // Parse JSON from response
    let parsed: any;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Parse error, raw:", content);
      throw new Error("Impossible de parser la réponse IA");
    }

    const items = parsed.items || parsed;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Aucun article extrait");
    }

    // Save items as matches
    const matchRows = items.map((item: any) => ({
      upload_id: uploadId,
      item_label: item.label || item.item_name || "Article inconnu",
      item_quantity: item.qty || item.quantity || 1,
      is_mandatory: item.mandatory !== false && item.is_mandatory !== false,
      constraints: item.constraints || item.description || null,
      match_status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('school_list_matches')
      .insert(matchRows);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Erreur insertion items");
    }

    // Update upload status
    await supabase
      .from('school_list_uploads')
      .update({
        status: 'completed',
        items_count: items.length,
        ocr_text: isImage ? content.substring(0, 5000) : upload.ocr_text,
      })
      .eq('id', uploadId);

    console.log(`Extracted ${items.length} items for upload ${uploadId}`);

    return new Response(
      JSON.stringify({ success: true, items_count: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);

    // Try to update status on failure
    try {
      const { uploadId } = await req.clone().json().catch(() => ({}));
      if (uploadId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('school_list_uploads')
          .update({ status: 'error', error_message: (error as Error).message })
          .eq('id', uploadId);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
