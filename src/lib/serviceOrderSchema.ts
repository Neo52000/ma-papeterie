import { z } from 'zod';

export const deliverySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('pickup'),
  }),
  z.object({
    mode: z.literal('delivery'),
    address: z.object({
      street: z.string().min(3, 'Adresse requise (3 caractères min.)'),
      city: z.string().min(2, 'Ville requise'),
      postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
      country: z.string().default('France'),
    }),
  }),
]);

export const customerInfoSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2, 'Nom requis (2 caractères min.)'),
  phone: z.string().optional(),
  emailNotifications: z.boolean().default(true),
});

export type DeliveryData = z.infer<typeof deliverySchema>;
export type CustomerInfoData = z.infer<typeof customerInfoSchema>;
