import { callAI } from "../_shared/ai-client.ts";
import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "process-school-list",
  auth: "admin",
  rateLimit: { prefix: "process-school", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, userId, corsHeaders }) => {
  const { uploadId } = body as { uploadId?: string };
  if (!uploadId) throw new Error("uploadId requis");

  // Get the upload record
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from('school_list_uploads')
    .select('*')
    .eq('id', uploadId)
    .eq('user_id', userId)
    .single();

  if (uploadError || !upload) throw new Error("Upload introuvable");

  // Update status to processing
  await supabaseAdmin
    .from('school_list_uploads')
    .update({ status: 'processing' })
    .eq('id', uploadId);

  try {
    // Download file from storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
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
      const base64 = btoa(new Uint8Array(buffer).reduce((s: string, b: number) => s + String.fromCharCode(b), ''));
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
      await supabaseAdmin
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

    const { error: insertError } = await supabaseAdmin
      .from('school_list_matches')
      .insert(matchRows);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Erreur insertion items");
    }

    // Update upload status
    await supabaseAdmin
      .from('school_list_uploads')
      .update({
        status: 'completed',
        items_count: items.length,
        ocr_text: isImage ? content.substring(0, 5000) : upload.ocr_text,
      })
      .eq('id', uploadId);

    console.log(`Extracted ${items.length} items for upload ${uploadId}`);

    return { success: true, items_count: items.length };

  } catch (error) {
    console.error("Error:", error);

    // Update status on failure
    await supabaseAdmin
      .from('school_list_uploads')
      .update({ status: 'error', error_message: (error as Error).message })
      .eq('id', uploadId);

    return jsonResponse(
      { error: (error as Error).message },
      500,
      corsHeaders,
    );
  }
}));
