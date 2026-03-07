import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: string;
  name: string;
  company: string;
  role?: string;
  image?: string;
  quote: string;
  rating: number;
  date?: string;
}

// Placeholder testimonials - replace with API call if needed
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Marie Dubois",
    company: "École Primaire Jean Piaget",
    role: "Directrice",
    quote:
      "Ma Papeterie nous a simplifié la gestion de nos fournitures scolaires. Grâce à leur liste intelligente, nous avons réduit nos délais de 50%. L'équipe est réactive et écoute nos besoins!",
    rating: 5,
    date: "Février 2026",
  },
  {
    id: "2",
    name: "Thomas Bernard",
    company: "Lycée Victor Hugo",
    role: "Responsable Logistique",
    quote:
      "Les tarifs en volume sont imbattables et la livraison est ultra-rapide. Après 3 ans de partenariat, c'est devenu notre fournisseur privilégié pour 95% de nos commandes.",
    rating: 5,
    date: "Janvier 2026",
  },
  {
    id: "3",
    name: "Isabelle Moreau",
    company: "Collège de la Vallée",
    role: "Gestionnaire",
    quote:
      "Le service relationnel de Ma Papeterie est exceptionnelle. Même pour les commandes urgentes de dernière minute, ils trouvent toujours des solutions créatives!",
    rating: 5,
    date: "Décembre 2025",
  },
  {
    id: "4",
    name: "Jean-Pierre Leclerc",
    company: "CNED (Centre National d'Enseignement à Distance)",
    role: "Responsable Approvisionnement",
    quote:
      "Partenaire stratégique depuis 5 ans. Fiabilité d'approvisionnement, innovations de service, dialogue permanent... Ma Papeterie comprend les enjeux de la pédagogie.",
    rating: 5,
    date: "Novembre 2025",
  },
];

interface TestimonialsProps {
  testimonials?: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
}

export function Testimonials({
  testimonials = DEFAULT_TESTIMONIALS,
  autoplay = true,
  autoplayInterval = 6000,
}: TestimonialsProps) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(autoplay);

  useEffect(() => {
    if (!isAutoPlay) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [isAutoPlay, testimonials.length, autoplayInterval]);

  const handlePrev = () => {
    setIsAutoPlay(false);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const testimonial = testimonials[current];

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Témoignages
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4 font-poppins">
            Ce que nos clients disent
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Découvrez comment Ma Papeterie aide les écoles et établissements à améliorer leur
            gestion logistique
          </p>
        </div>

        {/* Testimonial Card */}
        <Card className="p-8 md:p-12 mb-8 relative min-h-72 flex flex-col justify-between">
          {/* Rating Stars */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < testimonial.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-lg md:text-xl font-medium text-foreground leading-relaxed mb-6 italic">
            "{testimonial.quote}"
          </blockquote>

          {/* Author Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{testimonial.name}</p>
              <p className="text-sm text-muted-foreground">
                {testimonial.role && `${testimonial.role}, `}
                {testimonial.company}
              </p>
              {testimonial.date && (
                <p className="text-xs text-muted-foreground/70 mt-1">{testimonial.date}</p>
              )}
            </div>
            {testimonial.image && (
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-12 h-12 rounded-full border-2 border-primary"
              />
            )}
          </div>

          {/* Quotation Mark (decorative) */}
          <div className="absolute top-6 right-8 text-6xl text-primary/10 leading-none">
            "
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Indicators */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlay(false);
                  setCurrent(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === current ? "bg-primary w-6" : "bg-primary/30"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Resume Autoplay */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className="text-xs"
          >
            {isAutoPlay ? "⏸ Pause" : "▶ Continuer"}
          </Button>
        </div>
      </div>
    </section>
  );
}
