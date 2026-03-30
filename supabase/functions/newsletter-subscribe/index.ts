import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://ma-papeterie.fr",
  "https://www.ma-papeterie.fr",
  "https://ma-papeterie.netlify.app",
];

const ALLOWED_PATTERNS = [
  /^https:\/\/[\w-]*ma-papeterie[\w-]*\.netlify\.app$/,
  /^https:\/\/(?:[\w-]+\.)*ma-papeterie\.fr$/,
];

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

type NewsletterSource = "footer" | "exit_popup" | "checkout" | "liste_scolaire";
const VALID_SOURCES: NewsletterSource[] = [
  "footer",
  "exit_popup",
  "checkout",
  "liste_scolaire",
];

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405, corsHeaders);
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corps JSON invalide" }, 400, corsHeaders);
  }

  const { email, source, attributes } = body as {
    email?: string;
    source?: string;
    attributes?: Record<string, string>;
  };

  // Validate email
  if (
    !email ||
    typeof email !== "string" ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(email)
  ) {
    return jsonResponse(
      { success: false, error: "Email invalide" },
      400,
      corsHeaders,
    );
  }

  // Validate source
  if (!source || !VALID_SOURCES.includes(source as NewsletterSource)) {
    return jsonResponse(
      { success: false, error: "Source invalide" },
      400,
      corsHeaders,
    );
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const brevoListId = Deno.env.get("BREVO_LIST_ID");

  if (!brevoApiKey || !brevoListId) {
    console.error(
      "[newsletter-subscribe] Missing BREVO_API_KEY or BREVO_LIST_ID",
    );
    return jsonResponse(
      { success: false, error: "Erreur serveur" },
      500,
      corsHeaders,
    );
  }

  // Call Brevo API
  const brevoBody = {
    email: email.toLowerCase().trim(),
    attributes: {
      SOURCE: source,
      DATE_INSCRIPTION: new Date().toISOString(),
      ...(attributes ?? {}),
    },
    listIds: [Number(brevoListId)],
    updateEnabled: true,
  };

  let brevoResponse: Response;
  try {
    brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(brevoBody),
    });
  } catch (err) {
    console.error("[newsletter-subscribe] Brevo API error:", err);
    return jsonResponse(
      { success: false, error: "Erreur serveur" },
      500,
      corsHeaders,
    );
  }

  // Handle Brevo errors
  if (!brevoResponse.ok) {
    const brevoError = await brevoResponse.json().catch(() => ({}));
    const code = (brevoError as Record<string, string>)?.code;

    if (code === "duplicate_parameter") {
      return jsonResponse(
        { success: false, error: "Déjà inscrit" },
        409,
        corsHeaders,
      );
    }

    console.error("[newsletter-subscribe] Brevo error:", brevoError);
    return jsonResponse(
      { success: false, error: "Erreur serveur" },
      500,
      corsHeaders,
    );
  }

  // Log to newsletter_subscriptions table
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const clientIP =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const ipHash = await hashIP(clientIP);

  const { error: dbError } = await supabaseAdmin
    .from("newsletter_subscriptions")
    .insert({
      email: email.toLowerCase().trim(),
      source,
      ip_hash: ipHash,
    });

  if (dbError) {
    console.error("[newsletter-subscribe] DB insert error:", dbError);
  }

  return jsonResponse(
    { success: true, message: "Inscription confirmée" },
    200,
    corsHeaders,
  );
});
