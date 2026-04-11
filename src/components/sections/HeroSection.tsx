import { Clock, ShieldCheck, Star } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImage from "@/assets/hero-papeterie.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative">
        {/* Hero Image with overlay */}
        <div className="absolute inset-0">
          <OptimizedImage
            src={heroImage.src}
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
