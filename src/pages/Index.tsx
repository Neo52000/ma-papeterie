import Header from "@/components/layout/Header";
import HeroSection from "@/components/sections/HeroSection";
import CategoriesSection from "@/components/sections/CategoriesSection";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import { HomeSeoContent } from "@/components/sections/SeoContent";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <CategoriesSection />
        <FeaturedProducts />
        <HomeSeoContent />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
