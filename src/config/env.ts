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
 * Resolve an env var: try import.meta.env (client, build-time inlined)
 * then process.env (SSR runtime) with multiple possible names.
 *
 * IMPORTANT: Vite only inlines VITE_* vars for STATIC access patterns
 * (import.meta.env.VITE_FOO). Dynamic access (import.meta.env[key])
 * does NOT include VITE_* in the env object. So we must use static
 * access for the client bundle, and process.env for SSR.
 */

// Static access — Vite replaces these at build time for the client bundle.
// In SSR they compile to undefined, which is fine (we fall through to process.env).
const STATIC_ENV: Record<string, string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  VITE_SHOPIFY_STOREFRONT_TOKEN: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN,
};

function resolveEnvVar(key: string, ...fallbackKeys: string[]): string | undefined {
  // 1. Static import.meta.env (client: inlined by Vite at build, SSR: undefined)
  if (STATIC_ENV[key]) return STATIC_ENV[key];

  // 2. process.env runtime (SSR on Netlify — env vars injected at function runtime)
  if (typeof process !== "undefined" && process.env) {
    for (const k of [key, ...fallbackKeys]) {
      const val = process.env[k];
      if (val) return val;
    }
  }

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
// This prevents build-time crashes during Astro prerendering, where env vars
// may not be available but the Supabase client is never actually called.
let _cached: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_cached) _cached = validateEnv();
    return _cached[prop as keyof Env];
  },
});
