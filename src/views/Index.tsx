import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { usePublicPage } from "@/hooks/useStaticPages";
import { RenderBlock } from "@/views/DynamicPage";

// Fallback components (used when CMS page is not published yet)
const PromoTicker = lazy(() => import("@/components/sections/PromoTicker"));
const HomeTrustStrip = lazy(() => import("@/components/sections/HomeTrustStrip"));
const HomeSlider = lazy(() => import("@/components/sections/HomeSlider"));
const HomeBestSellers = lazy(() => import("@/components/sections/HomeBestSellers"));
const HomePromoDual = lazy(() => import("@/components/sections/HomePromoDual"));
const HomeB2BSection = lazy(() => import("@/components/sections/HomeB2BSection"));
const HomeSeoContent = lazy(() => import("@/components/sections/SeoContent").then(m => ({ default: m.HomeSeoContent })));
const MobileStickyBar = lazy(() => import("@/components/sections/MobileStickyBar"));

const DEFAULT_TITLE = "Ma Papeterie | Fournitures de bureau & scolaires — Expert conseil en ligne";
const DEFAULT_DESC = "Ma Papeterie à Chaumont (52000) : 40 000+ fournitures de bureau et scolaires sélectionnées par des experts. Conseil personnalisé, livraison rapide, services B2B.";

const SectionFallback = () => (
  <div className="py-20">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-muted animate-pulse h-48" />
        ))}
      </div>
    </div>
  </div>
);

/** Blocks that should not get ScrollReveal animation */
const NO_SCROLL_REVEAL = new Set(["promo_ticker", "hero", "trust_strip"]);

const Index = () => {
  const { data: page } = usePublicPage("homepage");

  // CMS-driven homepage: page exists with blocks beyond just the hero
  const hasCmsContent = page && page.content.length > 1;

  const metaTitle = page?.meta_title || DEFAULT_TITLE;
  const metaDesc = page?.meta_description || DEFAULT_DESC;

  // Extract promo_ticker if it's the first block (renders above Header)
  const firstBlock = hasCmsContent ? page.content[0] : null;
  const hasTickerFirst = firstBlock?.type === "promo_ticker";
  const mainBlocks = hasCmsContent
    ? (hasTickerFirst ? page.content.slice(1) : page.content)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <meta name="keywords" content="papeterie Chaumont, fournitures bureau Haute-Marne, fournitures scolaires, expert papeterie, conseil fournitures" />
        <link rel="canonical" href="https://ma-papeterie.fr/" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.fr/" />
      </Helmet>

      {/* Promo ticker — above header */}
      {hasCmsContent ? (
        hasTickerFirst && <RenderBlock block={firstBlock!} fullWidth />
      ) : (
        <Suspense fallback={null}>
          <PromoTicker />
        </Suspense>
      )}

      <Header />

      <main id="main-content">
        {hasCmsContent ? (
          /* ── CMS-driven layout ─────────────────────────── */
          mainBlocks.map((block) => {
            const rendered = <RenderBlock key={block.id} block={block} fullWidth />;
            if (NO_SCROLL_REVEAL.has(block.type)) return rendered;
            return <ScrollReveal key={block.id}>{rendered}</ScrollReveal>;
          })
        ) : (
          /* ── Hardcoded fallback layout ─────────────────── */
          <>
            <Suspense fallback={
              <div className="py-8"><div className="container mx-auto px-4"><div className="rounded-[1rem] bg-muted animate-pulse h-[350px] md:h-[450px]" /></div></div>
            }>
              <HomeSlider />
            </Suspense>

            <Suspense fallback={null}>
              <HomeTrustStrip />
            </Suspense>

            <ScrollReveal>
              <Suspense fallback={<SectionFallback />}>
                <HomeBestSellers />
              </Suspense>
            </ScrollReveal>

            <ScrollReveal>
              <Suspense fallback={null}>
                <HomePromoDual />
              </Suspense>
            </ScrollReveal>

            <ScrollReveal>
              <Suspense fallback={null}>
                <HomeB2BSection />
              </Suspense>
            </ScrollReveal>

            <Suspense fallback={null}>
              <HomeSeoContent />
            </Suspense>
          </>
        )}
      </main>

      <Footer />

      {/* Mobile sticky bottom CTA — always shown */}
      <Suspense fallback={null}>
        <MobileStickyBar />
      </Suspense>
    </div>
  );
};

export default Index;
