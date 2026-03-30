const ALLOWED_REDIRECT_ORIGINS = [
  'https://checkout.stripe.com',
  'https://billing.stripe.com',
] as const;

/**
 * Validate that a redirect URL points to an allowed external origin.
 * Prevents open redirect attacks via tampered API responses.
 */
export function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_ORIGINS.some((origin) => parsed.origin === origin);
  } catch {
    return false;
  }
}
