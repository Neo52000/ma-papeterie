/**
 * Supabase SSR client for Astro pages and middleware.
 * Uses @supabase/ssr with cookie-based auth (no localStorage).
 *
 * IMPORTANT: This file runs ONLY on the server (SSR / Netlify Functions).
 * Netlify can expose public Supabase variables either to the function runtime
 * or only while Vite builds the SSR bundle, so both sources are supported.
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { env } from "../config/env";

const URL_KEYS = ["VITE_SUPABASE_URL", "SUPABASE_URL", "PUBLIC_SUPABASE_URL"];
const KEY_KEYS = ["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "PUBLIC_SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

function resolveEnv(names: string[]): string {
  for (const name of names) {
    const runtimeValue = process.env[name];
    if (runtimeValue) return runtimeValue;
  }
  return "";
}

/**
 * Create a Supabase client for server-side usage in Astro.
 * Pass the Astro request + response headers to handle cookies.
 */
export function createSupabaseServer(request: Request, responseHeaders?: Headers) {
  const url = resolveEnv(URL_KEYS) || env.VITE_SUPABASE_URL;
  const anonKey = resolveEnv(KEY_KEYS) || env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
        return parseCookieHeader(request.headers.get("Cookie") ?? "") as { name: string; value: string }[];
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
