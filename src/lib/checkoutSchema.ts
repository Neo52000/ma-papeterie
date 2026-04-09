import { z } from "zod";

export const shippingAddressSchema = z.object({
  street: z.string().min(3, "Adresse requise (3 caractères min.)"),
  city: z.string().min(2, "Ville requise"),
  postal_code: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  country: z.string().default("France"),
});

export const checkoutStep1Schema = z.object({
  customer_email: z.string().email("Email invalide"),
  customer_phone: z.string()
    .optional()
    .refine(
      (val) => !val || /^(\+33|0)[67]\d{8}$/.test(val.replace(/[\s.\-()]/g, "")),
      { message: "Numéro de mobile français invalide (06/07)" },
    ),
  shipping_address: shippingAddressSchema,
});

export const checkoutStep2Schema = z.object({
  same_billing: z.boolean(),
  billing_address: z.object({
    street: z.string(),
    city: z.string(),
    postal_code: z.string(),
    country: z.string().default("France"),
  }),
  notes: z.string().max(1000, "1000 caractères maximum").optional(),
}).refine(
  (data) => data.same_billing || (
    data.billing_address.street.length >= 3 &&
    data.billing_address.city.length >= 2 &&
    /^\d{5}$/.test(data.billing_address.postal_code)
  ),
  { message: "Adresse de facturation incomplète", path: ["billing_address"] }
);

export type CheckoutStep1Data = z.infer<typeof checkoutStep1Schema>;
export type CheckoutStep2Data = z.infer<typeof checkoutStep2Schema>;
