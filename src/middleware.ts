import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase-server';

const USER_ROUTES = [
  '/checkout',
  '/mon-compte',
  '/mes-favoris',
  '/order-confirmation',
  '/service-confirmation',
  '/services/reprographie',
  '/services/developpement-photo',
];

function isPathOrChild(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function redirect(url: URL, pathname: string, responseHeaders: Headers): Response {
  const response = Response.redirect(new URL(pathname, url), 302);
  responseHeaders.forEach((value, key) => response.headers.append(key, value));
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

function redirectToAuth(url: URL, responseHeaders: Headers): Response {
  const target = new URL('/auth', url);
  target.searchParams.set('redirect', `${url.pathname}${url.search}`);
  const response = Response.redirect(target, 302);
  responseHeaders.forEach((value, key) => response.headers.append(key, value));
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = isPathOrChild(pathname, '/admin');
  const isProRoute = isPathOrChild(pathname, '/pro');
  const isUserRoute = USER_ROUTES.some((route) => isPathOrChild(pathname, route));
  const isProtected = isAdminRoute || isProRoute || isUserRoute;

  if (!isProtected) return next();

  const responseHeaders = new Headers();
  const supabase = createSupabaseServer(context.request, responseHeaders);
  context.locals.supabase = supabase;

  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;

  if (error || !userId) return redirectToAuth(context.url, responseHeaders);

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (rolesError) return new Response('Accès impossible', { status: 403 });

  const roleNames = new Set((roles ?? []).map(({ role }) => String(role)));
  const isAdmin = roleNames.has('admin') || roleNames.has('super_admin');
  const isPro = roleNames.has('pro') || isAdmin;
  const aal = data.claims.aal === 'aal2' ? 'aal2' : 'aal1';

  if (isAdminRoute) {
    if (!isAdmin) return redirect(context.url, '/', responseHeaders);
    if (pathname !== '/admin/2fa' && aal !== 'aal2') {
      return redirect(context.url, '/admin/2fa', responseHeaders);
    }
  }

  if (isProRoute && !isPro) {
    return redirect(context.url, '/', responseHeaders);
  }

  const response = await next();
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  responseHeaders.forEach((value, key) => response.headers.append(key, value));
  return response;
});
