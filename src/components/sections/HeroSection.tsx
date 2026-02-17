import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Truck, Headphones, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-papeterie.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary py-20 md:py-28">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary-light/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary-light px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-secondary/20">
              <Sparkles className="w-4 h-4" />
              Papeterie & Services à Chaumont
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight font-poppins">
                Votre papeterie
                <span className="block bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                  moderne & vintage
                </span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-lg">
                Découvrez notre sélection de fournitures scolaires et de bureau, 
                alliant qualité moderne et charme rétro des années 80-90.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="xl" 
                className="group bg-secondary text-foreground hover:bg-secondary-light font-semibold shadow-lg shadow-secondary/30 hover:shadow-xl hover:shadow-secondary/40 transition-all duration-300"
                onClick={() => navigate('/catalogue')}
              >
                Découvrir le catalogue
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="xl" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm"
                onClick={() => navigate('/pack-pro-local-chaumont')}
              >
                Espace Pro
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              {[
                { icon: Shield, title: "Paiement sécurisé", sub: "CB, PayPal, Virement" },
                { icon: Truck, title: "Livraison rapide", sub: "Gratuite dès 49€" },
                { icon: Headphones, title: "Service client", sub: "07 45 062 162" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3 bg-primary-foreground/5 rounded-xl p-3 backdrop-blur-sm border border-primary-foreground/10">
                  <div className="bg-secondary/20 p-2 rounded-lg">
                    <item.icon className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary-foreground">{item.title}</p>
                    <p className="text-xs text-primary-foreground/60">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-primary-foreground/10">
              {[
                { value: "5000+", label: "Produits" },
                { value: "15 ans", label: "d'expérience" },
                { value: "50k+", label: "Clients satisfaits" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-secondary">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-primary-foreground/10">
              <img 
                src={heroImage} 
                alt="Papeterie moderne et vintage à Chaumont"
                className="w-full h-[520px] object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/10"></div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -left-4 bg-secondary text-foreground rounded-2xl px-5 py-4 shadow-xl shadow-secondary/30 animate-scale-in" style={{ animationDelay: '0.5s' }}>
              <div className="text-center">
                <div className="text-2xl font-bold">-20%</div>
                <div className="text-xs font-medium opacity-80">Rentrée</div>
              </div>
            </div>
            
            {/* Second floating element */}
            <div className="absolute -top-4 -right-4 bg-card text-card-foreground rounded-2xl px-4 py-3 shadow-xl animate-scale-in" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(145, 65%, 45%)' }} />
                <span className="text-sm font-medium">Ouvert maintenant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
