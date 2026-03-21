import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface GenerateImageRequest {
  prompt: string;
  model?: "dall-e-3" | "gpt-image-1";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd" | "low" | "medium" | "high" | "auto";
  style?: "natural" | "vivid";
  pageSlug?: string;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "generate-page-image",
  auth: "admin",
  rateLimit: { prefix: "generate-page-image", max: 5, windowMs: 60_000 },
}, async ({ body, corsHeaders, supabaseAdmin }) => {
  const {
    prompt,
    model = "dall-e-3",
    size = "1024x1024",
    quality = model === "dall-e-3" ? "standard" : "auto",
    style = "natural",
    pageSlug = "ai-generated",
  } = body as GenerateImageRequest;

  if (!prompt || prompt.trim().length < 3) {
    return jsonResponse(
      { error: "Le prompt doit contenir au moins 3 caractères" },
      400,
      corsHeaders,
    );
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return jsonResponse(
      { error: "OPENAI_API_KEY non configurée" },
      500,
      corsHeaders,
    );
  }

  // Build request body based on model
  let apiBody: Record<string, unknown>;
  let apiUrl: string;

  if (model === "gpt-image-1") {
    apiUrl = "https://api.openai.com/v1/images/generations";
    apiBody = {
      model: "gpt-image-1",
      prompt: prompt.trim(),
      n: 1,
      size,
      quality,
      output_format: "png",
    };
  } else {
    apiUrl = "https://api.openai.com/v1/images/generations";
    apiBody = {
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size,
      quality: quality === "hd" ? "hd" : "standard",
      style,
      response_format: "b64_json",
    };
  }

  const dalleResp = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(apiBody),
  });

  if (!dalleResp.ok) {
    const errText = await dalleResp.text();
    console.error(`${model} error:`, dalleResp.status, errText);
    return jsonResponse(
      { error: `Erreur ${model}: ${dalleResp.status}`, details: errText },
      502,
      corsHeaders,
    );
  }

  const dalleData = await dalleResp.json();
  const imageItem = dalleData.data?.[0];

  if (!imageItem) {
    return jsonResponse({ error: "Aucune image générée" }, 500, corsHeaders);
  }

  // Get base64 data — both models return b64_json when requested
  const b64 = imageItem.b64_json;
  const revisedPrompt = imageItem.revised_prompt;

  if (!b64) {
    return jsonResponse({ error: "Aucune donnée image reçue" }, 500, corsHeaders);
  }

  // Decode base64 and upload to Supabase Storage
  const raw = atob(b64);
  const imageBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    imageBytes[i] = raw.charCodeAt(i);
  }

  const fileName = `${pageSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("page-images")
    .upload(fileName, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadErr) {
    console.error("Upload error:", uploadErr);
    return jsonResponse(
      { error: "Erreur upload image", details: uploadErr.message },
      500,
      corsHeaders,
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("page-images")
    .getPublicUrl(fileName);

  return {
    url: publicUrlData.publicUrl,
    revisedPrompt: revisedPrompt ?? null,
    fileName,
    model,
  };
}));
