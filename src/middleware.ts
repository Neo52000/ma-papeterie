/**
 * Astro middleware — server-side auth protection.
 * Replaces AdminGuard, AuthGuard, ProGuard for initial page loads.
 * Guards are still needed inside client-only Islands (admin SPA) for client-side navigation.
 */
import { defineMiddleware } from "astro:middleware";
import { createSupabaseServer } from "./lib/supabase-server";

const AUTH_REQUIRED = ["/mon-compte", "/mes-favoris", "/checkout", "/order-confirmation", "/service-confirmation"];
const ADMIN_REQUIRED = ["/admin"];
const PRO_REQUIRED = ["/pro/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect, cookies } = context;
  const pathname = url.pathname;

  // Skip middleware for static assets and API routes
  if (pathname.startsWith("/_") || pathname.startsWith("/api/") || pathname.includes(".")) {
    return next();
  }

  // Create Supabase server client
  const responseHeaders = new Headers();
  const supabase = createSupabaseServer(request, responseHeaders);

  // Check auth for protected routes
  const needsAuth =
    AUTH_REQUIRED.some((p) => pathname.startsWith(p)) ||
    ADMIN_REQUIRED.some((p) => pathname.startsWith(p)) ||
    PRO_REQUIRED.some((p) => pathname.startsWith(p));

  if (needsAuth) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return redirect("/auth");
    }

    // Admin check
    if (ADMIN_REQUIRED.some((p) => pathname.startsWith(p))) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["admin", "super_admin"].includes(profile.role)) {
        return redirect("/");
      }
    }

    // Pro check
    if (PRO_REQUIRED.some((p) => pathname.startsWith(p))) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_pro")
        .eq("id", user.id)
        .single();

      if (!profile?.is_pro && !["admin", "super_admin"].includes(profile?.role)) {
        return redirect("/");
      }
    }

    // Make user available to pages
    context.locals.user = user;
  }

  context.locals.supabase = supabase;

  // Continue to the page
  const response = await next();

  // Copy auth cookies to response
  responseHeaders.forEach((value, key) => {
    response.headers.append(key, value);
  });

  return response;
});
