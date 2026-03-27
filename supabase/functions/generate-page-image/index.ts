import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface GenerateImageRequest {
  prompt: string;
  model?: "dall-e-3" | "gpt-image-1" | "gemini-imagen";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd" | "low" | "medium" | "high" | "auto";
  style?: "natural" | "vivid";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:4" | "4:3";
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
    aspectRatio = "16:9",
    pageSlug = "ai-generated",
  } = body as GenerateImageRequest;

  if (!prompt || prompt.trim().length < 3) {
    return jsonResponse(
      { error: "Le prompt doit contenir au moins 3 caractères" },
      400,
      corsHeaders,
    );
  }

  let b64: string | undefined;
  let revisedPrompt: string | null = null;

  // ── Gemini Imagen ─────────────────────────────────────────────────────────
  if (model === "gemini-imagen") {
    const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleKey) {
      return jsonResponse(
        { error: "GOOGLE_AI_API_KEY non configurée" },
        500,
        corsHeaders,
      );
    }

    const imagenResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: prompt.trim() }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
          },
        }),
      },
    );

    if (!imagenResp.ok) {
      const errText = await imagenResp.text();
      console.error("Gemini Imagen error:", imagenResp.status, errText);
      return jsonResponse(
        { error: `Erreur Gemini Imagen: ${imagenResp.status}`, details: errText },
        502,
        corsHeaders,
      );
    }

    const imagenData = await imagenResp.json();
    console.log("Gemini Imagen response keys:", JSON.stringify(Object.keys(imagenData)));

    // Handle safety filter or empty response
    if (!imagenData.predictions || imagenData.predictions.length === 0) {
      const reason = imagenData.filters?.[0]?.reason
        ?? imagenData.error?.message
        ?? "Réponse vide — le contenu a peut-être été bloqué par le filtre de sécurité Google";
      console.error("Gemini Imagen: no predictions", JSON.stringify(imagenData));
      return jsonResponse(
        { error: reason },
        422,
        corsHeaders,
      );
    }

    b64 = imagenData.predictions[0].bytesBase64Encoded;
    revisedPrompt = null;

  // ── OpenAI (DALL-E 3 / GPT Image) ────────────────────────────────────────
  } else {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse(
        { error: "OPENAI_API_KEY non configurée" },
        500,
        corsHeaders,
      );
    }

    let apiBody: Record<string, unknown>;

    if (model === "gpt-image-1") {
      apiBody = {
        model: "gpt-image-1",
        prompt: prompt.trim(),
        n: 1,
        size,
        quality,
        output_format: "png",
      };
    } else {
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

    const dalleResp = await fetch("https://api.openai.com/v1/images/generations", {
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

    b64 = imageItem.b64_json;
    revisedPrompt = imageItem.revised_prompt ?? null;
  }

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
