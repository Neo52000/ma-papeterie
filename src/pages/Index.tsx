import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/sections/HeroSection";
import TrustBanner from "@/components/sections/TrustBanner";
import Footer from "@/components/layout/Footer";

const CategoriesSection = lazy(() => import("@/components/sections/CategoriesSection"));
const FeaturedProducts = lazy(() => import("@/components/sections/FeaturedProducts"));
const BestSellers = lazy(() => import("@/components/sections/BestSellers"));
const HomeSeoContent = lazy(() => import("@/components/sections/SeoContent").then(m => ({ default: m.HomeSeoContent })));

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
        <title>Papeterie Chaumont (52000) — Fournitures scolaires & bureau</title>
        <meta name="description" content="Papeterie Reine & Fils à Chaumont : 40 000+ fournitures scolaires et de bureau, impressions, tampons, plaques d'immatriculation. Ouvert lundi–samedi." />
        <link rel="canonical" href="https://ma-papeterie.fr/" />
        <meta property="og:title" content="Ma Papeterie — Fournitures scolaires & bureau à Chaumont" />
        <meta property="og:description" content="Votre papeterie familiale à Chaumont depuis 2008. 40 000+ références, listes scolaires, services B2B." />
        <meta property="og:url" content="https://ma-papeterie.fr/" />
      </Helmet>
      <Header />
      <main>
        <HeroSection />
        <TrustBanner />
        <Suspense fallback={<SectionFallback />}>
          <CategoriesSection />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <FeaturedProducts />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <BestSellers />
        </Suspense>
        <Suspense fallback={null}>
          <HomeSeoContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
