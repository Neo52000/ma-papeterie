import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Truck, Headphones } from "lucide-react";
import heroImage from "@/assets/hero-papeterie.jpg";

const HeroSection = () => {
  return (
    <section className="gradient-hero py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight font-poppins">
                Votre papeterie
                <span className="block text-primary">moderne & vintage</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Découvrez notre sélection de fournitures scolaires et de bureau, 
                alliant qualité moderne et charme rétro des années 80-90.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" className="group">
                Découvrir le catalogue
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl">
                Espace Pro
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              <div className="flex items-center gap-3">
                <div className="bg-accent text-accent-foreground p-2 rounded-full">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Paiement sécurisé</p>
                  <p className="text-xs text-muted-foreground">CB, PayPal, Virement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-secondary text-secondary-foreground p-2 rounded-full">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Livraison rapide</p>
                  <p className="text-xs text-muted-foreground">Gratuite dès 49€</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground p-2 rounded-full">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Service client</p>
                  <p className="text-xs text-muted-foreground">01 23 45 67 89</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">5000+</div>
                <div className="text-sm text-muted-foreground">Produits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-secondary">15 ans</div>
                <div className="text-sm text-muted-foreground">d'expérience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-accent">50k+</div>
                <div className="text-sm text-muted-foreground">Clients satisfaits</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-vintage">
              <img 
                src={heroImage} 
                alt="Papeterie moderne et vintage"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
            </div>
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-vintage-cream border-4 border-vintage-yellow rounded-full p-6 shadow-vintage">
              <div className="text-center">
                <div className="text-xl font-bold text-vintage-brown">-20%</div>
                <div className="text-xs text-vintage-brown">Rentrée</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;