import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/sections/HeroSection";
import TrustBanner from "@/components/sections/TrustBanner";
import Footer from "@/components/layout/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const ConsumablesFinderCompact = lazy(() => import("@/components/consumables/ConsumablesFinderCompact").then(m => ({ default: m.ConsumablesFinderCompact })));
const CategoriesSection = lazy(() => import("@/components/sections/CategoriesSection"));
const FeaturedProducts = lazy(() => import("@/components/sections/FeaturedProducts"));
const BestSellers = lazy(() => import("@/components/sections/BestSellers"));
const HomeSeoContent = lazy(() => import("@/components/sections/SeoContent").then(m => ({ default: m.HomeSeoContent })));
const PromoTicker = lazy(() => import("@/components/sections/PromoTicker"));

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
        <HeroSection />
        <TrustBanner />
        <Suspense fallback={null}>
          <section className="container mx-auto px-4 py-8">
            <ConsumablesFinderCompact />
          </section>
        </Suspense>
        <ScrollReveal>
          <Suspense fallback={<SectionFallback />}>
            <CategoriesSection />
          </Suspense>
        </ScrollReveal>
        <ScrollReveal>
          <Suspense fallback={<SectionFallback />}>
            <FeaturedProducts />
          </Suspense>
        </ScrollReveal>
        <ScrollReveal>
          <Suspense fallback={<SectionFallback />}>
            <BestSellers />
          </Suspense>
        </ScrollReveal>
        <Suspense fallback={null}>
          <HomeSeoContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
