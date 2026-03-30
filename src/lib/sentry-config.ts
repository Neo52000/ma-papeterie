/**
 * Sentry stub — error tracking removed for bundle size optimization.
 * All functions are no-ops that log to console instead.
 * The exported API is identical so all existing callers continue to work.
 */

export function initSentry() {
  // no-op — Sentry removed for performance
}

export function setSentryUser(_userId: string, _email?: string, _metadata?: Record<string, unknown>) {
  // no-op
}

export function clearSentryUser() {
  // no-op
}

export function captureMessage(message: string, _level: string = 'info') {
  console.warn('[captureMessage]', message);
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
  _level: string = 'error'
) {
  console.error('[captureException]', error, context);
}

export function addBreadcrumb(
  _message: string,
  _category: string = 'user-action',
  _level: string = 'info',
  _data?: Record<string, unknown>
) {
  // no-op
}
