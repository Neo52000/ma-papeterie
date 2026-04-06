/**
 * Supabase SSR client for Astro pages and middleware.
 * Uses @supabase/ssr with cookie-based auth (no localStorage).
 *
 * The browser client (src/integrations/supabase/client.ts) remains
 * for React Islands that run client-side.
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Create a Supabase client for server-side usage in Astro.
 * Pass the Astro request + response headers to handle cookies.
 */
export function createSupabaseServer(request: Request, responseHeaders?: Headers) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
