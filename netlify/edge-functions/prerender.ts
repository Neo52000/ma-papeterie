import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SITE_URL = "https://ma-papeterie.fr";
const SITE_NAME = "Ma Papeterie — Expert conseil en fournitures";
const BUSINESS_PHONE = "+33310960224";
const BUSINESS_EMAIL = "contact@ma-papeterie.fr";

// ── Crawler detection ──────────────────────────────────────────────���─────────

const CRAWLER_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slurp/i,
  /applebot/i,
];

function isCrawler(userAgent: string): boolean {
  return CRAWLER_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function supabaseFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

// ── Known static routes ────────────────────────────────────────────────────��─
// All routes from React Router that do NOT have dynamic segments

const KNOWN_STATIC_ROUTES = new Set([
  "/",
  "/services",
  "/shop",
  "/catalogue",
  "/consommables",
  "/promotions",
  "/contact",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/listes-scolaires",
  "/a-propos",
  "/faq",
  "/blog",
  "/livraison",
  "/reponse-officielle-ia",
  "/impression-urgente-chaumont",
  "/photocopie-express-chaumont",
  "/photos-express-chaumont",
  "/plaque-immatriculation-chaumont",
  "/tampon-professionnel-chaumont",
  "/tampon-designer",
  "/papier-peint-personnalise",
  "/impression-fine-art",
  "/impression-plans-techniques",
  "/impression-patron-couture",
  "/solutions-institutions-chaumont",
  "/solutions-emballage",
  "/maroquinerie-bagagerie-accessoires",
  "/chaises-home-office",
  "/inscription-pro",
  "/pack-pro-local-chaumont",
  "/leasing-mobilier-bureau",
  "/mentions-legales",
  "/politique-confidentialite",
  "/cgv",
  "/cookies",
  // Authenticated routes (exist but crawlers shouldn't index)
  "/services/reprographie",
  "/services/developpement-photo",
  "/mon-compte",
  "/mes-favoris",
  "/checkout",
  "/order-confirmation",
  "/service-confirmation",
]);

// Route prefixes that accept dynamic segments (validated by DB lookup)
const DYNAMIC_ROUTE_PREFIXES = [
  "/produit/",
  "/product/",
  "/blog/",
  "/p/",
  "/consommables/",
  "/tampon-designer/",
];

// Routes blocked in robots.txt — no need to prerender or 404-check
const PRIVATE_PREFIXES = ["/admin", "/pro/", "/api/"];

// ── Static page meta data ────────────────────────────────────────────────────

const STATIC_PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Ma Papeterie | Fournitures de bureau & scolaires — Expert conseil en ligne",
    description: "Ma Papeterie à Chaumont (52000) : fournitures scolaires et de bureau sélectionnées par des experts. Conseil personnalisé, livraison rapide.",
  },
  "/shop": {
    title: "Boutique | Fournitures sélectionnées — Ma Papeterie",
    description: "Découvrez notre sélection de fournitures scolaires et de bureau. Prix compétitifs, livraison rapide.",
  },
  "/catalogue": {
    title: "Catalogue | 40 000+ fournitures scolaires et de bureau — Ma Papeterie",
    description: "Parcourez notre catalogue complet de fournitures. Filtrez par catégorie, marque, prix. Livraison rapide partout en France.",
  },
  "/contact": {
    title: "Contact | Ma Papeterie — Chaumont (52000)",
    description: "Contactez Ma Papeterie à Chaumont. Tél : 03 10 96 02 24. Email : contact@ma-papeterie.fr. 10 rue Toupot de Beveaux, 52000 Chaumont.",
  },
  "/faq": {
    title: "FAQ | Questions fréquentes — Ma Papeterie",
    description: "Trouvez les réponses à vos questions : livraison, retours, paiement, commandes professionnelles, services d'impression.",
  },
  "/a-propos": {
    title: "À propos | Papeterie Reine & Fils — Ma Papeterie",
    description: "Papeterie familiale à Chaumont depuis des générations. Découvrez notre histoire, nos valeurs et notre engagement qualité.",
  },
  "/blog": {
    title: "Blog | Conseils & actualités — Ma Papeterie",
    description: "Conseils, astuces et actualités sur les fournitures scolaires et de bureau. Guides d'achat, comparatifs, tendances.",
  },
  "/services": {
    title: "Services | Impression, photocopie, tampons — Ma Papeterie Chaumont",
    description: "Services de proximité à Chaumont : impression urgente, photocopie express, plaques d'immatriculation, tampons professionnels.",
  },
  "/promotions": {
    title: "Promotions | Offres spéciales — Ma Papeterie",
    description: "Profitez de nos promotions sur les fournitures scolaires et de bureau. Offres limitées, prix réduits.",
  },
  "/livraison": {
    title: "Livraison | Tarifs et délais — Ma Papeterie",
    description: "Informations sur la livraison : tarifs, délais, suivi de commande. Livraison rapide partout en France.",
  },
  "/listes-scolaires": {
    title: "Listes scolaires | Préparez la rentrée — Ma Papeterie",
    description: "Retrouvez les listes scolaires et préparez la rentrée facilement. Fournitures de qualité sélectionnées par nos experts.",
  },
  "/impression-urgente-chaumont": {
    title: "Impression urgente à Chaumont | Ma Papeterie",
    description: "Besoin d'une impression urgente à Chaumont ? Ma Papeterie vous propose un service rapide et de qualité.",
  },
  "/photocopie-express-chaumont": {
    title: "Photocopie express à Chaumont | Ma Papeterie",
    description: "Service de photocopie express à Chaumont. Noir et blanc, couleur, grand format. Rapidité et qualité garanties.",
  },
  "/tampon-professionnel-chaumont": {
    title: "Tampon professionnel à Chaumont | Ma Papeterie",
    description: "Créez votre tampon professionnel personnalisé à Chaumont. Large choix de formats, encres et modèles.",
  },
  "/plaque-immatriculation-chaumont": {
    title: "Plaque d'immatriculation à Chaumont | Ma Papeterie",
    description: "Fabrication de plaques d'immatriculation homologuées à Chaumont. Service rapide, normes respectées.",
  },
};

// ── Product types & rendering ────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number;
  price_ttc: number | null;
  price_ht: number | null;
  brand: string | null;
  ean: string | null;
  sku_interne: string | null;
  image_url: string | null;
  category: string;
  stock_quantity: number | null;
  is_active: boolean | null;
}

async function fetchProduct(slugOrId: string): Promise<Product | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  // Try slug first, then UUID fallback
  let response = await supabaseFetch(
    `products?slug=eq.${encodeURIComponent(slugOrId)}&limit=1`
  );

  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) return data[0];
  }

  // Fallback: try by UUID if the param looks like one
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(slugOrId)) {
    response = await supabaseFetch(`products?id=eq.${slugOrId}&limit=1`);
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) return data[0];
    }
  }

  return null;
}

function buildProductSchemaLD(product: Product): string {
  const price = product.price_ttc || product.price;
  const availability =
    (product.stock_quantity ?? 0) > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    image: product.image_url || "",
    sku: product.sku_interne || product.ean || product.id,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: price.toFixed(2),
      availability,
      seller: {
        "@type": "Organization",
        name: "Ma Papeterie",
      },
    },
  };

  if (product.brand) {
    schema.brand = { "@type": "Brand", name: product.brand };
  }
  if (product.ean) {
    schema.gtin13 = product.ean;
  }

  return JSON.stringify(schema);
}

function buildProductHtml(product: Product, canonical: string): string {
  const title = escapeHtml(
    `${product.name}${product.brand ? ` ${product.brand}` : ""} | Ma Papeterie`
  );
  const description = escapeHtml(
    product.description?.slice(0, 160) || `${product.name} — Fourniture sélectionnée par nos experts. Livraison rapide.`
  );
  const price = product.price_ttc || product.price;
  const imageUrl = product.image_url || "";
  const schemaLD = buildProductSchemaLD(product);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="product:price:amount" content="${price.toFixed(2)}">
  <meta property="product:price:currency" content="EUR">
  <script type="application/ld+json">${schemaLD}</script>
</head>
<body>
  <h1>${escapeHtml(product.name)}</h1>
  <p>${escapeHtml(product.description || "")}</p>
  <p>Prix : ${price.toFixed(2)} € TTC</p>
  ${product.brand ? `<p>Marque : ${escapeHtml(product.brand)}</p>` : ""}
  <p>Catégorie : ${escapeHtml(product.category)}</p>
  <a href="${escapeHtml(canonical)}">Voir le produit</a>
</body>
</html>`;
}

// ── Blog article rendering ───────────────────────────────────────────────────

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  category: string | null;
}

async function fetchBlogArticle(slug: string): Promise<BlogArticle | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const response = await supabaseFetch(
    `blog_articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
  );

  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) return data[0];
  }
  return null;
}

function buildBlogArticleHtml(article: BlogArticle, canonical: string): string {
  const title = escapeHtml(`${article.title} — Ma Papeterie`);
  const description = escapeHtml(
    article.excerpt?.slice(0, 160) || `${article.title} — Blog Ma Papeterie`
  );
  const imageUrl = article.image_url || `${SITE_URL}/og-image.png`;

  const blogPostingLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt || article.title,
    image: imageUrl,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Organization",
      name: "Ma Papeterie",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Ma Papeterie",
      url: SITE_URL,
    },
    mainEntityOfPage: canonical,
  });

  const breadcrumbLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${blogPostingLD}</script>
  <script type="application/ld+json">${breadcrumbLD}</script>
</head>
<body>
  <h1>${escapeHtml(article.title)}</h1>
  <p>${escapeHtml(article.excerpt || "")}</p>
  <a href="${SITE_URL}/blog">Retour au blog</a>
</body>
</html>`;
}

// ── CMS dynamic page rendering ───────────────────────────────────────────────

interface StaticPage {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
}

async function fetchStaticPage(slug: string): Promise<StaticPage | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const response = await supabaseFetch(
    `static_pages?slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
  );

  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) return data[0];
  }
  return null;
}

// ── Static page HTML builder ─────────────────────────────────────────────────

function buildStaticPageHtml(meta: { title: string; description: string }, canonical: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${SITE_URL}">Accueil Ma Papeterie</a>
</body>
</html>`;
}

// ── 404 HTML ─────────────────────────────────────────────────────────────────

function build404Html(pathname: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page introuvable — Ma Papeterie</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="${SITE_URL}">
</head>
<body>
  <h1>Page introuvable</h1>
  <p>La page ${escapeHtml(pathname)} n'existe pas.</p>
  <a href="${SITE_URL}">Retour �� l'accueil</a>
</body>
</html>`;
}

// ── Route validation ─────────────────────────────────────────────────────────

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
}

function isKnownStaticRoute(pathname: string): boolean {
  return KNOWN_STATIC_ROUTES.has(pathname);
}

function isDynamicRoutePrefix(pathname: string): boolean {
  return DYNAMIC_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

async function doesDynamicResourceExist(pathname: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return true; // fail open if no Supabase

  // /produit/:slug or /product/:handle
  const productMatch = pathname.match(/^\/(produit|product)\/([^/]+)$/);
  if (productMatch) {
    const product = await fetchProduct(productMatch[2]);
    return product !== null;
  }

  // /blog/:slug
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const article = await fetchBlogArticle(blogMatch[1]);
    return article !== null;
  }

  // /p/:slug (CMS pages)
  const cmsMatch = pathname.match(/^\/p\/([^/]+)$/);
  if (cmsMatch) {
    const page = await fetchStaticPage(cmsMatch[1]);
    return page !== null;
  }

  // /consommables/:brandSlug(/:modelSlug) — accept without DB check (too complex)
  if (pathname.startsWith("/consommables/")) return true;

  // /tampon-designer/:modelSlug — accept without DB check
  if (pathname.startsWith("/tampon-designer/")) return true;

  return false;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(request: Request, context: Context) {
  const userAgent = request.headers.get("user-agent") || "";

  // Only intercept crawlers — normal users get the SPA
  if (!isCrawler(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/"; // normalize trailing slash

  // ── Private routes: let SPA handle (robots.txt blocks these anyway)
  if (isPrivateRoute(pathname)) {
    return context.next();
  }

  // ── Product pages: /produit/:slugOrId — full pre-render
  const productMatch = pathname.match(/^\/produit\/([^/]+)$/);
  if (productMatch) {
    const slugOrId = decodeURIComponent(productMatch[1]);

    // Validate slug format to prevent path traversal / injection
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slugOrId) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)) {
      return new Response(build404Html(pathname), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
      });
    }
    if (slugOrId.length > 200) {
      return new Response(build404Html(pathname), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
      });
    }

    const product = await fetchProduct(slugOrId);

    if (product) {
      const canonicalSlug = product.slug || product.id;
      const canonical = `${SITE_URL}/produit/${canonicalSlug}`;
      const html = buildProductHtml(product, canonical);

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Robots-Tag": "index, follow",
        },
      });
    }

    // Product not found → 404
    return new Response(build404Html(pathname), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  // ── Blog articles: /blog/:slug — full pre-render
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    if (slug.length > 200 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
      return new Response(build404Html(pathname), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
      });
    }

    const article = await fetchBlogArticle(slug);
    if (article) {
      const canonical = `${SITE_URL}/blog/${article.slug}`;
      return new Response(buildBlogArticleHtml(article, canonical), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Robots-Tag": "index, follow",
        },
      });
    }

    return new Response(build404Html(pathname), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  // ── CMS dynamic pages: /p/:slug
  const cmsMatch = pathname.match(/^\/p\/([^/]+)$/);
  if (cmsMatch) {
    const slug = decodeURIComponent(cmsMatch[1]);
    const page = await fetchStaticPage(slug);
    if (page) {
      const canonical = `${SITE_URL}/p/${page.slug}`;
      return new Response(
        buildStaticPageHtml(
          { title: `${page.title} | Ma Papeterie`, description: page.meta_description || page.title },
          canonical
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "X-Robots-Tag": "index, follow",
          },
        }
      );
    }

    return new Response(build404Html(pathname), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  // ── Known static routes: pre-render with meta if available
  if (isKnownStaticRoute(pathname)) {
    const meta = STATIC_PAGE_META[pathname];
    if (meta) {
      const canonical = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
      return new Response(buildStaticPageHtml(meta, canonical), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Robots-Tag": "index, follow",
        },
      });
    }
    // Known route but no meta defined — let SPA handle
    return context.next();
  }

  // ── Dynamic routes without full pre-render (consommables, tampon-designer)
  if (isDynamicRoutePrefix(pathname)) {
    const exists = await doesDynamicResourceExist(pathname);
    if (exists) {
      return context.next(); // let SPA render
    }
    return new Response(build404Html(pathname), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  // ── Unknown route → 404 for crawlers
  return new Response(build404Html(pathname), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
