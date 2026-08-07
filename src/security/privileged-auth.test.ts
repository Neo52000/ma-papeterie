import { describe, expect, it } from 'vitest';
import { readAalFromValidatedJwt } from '../../supabase/functions/_shared/jwt-claims';

function jwtWithClaims(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('privileged JWT assurance level', () => {
  it('accepts an explicitly validated AAL2 claim', () => {
    expect(readAalFromValidatedJwt(jwtWithClaims({ aal: 'aal2' }))).toBe('aal2');
  });

  it.each([
    ['AAL1', jwtWithClaims({ aal: 'aal1' })],
    ['missing claim', jwtWithClaims({ sub: 'admin-id' })],
    ['unknown claim', jwtWithClaims({ aal: 'aal3' })],
    ['malformed token', 'not-a-jwt'],
  ])('fails closed for %s', (_label, token) => {
    expect(readAalFromValidatedJwt(token)).toBe('aal1');
  });
});
