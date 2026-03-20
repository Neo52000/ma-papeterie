import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Search, Clock, ShieldCheck, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImage from "@/assets/hero-papeterie.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  const handleImportCTA = () => {
    trackEvent('school_list_cta_clicked', { variant: 'import' });
    navigate('/listes-scolaires');
  };

  const handleSearchCTA = () => {
    trackEvent('school_list_cta_clicked', { variant: 'search' });
    navigate('/listes-scolaires?tab=search');
  };

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative">
        {/* Hero Image with overlay */}
        <div className="absolute inset-0">
          <OptimizedImage
            src={heroImage}
            alt="Fournitures scolaires et de bureau"
            className="w-full h-full object-cover"
            wrapperClassName="w-full h-full"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            width={1920}
            height={600}
            blur={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
          <div className="max-w-xl space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight font-poppins animate-fade-in-left">
              Ma Papeterie
              <span className="block">Fournitures sélectionnées par des experts</span>
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              Conseil personnalisé, gammes soigneusement choisies, livraison rapide. Plus de 40 000 références pour les professionnels et les particuliers exigeants.
            </p>

            {/* Primary CTA — Import */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="group bg-secondary text-foreground hover:bg-secondary-light font-semibold shadow-lg text-base"
                onClick={handleImportCTA}
              >
                <Upload className="mr-2 w-5 h-5" />
                Importer ma liste
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleSearchCTA}
              >
                <Search className="mr-2 w-4 h-4" />
                Trouver une classe
              </Button>
            </div>

            {/* Microcopy reassurance chips */}
            <div className="flex flex-wrap gap-3 pt-2 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
              <MicroBadge icon={<Clock className="w-3.5 h-3.5" />} text="Prêt en 2 min" />
              <MicroBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} text="SAV local" />
              <MicroBadge icon={<Star className="w-3.5 h-3.5" />} text="3 paniers au choix" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MicroBadge = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-medium backdrop-blur-sm">
    {icon}
    {text}
  </span>
);

export default HeroSection;
