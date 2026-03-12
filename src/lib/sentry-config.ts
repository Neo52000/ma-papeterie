import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error tracking
 * Call this in main.tsx before ReactDOM.createRoot()
 */
export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    // Get DSN from environment variable set during build
    dsn: import.meta.env.VITE_SENTRY_DSN,
    
    // Environment
    environment: import.meta.env.MODE || 'production',
    
    // Performance monitoring
    tracePropagationTargets: [
      "localhost",
      /^\//,
      /^https:\/\/ma-papeterie\.fr/,
    ],

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Sampling
    tracesSampleRate: import.meta.env.MODE === 'development' ? 0.1 : 0.5,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release version
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Capture breadcrumbs
    maxBreadcrumbs: 100,

    // Ignore specific errors (spam filtering)
    beforeSend(event) {
      // Filter out network errors in development
      if (
        import.meta.env.MODE === 'development' &&
        event.exception?.values?.[0]?.type === 'NetworkError'
      ) {
        return null;
      }
      return event;
    },
  });
}

/**
 * Set user context for error tracking
 * Call this after authentication
 */
export function setSentryUser(userId: string, email?: string, metadata?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    email: email || undefined,
    ...metadata,
  });
}

/**
 * Clear user context on logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Capture custom message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
      Sentry.captureException(error, { level });
    });
  } else {
    Sentry.captureException(error, { level });
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}
