/**
 * Lightweight error tracking — logs to Supabase error_logs table.
 *
 * Replaces the Sentry stub with a real, lightweight error reporter.
 * Sends errors to Supabase via the REST API (avoids importing the full client).
 * Batches errors to avoid flooding the database.
 * Falls back to console if Supabase is not reachable.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/** In-flight buffer to batch errors (flush every 5s or on 10 items) */
const errorBuffer: ErrorEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | undefined;
let currentEmail: string | undefined;

interface ErrorEntry {
  level: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url: string;
  user_id?: string;
  user_email?: string;
  timestamp: string;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushErrors, 5_000);
}

async function flushErrors() {
  flushTimer = null;
  if (errorBuffer.length === 0) return;

  const batch = errorBuffer.splice(0, 50);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // No Supabase configured — just log to console
    batch.forEach(e => console.error('[error-tracker]', e.message, e.context));
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    });
  } catch {
    // Network error — log to console, don't lose errors silently
    batch.forEach(e => console.error('[error-tracker:offline]', e.message));
  }
}

export function initSentry() {
  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushErrors();
      }
    });
  }
}

export function setSentryUser(userId: string, email?: string, _metadata?: Record<string, unknown>) {
  currentUserId = userId;
  currentEmail = email;
}

export function clearSentryUser() {
  currentUserId = undefined;
  currentEmail = undefined;
}

export function captureMessage(message: string, level: string = 'info') {
  console.warn('[captureMessage]', message);
  errorBuffer.push({
    level,
    message,
    url: typeof window !== 'undefined' ? window.location.href : '',
    user_id: currentUserId,
    user_email: currentEmail,
    timestamp: new Date().toISOString(),
  });
  scheduleFlush();
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
  level: string = 'error'
) {
  console.error('[captureException]', error, context);
  errorBuffer.push({
    level,
    message: error.message,
    stack: error.stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : '',
    user_id: currentUserId,
    user_email: currentEmail,
    timestamp: new Date().toISOString(),
  });

  // Flush immediately for errors
  if (level === 'error' || level === 'fatal') {
    flushErrors();
  } else {
    scheduleFlush();
  }
}

export function addBreadcrumb(
  _message: string,
  _category: string = 'user-action',
  _level: string = 'info',
  _data?: Record<string, unknown>
) {
  // Breadcrumbs are not stored — kept for API compatibility
}
