import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://ma-papeterie.fr";
const BATCH_SIZE = 5000; // Max URLs par sitemap (Google recommande max 50 000)

Deno.serve(async (req) => {
  // Pas d'auth : les sitemaps doivent être publics pour les crawlers
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "0");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Mode "index" : retourner le sitemap index avec le nombre de pages
    if (url.searchParams.get("index") === "true") {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (error) throw error;

      const totalProducts = count ?? 0;
      const totalPages = Math.ceil(totalProducts / BATCH_SIZE);
      const today = new Date().toISOString().split("T")[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Sitemap statique (pages principales)
      xml += `  <sitemap><loc>${SITE_URL}/sitemap-static.xml</loc><lastmod>${today}</lastmod></sitemap>\n`;

      // Sitemaps produits
      for (let i = 0; i < totalPages; i++) {
        xml += `  <sitemap><loc>${SITE_URL}/sitemap-products-${i}.xml</loc><lastmod>${today}</lastmod></sitemap>\n`;
      }

      xml += `</sitemapindex>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Mode "page" : retourner un lot de produits
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data: products, error } = await supabase
      .from("products")
      .select("id, updated_at, category")
      .eq("is_active", true)
      .order("id")
      .range(from, to);

    if (error) throw error;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const p of products ?? []) {
      const lastmod = p.updated_at
        ? new Date(p.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      xml += `  <url><loc>${SITE_URL}/produit/${p.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[sitemap-products]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
