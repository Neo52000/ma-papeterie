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
            blur={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
          <div className="max-w-xl space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight font-poppins">
              La rentrée en
              <span className="block">2 minutes chrono</span>
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed">
              Importez la liste de votre école, notre IA prépare 3 paniers prêts à commander. Plus de 40 000 références aux meilleurs prix.
            </p>

            {/* Primary CTA — Import */}
            <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="flex flex-wrap gap-3 pt-2">
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
