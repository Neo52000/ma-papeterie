import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import HomeHero from "@/components/sections/HomeHero";
import Footer from "@/components/layout/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const PromoTicker = lazy(() => import("@/components/sections/PromoTicker"));
const HomeTrustStrip = lazy(() => import("@/components/sections/HomeTrustStrip"));
const HomeCategoryGrid = lazy(() => import("@/components/sections/HomeCategoryGrid"));
const HomePromoBanner = lazy(() => import("@/components/sections/HomePromoBanner"));
const HomeBestSellers = lazy(() => import("@/components/sections/HomeBestSellers"));
const HomePromoDual = lazy(() => import("@/components/sections/HomePromoDual"));
const HomeB2BSection = lazy(() => import("@/components/sections/HomeB2BSection"));
const HomeGuidesSection = lazy(() => import("@/components/sections/HomeGuidesSection"));
const HomeSeoContent = lazy(() => import("@/components/sections/SeoContent").then(m => ({ default: m.HomeSeoContent })));
const MobileStickyBar = lazy(() => import("@/components/sections/MobileStickyBar"));

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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ma Papeterie | Fournitures de bureau & scolaires — Expert conseil en ligne</title>
        <meta name="description" content="Ma Papeterie à Chaumont (52000) : 40 000+ fournitures de bureau et scolaires sélectionnées par des experts. Conseil personnalisé, livraison rapide, services B2B." />
        <meta name="keywords" content="papeterie Chaumont, fournitures bureau Haute-Marne, fournitures scolaires, expert papeterie, conseil fournitures" />
        <link rel="canonical" href="https://ma-papeterie.fr/" />
        <meta property="og:title" content="Ma Papeterie | Fournitures de bureau & scolaires — Expert conseil" />
        <meta property="og:description" content="Ma Papeterie : 40 000+ fournitures sélectionnées par des experts. Conseil personnalisé, livraison rapide. Particuliers et professionnels." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.fr/" />
      </Helmet>
      <Suspense fallback={null}>
        <PromoTicker />
      </Suspense>
      <Header />
      <main id="main-content">
        {/* 1. Hero — split layout with primary CTAs + listes scolaires */}
        <HomeHero />

        {/* 2. Trust strip — reassurance icons (right after hero per Stitch mockups) */}
        <Suspense fallback={null}>
          <HomeTrustStrip />
        </Suspense>

        {/* 3. Category shortcuts — 8 icon cards */}
        <ScrollReveal>
          <Suspense fallback={<SectionFallback />}>
            <HomeCategoryGrid />
          </Suspense>
        </ScrollReveal>

        {/* 4. Promo banner — BIENVENUE10 (between categories and products) */}
        <Suspense fallback={null}>
          <HomePromoBanner />
        </Suspense>

        {/* 5. Best sellers — featured products with orange CTAs */}
        <ScrollReveal>
          <Suspense fallback={<SectionFallback />}>
            <HomeBestSellers />
          </Suspense>
        </ScrollReveal>

        {/* 6. Dual promo banners — Destockage mobilier + Pack Rentrée Pro */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <HomePromoDual />
          </Suspense>
        </ScrollReveal>

        {/* 7. B2B section — pro block with inline quote form */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <HomeB2BSection />
          </Suspense>
        </ScrollReveal>

        {/* 8. Guides — 3 article cards */}
        <ScrollReveal>
          <Suspense fallback={null}>
            <HomeGuidesSection />
          </Suspense>
        </ScrollReveal>

        {/* 9. SEO content */}
        <Suspense fallback={null}>
          <HomeSeoContent />
        </Suspense>
      </main>
      <Footer />

      {/* Mobile sticky bottom CTA */}
      <Suspense fallback={null}>
        <MobileStickyBar />
      </Suspense>
    </div>
  );
};

export default Index;
