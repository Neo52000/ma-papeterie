import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({ required_error: "VITE_SUPABASE_URL est requis" })
    .url("VITE_SUPABASE_URL doit être une URL valide"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string({ required_error: "VITE_SUPABASE_PUBLISHABLE_KEY est requis" })
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY ne peut pas être vide"),
  VITE_SUPABASE_PROJECT_ID: z
    .string()
    .min(1)
    .optional(),
});

function validateEnv() {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const msg = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    console.error(
      `❌ Variables d'environnement manquantes ou invalides:\n${msg}\n\nCréez un fichier .env à la racine du projet (voir .env.example).`
    );
    throw new Error("Configuration d'environnement invalide");
  }

  return result.data;
}

export const env = validateEnv();
