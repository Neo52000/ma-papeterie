// ── Client Android SMS Gateway partagé ──────────────────────────────────────
//
// Utilisé par : send-sms, send-sms-campaign, sms-gateway-health
// Doc API : https://github.com/capcom6/android-sms-gateway

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SmsGatewayConfig {
  url: string;
  localUrl?: string;
  username: string;
  password: string;
  mode: "cloud" | "local";
  dailyLimitPerPhone: number;
  hourlyGlobalLimit: number;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  gatewayResponse?: Record<string, unknown>;
}

// ── Config loader ───────────────────────────────────────────────────────────

const SMS_SECRET_KEYS = [
  "SMS_GATEWAY_URL",
  "SMS_GATEWAY_LOCAL_URL",
  "SMS_GATEWAY_USERNAME",
  "SMS_GATEWAY_PASSWORD",
  "SMS_GATEWAY_MODE",
  "SMS_DAILY_LIMIT_PER_PHONE",
  "SMS_HOURLY_GLOBAL_LIMIT",
] as const;

export async function getSmsGatewayConfig(
  supabaseAdmin: SupabaseClient,
): Promise<SmsGatewayConfig | null> {
  const { data: secrets } = await supabaseAdmin
    .from("admin_secrets")
    .select("key, value")
    .in("key", [...SMS_SECRET_KEYS]);

  const cfg: Record<string, string> = {};
  (secrets || []).forEach((s: { key: string; value: string }) => {
    cfg[s.key] = s.value;
  });

  if (!cfg["SMS_GATEWAY_USERNAME"] || !cfg["SMS_GATEWAY_PASSWORD"]) {
    return null;
  }

  return {
    url: cfg["SMS_GATEWAY_URL"] || "https://api.sms-gate.app/3rdparty/v1",
    localUrl: cfg["SMS_GATEWAY_LOCAL_URL"] || undefined,
    username: cfg["SMS_GATEWAY_USERNAME"],
    password: cfg["SMS_GATEWAY_PASSWORD"],
    mode: (cfg["SMS_GATEWAY_MODE"] as "cloud" | "local") || "cloud",
    dailyLimitPerPhone: parseInt(cfg["SMS_DAILY_LIMIT_PER_PHONE"] || "3", 10),
    hourlyGlobalLimit: parseInt(cfg["SMS_HOURLY_GLOBAL_LIMIT"] || "30", 10),
  };
}

// ── Phone validation ────────────────────────────────────────────────────────

/**
 * Normalise et valide un numéro de mobile français au format E.164.
 * Accepte : +33612345678, 0612345678, 06 12 34 56 78, 33612345678
 * Rejette : fixes (01-05), numéros non-français, formats invalides
 * Retourne le numéro normalisé ou null si invalide.
 */
export function validateFrenchMobile(phone: string): string | null {
  const cleaned = phone.replace(/[\s.\-()]/g, "");
  let normalized: string;

  if (cleaned.startsWith("+33")) {
    normalized = cleaned;
  } else if (cleaned.startsWith("33") && cleaned.length === 11) {
    normalized = "+" + cleaned;
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    normalized = "+33" + cleaned.slice(1);
  } else {
    return null;
  }

  // Only accept French mobile prefixes: 06 and 07
  if (/^\+33[67]\d{8}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

// ── Template rendering ──────────────────────────────────────────────────────

/**
 * Remplace les {{variable}} dans un template SMS.
 * Les variables non fournies sont remplacées par une chaîne vide.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key] || "";
    // Strip control characters from variable values
    return value.replace(/[\x00-\x1f]/g, "");
  });
}

// ── Gateway HTTP client ─────────────────────────────────────────────────────

/**
 * Envoie un SMS via l'API Android SMS Gateway.
 * Tente le mode configuré, fallback vers le mode local si cloud échoue.
 */
export async function sendSmsViaGateway(
  config: SmsGatewayConfig,
  phone: string,
  message: string,
): Promise<SmsSendResult> {
  const baseUrl = config.mode === "local" && config.localUrl
    ? config.localUrl
    : config.url;

  const auth = btoa(`${config.username}:${config.password}`);

  const body = JSON.stringify({
    message: message,
    phoneNumbers: [phone],
  });

  try {
    const response = await fetch(`${baseUrl}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body,
      signal: AbortSignal.timeout(15_000), // 15s timeout
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If cloud mode failed and local URL is available, try fallback
      if (config.mode === "cloud" && config.localUrl) {
        return sendSmsToUrl(config.localUrl, auth, body);
      }

      return {
        success: false,
        error: `Gateway returned ${response.status}: ${data.message || response.statusText}`,
        gatewayResponse: data,
      };
    }

    return {
      success: true,
      messageId: data.id || data.messageId || undefined,
      gatewayResponse: data,
    };
  } catch (err) {
    // Network error — try fallback if available
    if (config.mode === "cloud" && config.localUrl) {
      return sendSmsToUrl(config.localUrl, auth, body);
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown gateway error",
    };
  }
}

/** Internal: send to a specific URL (used for fallback) */
async function sendSmsToUrl(
  url: string,
  auth: string,
  body: string,
): Promise<SmsSendResult> {
  try {
    const response = await fetch(`${url}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: `Fallback gateway returned ${response.status}`,
        gatewayResponse: data,
      };
    }

    return {
      success: true,
      messageId: data.id || data.messageId || undefined,
      gatewayResponse: data,
    };
  } catch (err) {
    return {
      success: false,
      error: `Fallback failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
