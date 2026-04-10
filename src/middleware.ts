/**
 * Astro middleware — initializes Supabase server client and forwards auth cookies.
 *
 * NOTE: Server-side auth guards are disabled because Supabase auth sessions live
 * in localStorage (client-only). The SSR server client reads cookies but cannot
 * see localStorage, so server-side auth checks always see "unauthenticated".
 * Access control is enforced client-side by AdminGuard, AuthGuard, ProGuard.
 *
 * TODO: migrate to cookie-based auth (PKCE flow) to enable server-side protection.
 */
import { defineMiddleware } from "astro:middleware";
import { createSupabaseServer } from "./lib/supabase-server";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // Skip middleware for static assets and API routes
  if (pathname.startsWith("/_") || pathname.startsWith("/api/") || pathname.includes(".")) {
    return next();
  }

  // Create Supabase server client — wrapped in try-catch so a missing
  // env var doesn't crash every single page on the site.
  const responseHeaders = new Headers();
  try {
    context.locals.supabase = createSupabaseServer(request, responseHeaders);
  } catch (err) {
    console.error("[middleware] Supabase init failed:", err);
    return next();
  }

  // Continue to the page
  const response = await next();

  // Copy auth cookies to response
  responseHeaders.forEach((value, key) => {
    response.headers.append(key, value);
  });

  return response;
});
