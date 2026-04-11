import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPage, type ContentBlock } from "@/hooks/useStaticPages";
import {
  SITE_URL, SITE_NAME, safeJsonLd, RenderBlock,
} from "@/components/dynamic-blocks";

// Re-export for consumers that import RenderBlock from this file
export { RenderBlock };

// ── JSON-LD helpers ──────────────────────────────────────────────────────────

function buildBreadcrumbJsonLd(slug: string, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/p/${slug}` },
    ],
  };
}

function buildFaqJsonLd(blocks: ContentBlock[]) {
  const faqBlocks = blocks.filter((b) => b.type === "faq") as Extract<ContentBlock, { type: "faq" }>[];
  const allQs = faqBlocks.flatMap((b) => b.questions ?? []);
  if (allQs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQs.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
    </div>
  );
}

// ── Page component ──────────────────────────────────────────────────────────

export default function DynamicPage() {
  const slug = window.location.pathname.split('/p/')[1]?.split('/')[0];
  const { data: page, isLoading, error } = usePublicPage(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main><PageSkeleton /></main>
        <Footer />
      </div>
    );
  }

  if (error || !page) {
    if (typeof window !== "undefined") window.location.href = "/404";
    return null;
  }

  const isFullWidth = page.layout === "full-width";
  const canonical = `${SITE_URL}/p/${page.slug}`;
  const metaTitle = page.meta_title || `${page.title} | ${SITE_NAME}`;
  const metaDesc = page.meta_description || "";
  const breadcrumbLd = buildBreadcrumbJsonLd(page.slug, page.title);
  const faqLd = buildFaqJsonLd(page.content ?? []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {page.json_ld && (
          <script type="application/ld+json">{safeJsonLd(page.json_ld)}</script>
        )}
        <script type="application/ld+json">{safeJsonLd(breadcrumbLd)}</script>
        {faqLd && <script type="application/ld+json">{safeJsonLd(faqLd)}</script>}
      </Helmet>

      <Header />

      <main>
        {!isFullWidth && (
          <div className="container mx-auto px-4 py-12 max-w-3xl">
            <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-1.5">
              <a href="/" className="hover:text-primary transition-colors">Accueil</a>
              <span>/</span>
              <span className="text-foreground">{page.title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              {page.h1 || page.title}
            </h1>
            {page.published_at && (
              <p className="text-xs text-muted-foreground mb-8">
                Publié le {new Date(page.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        <div className={isFullWidth ? "" : "container mx-auto px-4 max-w-3xl pb-12"}>
          {(page.content ?? []).map((block, i) => (
            <RenderBlock key={block.id ?? i} block={block} fullWidth={isFullWidth} />
          ))}
        </div>

        {!isFullWidth && (
          <div className="container mx-auto px-4 max-w-3xl pb-12">
            <div className="pt-8 border-t">
              <a href="/" className="text-sm text-primary hover:underline">← Retour à l'accueil</a>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
