export type AuthenticatorAssuranceLevel = 'aal1' | 'aal2';

/**
 * Read the assurance level only after the caller has validated the JWT.
 * Missing, malformed and unknown claims fail closed to AAL1.
 */
export function readAalFromValidatedJwt(token: string): AuthenticatorAssuranceLevel {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 'aal1';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded)) as { aal?: unknown };
    return claims.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}
