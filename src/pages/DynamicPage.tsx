import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { usePublicPage, type ContentBlock } from "@/hooks/useStaticPages";

const SITE_URL = "https://ma-papeterie.fr";
const SITE_NAME = "Papeterie Reine & Fils — Chaumont";

// ── Renderers de blocs ─────────────────────────────────────────────────────────

function BlockHeading({ block }: { block: ContentBlock }) {
  const cls = "font-bold text-foreground";
  if (block.level === 3) return <h3 className={`text-xl ${cls} mt-6 mb-3`}>{block.content}</h3>;
  return <h2 className={`text-2xl ${cls} mt-10 mb-4 pb-2 border-b`}>{block.content}</h2>;
}

function BlockParagraph({ block }: { block: ContentBlock }) {
  return <p className="text-muted-foreground leading-relaxed mb-4">{block.content}</p>;
}

function BlockList({ block }: { block: ContentBlock }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className={`mb-4 space-y-1.5 ${block.ordered ? "list-decimal" : "list-disc"} pl-6`}>
      {(block.items ?? []).map((item, i) => (
        <li key={i} className="text-muted-foreground leading-relaxed">{item}</li>
      ))}
    </Tag>
  );
}

function BlockFaq({ block }: { block: ContentBlock }) {
  const questions = block.questions ?? [];
  if (questions.length === 0) return null;
  return (
    <div className="mb-6 border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <h3 className="font-semibold text-sm">Questions fréquentes</h3>
      </div>
      <Accordion type="multiple" className="px-2">
        {questions.map((q, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-sm text-left font-medium">{q.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{q.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function BlockCta({ block }: { block: ContentBlock }) {
  return (
    <div className="my-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
      {block.title && <h3 className="text-xl font-bold mb-2">{block.title}</h3>}
      {block.description && <p className="text-muted-foreground mb-4">{block.description}</p>}
      {block.link && block.button && (
        <Button asChild>
          <Link to={block.link}>{block.button}</Link>
        </Button>
      )}
    </div>
  );
}

function RenderBlock({ block, index }: { block: ContentBlock; index: number }) {
  switch (block.type) {
    case "heading":   return <BlockHeading key={index} block={block} />;
    case "paragraph": return <BlockParagraph key={index} block={block} />;
    case "list":      return <BlockList key={index} block={block} />;
    case "faq":       return <BlockFaq key={index} block={block} />;
    case "cta":       return <BlockCta key={index} block={block} />;
    default:          return null;
  }
}

// ── Breadcrumb JSON-LD ─────────────────────────────────────────────────────────

function buildBreadcrumbJsonLd(slug: string, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": title, "item": `${SITE_URL}/p/${slug}` },
    ],
  };
}

// ── FAQPage JSON-LD auto depuis les blocs ──────────────────────────────────────

function buildFaqJsonLd(blocks: ContentBlock[]) {
  const faqBlocks = blocks.filter((b) => b.type === "faq");
  if (faqBlocks.length === 0) return null;
  const allQs = faqBlocks.flatMap((b) => b.questions ?? []);
  if (allQs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allQs.map((q) => ({
      "@type": "Question",
      "name": q.q,
      "acceptedAnswer": { "@type": "Answer", "text": q.a },
    })),
  };
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
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
    return <Navigate to="/404" replace />;
  }

  const canonical = `${SITE_URL}/p/${page.slug}`;
  const metaTitle  = page.meta_title  || `${page.title} | ${SITE_NAME}`;
  const metaDesc   = page.meta_description || "";
  const breadcrumbLd = buildBreadcrumbJsonLd(page.slug, page.title);
  const faqLd       = buildFaqJsonLd(page.content ?? []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url"         content={canonical} />
        <meta property="og:site_name"   content={SITE_NAME} />
        <meta property="og:locale"      content="fr_FR" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />

        {/* Schema.org principal */}
        {page.json_ld && (
          <script type="application/ld+json">{JSON.stringify(page.json_ld)}</script>
        )}
        {/* BreadcrumbList */}
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        {/* FAQPage auto si blocs FAQ présents */}
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Fil d'Ariane */}
        <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
          <span>/</span>
          <span className="text-foreground">{page.title}</span>
        </nav>

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
          {page.h1 || page.title}
        </h1>

        {/* Métadonnées de publication */}
        {page.published_at && (
          <p className="text-xs text-muted-foreground mb-8">
            Publié le {new Date(page.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        {/* Contenu */}
        <div className="prose-custom">
          {(page.content ?? []).map((block, i) => (
            <RenderBlock key={i} block={block} index={i} />
          ))}
        </div>

        {/* Retour accueil */}
        <div className="mt-12 pt-8 border-t">
          <Link to="/" className="text-sm text-primary hover:underline">← Retour à l'accueil</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
