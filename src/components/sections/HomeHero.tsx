import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Search, Clock, ShieldCheck, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImage from "@/assets/hero-papeterie.jpg";

const HomeHero = () => {
  const navigate = useNavigate();

  const handleOrder = () => {
    navigate("/catalogue");
  };

  const handleDevis = () => {
    navigate("/contact");
  };

  const handleImportList = () => {
    trackEvent("school_list_cta_clicked", { variant: "import" });
    navigate("/listes-scolaires");
  };

  const handleSearchClass = () => {
    trackEvent("school_list_cta_clicked", { variant: "search" });
    navigate("/listes-scolaires?tab=search");
  };

  return (
    <section className="relative overflow-hidden bg-[#f9f9ff]">
      {/* Subtle tonal gradient — Atelier depth */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#e6eeff]/40 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#d9e3f7]/25 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left — Editorial Text */}
          <div className="space-y-8 order-2 md:order-1">
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-[#121c2a] leading-[1.1] tracking-[-0.02em] font-poppins animate-fade-in-left">
              Toutes vos fournitures de bureau,{" "}
              <span className="text-[#00236f]">sans perdre de temps</span>
            </h1>

            <p
              className="text-lg md:text-xl text-[#121c2a]/70 leading-relaxed font-inter animate-fade-in-up max-w-lg"
              style={{ animationDelay: "0.15s" }}
            >
              Prix compétitifs • Livraison rapide • Devis pour pros en 24h
            </p>

            {/* Primary CTAs — Gradient CTA + Atelier Secondary */}
            <div
              className="flex flex-col sm:flex-row gap-4 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <Button
                variant="cta-orange"
                size="lg"
                className="group bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300] px-8"
                onClick={handleOrder}
              >
                Commander maintenant
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="atelier-secondary"
                size="lg"
                className="border-[#c5c5d3]/25 text-[#00236f] hover:bg-[#e6eeff]"
                onClick={handleDevis}
              >
                Demander un devis
              </Button>
            </div>

            {/* Listes scolaires CTAs (preserved) */}
            <div
              className="flex flex-col sm:flex-row gap-3 animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <Button
                variant="secondary"
                size="default"
                className="group"
                onClick={handleImportList}
              >
                <Upload className="mr-2 w-4 h-4" />
                Importer ma liste
                <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="ghost"
                size="default"
                onClick={handleSearchClass}
              >
                <Search className="mr-2 w-4 h-4" />
                Trouver une classe
              </Button>
            </div>

            {/* Microbadges — Atelier surface variant */}
            <div
              className="flex flex-wrap gap-3 animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <MicroBadge icon={<Clock className="w-3.5 h-3.5" />} text="Prêt en 2 min" />
              <MicroBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} text="SAV local" />
              <MicroBadge icon={<Star className="w-3.5 h-3.5" />} text="40 000+ références" />
            </div>
          </div>

          {/* Right — Image with rounded-lg per design system */}
          <div className="order-1 md:order-2 animate-fade-in-up">
            <div className="relative rounded-[1rem] overflow-hidden" style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}>
              <OptimizedImage
                src={heroImage}
                alt="Fournitures de bureau et scolaires"
                className="w-full h-full object-cover"
                wrapperClassName="w-full aspect-[4/3] md:aspect-[3/2]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={800}
                height={600}
                blur={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MicroBadge = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#e6eeff] text-[#00236f] text-xs font-medium font-inter">
    {icon}
    {text}
  </span>
);

export default HomeHero;
