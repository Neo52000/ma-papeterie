import { createHandler, jsonResponse } from "../_shared/handler.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

type NewsletterSource = "footer" | "exit_popup" | "checkout" | "liste_scolaire";
const VALID_SOURCES: NewsletterSource[] = ["footer", "exit_popup", "checkout", "liste_scolaire"];

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(
  createHandler(
    {
      name: "newsletter-subscribe",
      auth: "none",
      rateLimit: { prefix: "newsletter", max: 5, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, req, corsHeaders }) => {
      const { email, source, attributes } = (body ?? {}) as {
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
        console.error("[newsletter-subscribe] Missing BREVO_API_KEY or BREVO_LIST_ID");
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

      // Handle Brevo duplicate
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
        // Don't fail the request — Brevo subscription succeeded
      }

      return { success: true, message: "Inscription confirmée" };
    },
  ),
);
