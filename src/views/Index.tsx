import { lazy, Suspense } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { usePublicPage } from "@/hooks/useStaticPages";
import { RenderBlock } from "@/views/DynamicPage";

// Fallback components (used when CMS page is not published yet)
const PromoTicker = lazy(() => import("@/components/sections/PromoTicker"));
const HomeTrustStrip = lazy(() => import("@/components/sections/HomeTrustStrip"));
const HomeSlider = lazy(() => import("@/components/sections/HomeSlider"));
const HomeCategoryGrid = lazy(() => import("@/components/sections/HomeCategoryGrid"));
const HomeBestSellers = lazy(() => import("@/components/sections/HomeBestSellers"));
const HomePromoDual = lazy(() => import("@/components/sections/HomePromoDual"));
const HomeB2BSection = lazy(() => import("@/components/sections/HomeB2BSection"));
const HomeGuidesSection = lazy(() => import("@/components/sections/HomeGuidesSection"));
const Testimonials = lazy(() =>
  import("@/components/sections/Testimonials").then((m) => ({ default: m.Testimonials }))
);
const HomeNewsletterInline = lazy(() => import("@/components/sections/HomeNewsletterInline"));
const MobileStickyBar = lazy(() => import("@/components/sections/MobileStickyBar"));
const MobileStickySearch = lazy(() => import("@/components/sections/MobileStickySearch"));

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

/**
 * Homepage interactive island.
 * SEO head tags + static content are handled by index.astro / MainLayout.
 * This component only renders CMS blocks or fallback interactive sections.
 */
const Index = () => {
  const { data: page } = usePublicPage("homepage");

  // CMS-driven homepage: page exists with blocks beyond just the hero
  const hasCmsContent = page && page.content.length > 1;

  // Extract promo_ticker if it's the first block (renders above main content)
  const firstBlock = hasCmsContent ? page.content[0] : null;
  const hasTickerFirst = firstBlock?.type === "promo_ticker";
  const mainBlocks = hasCmsContent
    ? (hasTickerFirst ? page.content.slice(1) : page.content)
    : [];

  return (
    <>
      {/* Promo ticker */}
      {hasCmsContent ? (
        hasTickerFirst && <RenderBlock block={firstBlock!} fullWidth />
      ) : (
        <Suspense fallback={null}>
          <PromoTicker />
        </Suspense>
      )}

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
              <HomeCategoryGrid />
            </Suspense>
          </ScrollReveal>

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

          <ScrollReveal>
            <Suspense fallback={null}>
              <Testimonials />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal>
            <Suspense fallback={null}>
              <HomeNewsletterInline />
            </Suspense>
          </ScrollReveal>

          <ScrollReveal>
            <Suspense fallback={null}>
              <HomeGuidesSection />
            </Suspense>
          </ScrollReveal>
        </>
      )}

      {/* Mobile sticky bottom CTA */}
      <Suspense fallback={null}>
        <MobileStickyBar />
      </Suspense>

      {/* Mobile floating search (appears after scrolling past hero) */}
      <Suspense fallback={null}>
        <MobileStickySearch />
      </Suspense>
    </>
  );
};

export default Index;
