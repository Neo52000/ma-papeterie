import { describe, it, expect } from 'vitest';
import {
  isValidLuhn,
  computeVatNumber,
  siretSchema,
  sirenSchema,
  vatNumberSchema,
  b2bAccountSchema,
} from './b2bAccountSchema';

// SIRET/SIREN valides (Luhn) utilisés pour les tests :
//   - SIRET 73282932000074 (Danone siège)
//   - SIREN 732829320 (Danone)
//   - VAT correspondant = FR44732829320 ((12 + 3*(732829320 mod 97)) mod 97 = 44)

describe('isValidLuhn', () => {
  it('accepts a valid SIRET (Luhn-valide, Danone)', () => {
    expect(isValidLuhn('73282932000074')).toBe(true);
  });

  it('accepts a valid SIREN (Danone)', () => {
    expect(isValidLuhn('732829320')).toBe(true);
  });

  it('rejects an invalid SIRET (clé incorrecte)', () => {
    expect(isValidLuhn('12345678900000')).toBe(false);
  });

  it('rejects non-digit input', () => {
    expect(isValidLuhn('abcd5678901234')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidLuhn('')).toBe(false);
  });
});

describe('computeVatNumber', () => {
  it('generates the expected VAT for a known SIREN (Danone)', () => {
    // 732829320 mod 97 = 43 ; (12 + 3*43) mod 97 = 141 mod 97 = 44
    expect(computeVatNumber('732829320')).toBe('FR44732829320');
  });

  it('trims spaces before computing', () => {
    expect(computeVatNumber('732 829 320')).toBe('FR44732829320');
  });

  it('throws on invalid SIREN (not 9 digits)', () => {
    expect(() => computeVatNumber('12345')).toThrow();
    expect(() => computeVatNumber('1234567890')).toThrow();
  });
});

describe('siretSchema', () => {
  it('parses a valid 14-digit Luhn SIRET and strips spaces', () => {
    const result = siretSchema.parse('732 829 320 00074');
    expect(result).toBe('73282932000074');
  });

  it('rejects SIRET with wrong length', () => {
    expect(() => siretSchema.parse('1234567890')).toThrow();
  });

  it('rejects SIRET failing Luhn', () => {
    expect(() => siretSchema.parse('12345678900000')).toThrow();
  });
});

describe('sirenSchema', () => {
  it('parses a valid 9-digit SIREN', () => {
    expect(sirenSchema.parse('732 829 320')).toBe('732829320');
  });
});

describe('vatNumberSchema', () => {
  it('uppercases and trims spaces', () => {
    expect(vatNumberSchema.parse('fr 44 732 829 320')).toBe('FR44732829320');
  });

  it('rejects a malformed VAT', () => {
    expect(() => vatNumberSchema.parse('FR12')).toThrow();
  });
});

describe('b2bAccountSchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = b2bAccountSchema.parse({
      companyName: 'Ma Papeterie',
      email: 'contact@ma-papeterie.fr',
    });
    expect(parsed.companyName).toBe('Ma Papeterie');
  });

  it('rejects a short company name', () => {
    expect(() =>
      b2bAccountSchema.parse({
        companyName: 'A',
        email: 'contact@ma-papeterie.fr',
      }),
    ).toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() =>
      b2bAccountSchema.parse({
        companyName: 'Ma Papeterie',
        email: 'not-an-email',
      }),
    ).toThrow();
  });

  it('accepts a valid billing address', () => {
    const parsed = b2bAccountSchema.parse({
      companyName: 'Ma Papeterie',
      email: 'contact@ma-papeterie.fr',
      billingAddress: {
        street: '1 rue du Commerce',
        zip: '52000',
        city: 'Chaumont',
      },
    });
    expect(parsed.billingAddress?.zip).toBe('52000');
  });
});
