import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://ma-papeterie.fr";
const PRODUCTS_PER_SITEMAP = 10_000;

// ── Pages statiques connues ──────────────────────────────────────────────────
const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/shop", changefreq: "daily", priority: "0.9" },
  { loc: "/catalogue", changefreq: "daily", priority: "0.9" },
  { loc: "/promotions", changefreq: "daily", priority: "0.8" },
  { loc: "/services", changefreq: "weekly", priority: "0.7" },
  { loc: "/listes-scolaires", changefreq: "weekly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.6" },
  { loc: "/a-propos", changefreq: "monthly", priority: "0.5" },
  { loc: "/faq", changefreq: "monthly", priority: "0.5" },
  { loc: "/livraison", changefreq: "monthly", priority: "0.4" },
  { loc: "/blog", changefreq: "weekly", priority: "0.6" },
  // SEO locales
  { loc: "/impression-urgente-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/photocopie-express-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/plaque-immatriculation-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/tampon-professionnel-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/solutions-institutions-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/pack-pro-local-chaumont", changefreq: "monthly", priority: "0.6" },
  { loc: "/reponse-officielle-ia", changefreq: "monthly", priority: "0.5" },
  // Légales
  { loc: "/mentions-legales", changefreq: "yearly", priority: "0.2" },
  { loc: "/politique-confidentialite", changefreq: "yearly", priority: "0.2" },
  { loc: "/cgv", changefreq: "yearly", priority: "0.2" },
  { loc: "/cookies", changefreq: "yearly", priority: "0.2" },
];

function xmlHeader(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Sitemap Index ────────────────────────────────────────────────────────────
function buildSitemapIndex(productCount: number): string {
  const today = todayISO();
  const totalProductSitemaps = Math.ceil(productCount / PRODUCTS_PER_SITEMAP);

  let xml = xmlHeader();
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Sitemap des pages statiques
  xml += `  <sitemap>\n`;
  xml += `    <loc>${SITE_URL}/sitemap-static.xml</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `  </sitemap>\n`;

  // Sitemap des catégories
  xml += `  <sitemap>\n`;
  xml += `    <loc>${SITE_URL}/sitemap-categories.xml</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `  </sitemap>\n`;

  // Sitemaps produits (paginés par 10k)
  for (let i = 1; i <= totalProductSitemaps; i++) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${SITE_URL}/sitemap-products-${i}.xml</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  }

  // Sitemap des pages CMS dynamiques
  xml += `  <sitemap>\n`;
  xml += `    <loc>${SITE_URL}/sitemap-pages.xml</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `  </sitemap>\n`;

  xml += "</sitemapindex>";
  return xml;
}

// ── Sitemap statique ─────────────────────────────────────────────────────────
function buildStaticSitemap(): string {
  const today = todayISO();
  let xml = xmlHeader();
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of STATIC_PAGES) {
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>";
  return xml;
}

// ── Sitemap catégories ───────────────────────────────────────────────────────
async function buildCategoriesSitemap(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const today = todayISO();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("slug");

  let xml = xmlHeader();
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const cat of categories ?? []) {
    const lastmod = cat.updated_at
      ? new Date(cat.updated_at).toISOString().slice(0, 10)
      : today;
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}/catalogue?category=${escapeXml(cat.slug)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>";
  return xml;
}

// ── Sitemap produits (paginé) ────────────────────────────────────────────────
async function buildProductsSitemap(
  supabase: ReturnType<typeof createClient>,
  page: number
): Promise<string> {
  const offset = (page - 1) * PRODUCTS_PER_SITEMAP;

  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at")
    .eq("is_active", true)
    .order("id")
    .range(offset, offset + PRODUCTS_PER_SITEMAP - 1);

  const today = todayISO();

  let xml = xmlHeader();
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const p of products ?? []) {
    const lastmod = p.updated_at
      ? new Date(p.updated_at).toISOString().slice(0, 10)
      : today;
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}/produit/${escapeXml(p.id)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>";
  return xml;
}

// ── Sitemap pages CMS dynamiques ────────────────────────────────────────────
async function buildPagesSitemap(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const today = todayISO();

  const { data: pages } = await (supabase as any)
    .from("static_pages")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("slug");

  let xml = xmlHeader();
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const p of pages ?? []) {
    const lastmod = p.updated_at
      ? new Date(p.updated_at).toISOString().slice(0, 10)
      : today;
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}/p/${escapeXml(p.slug)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.5</priority>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>";
  return xml;
}

// ── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "index";
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const xmlHeaders = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    let xml: string;

    switch (type) {
      case "static":
        xml = buildStaticSitemap();
        break;

      case "categories":
        xml = await buildCategoriesSitemap(supabase);
        break;

      case "products": {
        xml = await buildProductsSitemap(supabase, page);
        break;
      }

      case "pages":
        xml = await buildPagesSitemap(supabase);
        break;

      case "index":
      default: {
        // Count total products to determine number of sub-sitemaps
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);

        xml = buildSitemapIndex(count ?? 0);
        break;
      }
    }

    return new Response(xml, { headers: xmlHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      { status: 500, headers: xmlHeaders }
    );
  }
});
