/**
 * Analytics — track() + batch + consentement RGPD
 *
 * RGPD :
 *  - Aucune PII stockée directement.
 *  - user_hash = SHA-256(user.id)[0:16], non-réversible.
 *  - session_id = UUID aléatoire par onglet (sessionStorage, pas cookie).
 *  - track() est un no-op si cookie_consent !== 'true'.
 *  - Les events sont batchés (flush toutes les 3s ou après 10 events).
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnalyticsEventType =
  | "page_view"
  | "product_viewed"
  | "search_performed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed"
  | "upload_started"
  | "ocr_completed"
  | "cart_variant_selected";

interface QueuedEvent {
  event_type: AnalyticsEventType;
  session_id: string | null;
  user_hash: string | null;
  page_path: string | null;
  payload: Record<string, unknown>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONSENT_KEY = "cookie_consent";
const SESSION_KEY = "_sid";
const FLUSH_DELAY_MS = 3000;
const BATCH_LIMIT = 10;

// ── Module-level state ────────────────────────────────────────────────────────

let _queue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _userHash: string | null = null;

// ── Consent ───────────────────────────────────────────────────────────────────

export function isAnalyticsEnabled(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

// ── Session ID (sessionStorage — pas un cookie, pas de consentement requis) ───

export function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

// ── User hash (SHA-256, async, mis en cache) ──────────────────────────────────

export async function initUserHash(userId: string | undefined): Promise<void> {
  if (!userId) {
    _userHash = null;
    return;
  }
  try {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(userId + "_anon"));
    _userHash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  } catch {
    _userHash = null;
  }
}

// ── Batch flush ───────────────────────────────────────────────────────────────

async function flush(): Promise<void> {
  _flushTimer = null;
  if (_queue.length === 0) return;
  const batch = _queue.splice(0);
  try {
    await (supabase as any).from("analytics_events").insert(batch);
  } catch {
    // Fire-and-forget — on ne relance pas pour éviter une boucle
  }
}

function scheduleFlush(): void {
  if (_flushTimer) return;
  _flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

// Flush immédiat si l'onglet passe en arrière-plan (fermeture, navigation)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
      flush();
    }
  });
}

// ── API publique ──────────────────────────────────────────────────────────────

/**
 * Enregistre un événement analytics.
 * No-op silencieux si le consentement cookie n'est pas donné.
 */
export function track(
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {},
): void {
  if (!isAnalyticsEnabled()) return;

  _queue.push({
    event_type: eventType,
    session_id: getOrCreateSessionId(),
    user_hash: _userHash,
    page_path: typeof window !== "undefined" ? window.location.pathname : null,
    payload,
  });

  if (_queue.length >= BATCH_LIMIT) {
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    flush();
  } else {
    scheduleFlush();
  }
}
