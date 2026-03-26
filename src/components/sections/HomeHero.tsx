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
    <section className="relative overflow-hidden bg-white">
      {/* Subtle decorative shape */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#DBEAFE]/30 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#DBEAFE]/20 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left — Text */}
          <div className="space-y-6 order-2 md:order-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111827] leading-tight font-poppins animate-fade-in-left">
              Toutes vos fournitures de bureau,{" "}
              <span className="text-primary">sans perdre de temps</span>
            </h1>

            <p
              className="text-base md:text-lg text-[#374151] leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              Prix compétitifs • Livraison rapide • Devis pour pros en 24h
            </p>

            {/* Primary CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <Button
                variant="cta-orange"
                size="lg"
                className="group"
                onClick={handleOrder}
              >
                Commander maintenant
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={handleDevis}
              >
                Demander un devis
              </Button>
            </div>

            {/* Listes scolaires CTAs (preserved) */}
            <div
              className="flex flex-col sm:flex-row gap-2 animate-fade-in-up"
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

            {/* Microbadges */}
            <div
              className="flex flex-wrap gap-3 pt-2 animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <MicroBadge
                icon={<Clock className="w-3.5 h-3.5" />}
                text="Prêt en 2 min"
              />
              <MicroBadge
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                text="SAV local"
              />
              <MicroBadge
                icon={<Star className="w-3.5 h-3.5" />}
                text="40 000+ références"
              />
            </div>
          </div>

          {/* Right — Image */}
          <div className="order-1 md:order-2 animate-fade-in-up">
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
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

const MicroBadge = ({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DBEAFE] text-primary text-xs font-medium">
    {icon}
    {text}
  </span>
);

export default HomeHero;
