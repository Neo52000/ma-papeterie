import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-papeterie.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative">
        {/* Hero Image with light overlay */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Fournitures scolaires et de bureau"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
          <div className="max-w-xl space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight font-poppins">
              Fournitures Scolaires
              <span className="block">et de Bureau</span>
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed">
              Plus de 40 000 références aux meilleurs prix.
              Livraison rapide partout en France.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="group bg-secondary text-foreground hover:bg-secondary-light font-semibold shadow-lg"
                onClick={() => navigate('/catalogue')}
              >
                Voir le catalogue
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/listes-scolaires')}
              >
                Listes scolaires
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
