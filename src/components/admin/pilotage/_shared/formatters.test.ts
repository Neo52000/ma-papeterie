import { describe, it, expect } from 'vitest';
import {
  formatEur,
  formatNumber,
  formatPct,
  formatDelta,
  channelLabel,
} from './formatters';

describe('formatEur', () => {
  it('returns em-dash for null/undefined/NaN', () => {
    expect(formatEur(null)).toBe('—');
    expect(formatEur(undefined)).toBe('—');
    expect(formatEur(Number.NaN)).toBe('—');
  });

  it('formats integer euros in fr-FR', () => {
    // L'espace utilisé par Intl est un NNBSP (U+202F) — on teste séparément le nombre et la devise
    const out = formatEur(1234);
    expect(out).toMatch(/1\s?234/);
    expect(out).toContain('€');
  });

  it('uses compact notation above 1000', () => {
    const out = formatEur(1500, { compact: true });
    expect(out).toContain('k');
    expect(out).toContain('€');
  });

  it('skips compact for small values', () => {
    const out = formatEur(500, { compact: true });
    // Petit montant → pas de k
    expect(out).not.toMatch(/k/);
  });
});

describe('formatPct', () => {
  it('uses French comma and percent sign', () => {
    expect(formatPct(12.3)).toBe('12,3 %');
    expect(formatPct(0)).toBe('0,0 %');
  });

  it('respects decimals', () => {
    expect(formatPct(12.345, 2)).toBe('12,35 %');
    expect(formatPct(12.3, 0)).toBe('12 %');
  });

  it('handles null and NaN', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(Number.NaN)).toBe('—');
  });
});

describe('formatDelta', () => {
  it('marks positive with plus sign', () => {
    const d = formatDelta(5.2);
    expect(d.positive).toBe(true);
    expect(d.neutral).toBe(false);
    expect(d.label).toBe('+5,2 %');
  });

  it('marks negative without extra sign', () => {
    const d = formatDelta(-3.1);
    expect(d.positive).toBe(false);
    expect(d.neutral).toBe(false);
    expect(d.label).toBe('-3,1 %');
  });

  it('returns neutral for exactly 0', () => {
    const d = formatDelta(0);
    expect(d.neutral).toBe(true);
    expect(d.label).toBe('0 %');
  });

  it('returns em-dash for null/NaN', () => {
    expect(formatDelta(null).label).toBe('—');
    expect(formatDelta(Number.NaN).neutral).toBe(true);
  });
});

describe('formatNumber', () => {
  it('formats with fr-FR grouping', () => {
    const out = formatNumber(1234567);
    expect(out).toMatch(/1\s?234\s?567/);
  });

  it('handles null', () => {
    expect(formatNumber(null)).toBe('—');
  });
});

describe('channelLabel', () => {
  it('maps known channels to French labels', () => {
    expect(channelLabel('all')).toBe('Tous canaux');
    expect(channelLabel('web_b2c')).toBe('Web B2C');
    expect(channelLabel('web_b2b')).toBe('Web B2B');
    expect(channelLabel('pos')).toBe('Boutique');
  });

  it('returns the raw value for unknown channels', () => {
    expect(channelLabel('unknown')).toBe('unknown');
  });
});
