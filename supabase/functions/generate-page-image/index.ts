import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

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

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  // Rate limit: 5 images per minute
  const rlKey = getRateLimitKey(req, "generate-page-image");
  if (!checkRateLimit(rlKey, 5, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  try {
    const body: GenerateImageRequest = await req.json();
    const {
      prompt,
      model = "dall-e-3",
      size = "1024x1024",
      quality = model === "dall-e-3" ? "standard" : "auto",
      style = "natural",
      pageSlug = "ai-generated",
    } = body;

    if (!prompt || prompt.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Le prompt doit contenir au moins 3 caractères" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY non configurée" }),
        { status: 500, headers: corsHeaders },
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
      return new Response(
        JSON.stringify({ error: `Erreur ${model}: ${dalleResp.status}`, details: errText }),
        { status: 502, headers: corsHeaders },
      );
    }

    const dalleData = await dalleResp.json();
    const imageItem = dalleData.data?.[0];

    if (!imageItem) {
      return new Response(
        JSON.stringify({ error: "Aucune image générée" }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Get base64 data — both models return b64_json when requested
    const b64 = imageItem.b64_json;
    const revisedPrompt = imageItem.revised_prompt;

    if (!b64) {
      return new Response(
        JSON.stringify({ error: "Aucune donnée image reçue" }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Decode base64 and upload to Supabase Storage
    const raw = atob(b64);
    const imageBytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      imageBytes[i] = raw.charCodeAt(i);
    }

    const fileName = `${pageSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: uploadErr } = await supabase.storage
      .from("page-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: "Erreur upload image", details: uploadErr.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("page-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        url: publicUrlData.publicUrl,
        revisedPrompt: revisedPrompt ?? null,
        fileName,
        model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-page-image error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erreur interne" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
