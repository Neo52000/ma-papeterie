/**
 * Supabase SSR client for Astro pages and middleware.
 * Uses @supabase/ssr with cookie-based auth (no localStorage).
 *
 * IMPORTANT: This file runs ONLY on the server (SSR / Netlify Functions).
 * We use process.env (runtime) instead of import.meta.env (build-time)
 * because Vite statically replaces import.meta.env.VITE_* at build time
 * and the values may not be available during the Netlify build step.
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

const URL_KEYS = ["VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL"];
const KEY_KEYS = ["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "PUBLIC_SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

function resolveEnv(names: string[]): string {
  for (const name of names) {
    const val = process.env[name];
    if (val) return val;
  }
  return "";
}

/**
 * Create a Supabase client for server-side usage in Astro.
 * Pass the Astro request + response headers to handle cookies.
 */
export function createSupabaseServer(request: Request, responseHeaders?: Headers) {
  const url = resolveEnv(URL_KEYS);
  const anonKey = resolveEnv(KEY_KEYS);

  if (!url || !anonKey) {
    const supaKeys = Object.keys(process.env).filter((k) => /supa/i.test(k));
    console.error(
      "[supabase-server] MISSING ENV VARS.",
      "url found:", !!url, "| key found:", !!anonKey,
      "| SUPA-related env keys:", supaKeys.join(", ") || "(none)"
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        if (!responseHeaders) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options)
          );
        });
      },
    },
  });
}
