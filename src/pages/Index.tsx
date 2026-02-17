import Header from "@/components/layout/Header";
import HeroSection from "@/components/sections/HeroSection";
import PromoBanner from "@/components/sections/PromoBanner";
import ServicesSection from "@/components/sections/ServicesSection";
import CategoriesSection from "@/components/sections/CategoriesSection";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import BestSellers from "@/components/sections/BestSellers";
import { HomeSeoContent } from "@/components/sections/SeoContent";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <PromoBanner />
        <ServicesSection />
        <CategoriesSection />
        <FeaturedProducts />
        <BestSellers />
        <HomeSeoContent />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
