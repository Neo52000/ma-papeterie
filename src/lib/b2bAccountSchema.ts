import { z } from 'zod';

/**
 * Valide la clé de contrôle Luhn d'un SIRET (14 chiffres) ou SIREN (9 chiffres).
 * Référence : INSEE — Informatique et Libertés, Norme ISO/IEC 7812-1.
 */
export function isValidLuhn(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  let sum = 0;
  const len = value.length;
  for (let i = 0; i < len; i++) {
    let digit = Number(value[len - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Calcule le numéro de TVA intracommunautaire français à partir d'un SIREN.
 * Formule officielle : FR + (12 + 3 * (SIREN mod 97)) mod 97, sur 2 chiffres, + SIREN.
 */
export function computeVatNumber(siren: string): string {
  const clean = siren.replace(/\s/g, '');
  if (!/^\d{9}$/.test(clean)) {
    throw new Error('SIREN invalide (9 chiffres requis)');
  }
  const sirenNum = BigInt(clean);
  const key = ((12n + (3n * (sirenNum % 97n))) % 97n).toString().padStart(2, '0');
  return `FR${key}${clean}`;
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const siretSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^\d{14}$/.test(v), {
    message: 'Le SIRET doit contenir 14 chiffres',
  })
  .refine(isValidLuhn, {
    message: 'SIRET invalide (clé de contrôle Luhn incorrecte)',
  });

export const sirenSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^\d{9}$/.test(v), {
    message: 'Le SIREN doit contenir 9 chiffres',
  })
  .refine(isValidLuhn, {
    message: 'SIREN invalide (clé de contrôle Luhn incorrecte)',
  });

export const vatNumberSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, '').toUpperCase())
  .refine((v) => /^FR\d{11}$/.test(v), {
    message: 'Numéro de TVA invalide (format FR + 11 chiffres)',
  });

export const billingAddressSchema = z.object({
  street: z.string().min(3, 'Adresse requise'),
  zip: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  city: z.string().min(2, 'Ville requise'),
});

export const b2bAccountSchema = z.object({
  companyName: z.string().min(2, 'Raison sociale requise'),
  siret: siretSchema.optional(),
  vatNumber: vatNumberSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide'),
  billingAddress: billingAddressSchema.optional(),
});

export type B2BAccountInput = z.infer<typeof b2bAccountSchema>;
export type BillingAddress = z.infer<typeof billingAddressSchema>;
