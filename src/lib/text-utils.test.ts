import { describe, it, expect } from 'vitest';
import { normalizeHeader } from './text-utils';

describe('normalizeHeader', () => {
  it('lowercases and trims', () => {
    expect(normalizeHeader('  Hello World  ')).toBe('hello world');
  });

  it('removes accents (NFD normalization)', () => {
    expect(normalizeHeader('Référence')).toBe('reference');
    expect(normalizeHeader('Catégorie')).toBe('categorie');
    expect(normalizeHeader('Écriture')).toBe('ecriture');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeHeader('prix   unitaire')).toBe('prix unitaire');
  });

  it('removes quotes and tabs', () => {
    expect(normalizeHeader('"code"\tproduit')).toBe('code produit');
  });

  it('handles empty string', () => {
    expect(normalizeHeader('')).toBe('');
  });
});
