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
  VITE_SHOPIFY_STOREFRONT_TOKEN: z
    .string()
    .min(1, "VITE_SHOPIFY_STOREFRONT_TOKEN ne peut pas être vide")
    .optional(),
});

type Env = z.infer<typeof envSchema>;

/**
 * Resolve env vars across client (Vite build-time) and SSR (Node.js runtime).
 *
 * Vite ONLY inlines VITE_* for STATIC dot-access patterns in the CLIENT bundle.
 * In SSR, static access compiles to undefined — we fall through to process.env.
 *
 * Known Supabase values are used as last-resort fallback. The anon key is public
 * by design (it's always exposed in the client JS bundle).
 */

// 1. Static access — Vite inlines these at build time for the client bundle.
//    In SSR they're replaced with `undefined` (expected).
const STATIC_ENV: Record<string, string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  VITE_SHOPIFY_STOREFRONT_TOKEN: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN,
};

// 2. Last-resort hardcoded fallbacks (public values only — anon key is not secret)
const FALLBACK: Record<string, string> = {
  VITE_SUPABASE_URL: "https://mgojmkzovqgpipybelrr.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM",
};

function resolveEnvVar(key: string, ...fallbackKeys: string[]): string | undefined {
  // Static import.meta.env (client: inlined by Vite at build, SSR: undefined)
  if (STATIC_ENV[key]) return STATIC_ENV[key];

  // process.env runtime (SSR on Netlify)
  if (typeof process !== "undefined" && process.env) {
    for (const k of [key, ...fallbackKeys]) {
      if (process.env[k]) return process.env[k];
    }
  }

  // Hardcoded fallback for known public values
  if (FALLBACK[key]) return FALLBACK[key];

  return undefined;
}

function validateEnv(): Env {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: resolveEnvVar("VITE_SUPABASE_URL", "SUPABASE_URL"),
    VITE_SUPABASE_PUBLISHABLE_KEY: resolveEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"),
    VITE_SUPABASE_PROJECT_ID: resolveEnvVar("VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID"),
    VITE_SHOPIFY_STOREFRONT_TOKEN: resolveEnvVar("VITE_SHOPIFY_STOREFRONT_TOKEN"),
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

// Lazy validation: defers validateEnv() until a property is actually accessed.
let _cached: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_cached) _cached = validateEnv();
    return _cached[prop as keyof Env];
  },
});
