import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SITE_URL = "https://ma-papeterie.fr";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  let url = `${SUPABASE_URL}/rest/v1/products?slug=eq.${encodeURIComponent(slugOrId)}&limit=1`;
  let response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) return data[0];
  }

  // Fallback: try by UUID if the param looks like one
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(slugOrId)) {
    url = `${SUPABASE_URL}/rest/v1/products?id=eq.${slugOrId}&limit=1`;
    response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
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

export default async function handler(request: Request, context: Context) {
  const userAgent = request.headers.get("user-agent") || "";

  // Only intercept crawlers — normal users get the SPA
  if (!isCrawler(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Product pages: /produit/:slugOrId
  const productMatch = pathname.match(/^\/produit\/([^/]+)$/);
  if (productMatch) {
    const slugOrId = decodeURIComponent(productMatch[1]);

    // Validate slug format to prevent path traversal / injection
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slugOrId) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)) {
      return new Response("Invalid product identifier", { status: 400 });
    }
    if (slugOrId.length > 200) {
      return new Response("Identifier too long", { status: 400 });
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
  }

  // For other pages, let the SPA handle (crawlers will still see meta from index.html)
  return context.next();
}
