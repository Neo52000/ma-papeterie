import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useMemo, useState } from "react";

interface HeroSlide {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
}

const HomeSlider = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["homepage-slider"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("static_pages")
        .select("content")
        .eq("slug", "homepage")
        .eq("status", "published")
        .maybeSingle();

      const row = data as { content?: unknown } | null;
      if (!row?.content) return null;

      const blocks = row.content as { type: string; slides?: HeroSlide[]; autoplay?: boolean; interval?: number }[];
      const heroBlock = blocks.find((b) => b.type === "hero");
      if (!heroBlock?.slides?.length) return null;

      return {
        slides: heroBlock.slides,
        autoplay: heroBlock.autoplay ?? true,
        interval: heroBlock.interval ?? 5000,
      };
    },
    staleTime: 5 * 60_000,
  });

  const autoplayPlugin = useMemo(
    () =>
      slides?.autoplay
        ? [Autoplay({ delay: slides.interval, stopOnInteraction: true })]
        : [],
    [slides?.autoplay, slides?.interval]
  );

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api]
  );

  if (isLoading) {
    return (
      <section className="py-8 bg-[#f9f9ff]">
        <div className="container mx-auto px-4">
          <div className="rounded-[1rem] bg-[#eff3ff] animate-pulse h-[350px] md:h-[450px]" />
        </div>
      </section>
    );
  }

  if (!slides) return null;

  return (
    <section className="py-8 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        <div
          className="rounded-[1rem] overflow-hidden relative"
          style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Bannières promotionnelles"
        >
          <Carousel opts={{ loop: true }} plugins={autoplayPlugin} setApi={setApi}>
            <CarouselContent>
              {slides.slides.map((slide, i) => (
                <CarouselItem key={i}>
                  <div className="relative min-h-[350px] md:min-h-[450px] bg-[#1e3a8a] flex items-center overflow-hidden">
                    {/* Background image */}
                    {slide.imageUrl && (
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121c2a]/70 via-[#121c2a]/40 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 px-8 md:px-16 max-w-2xl">
                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white font-poppins leading-tight">
                        {slide.title}
                      </h2>
                      {slide.subtitle && (
                        <p className="text-base md:text-lg text-white/80 mt-4 font-inter leading-relaxed">
                          {slide.subtitle}
                        </p>
                      )}
                      {slide.buttonText && slide.buttonLink && (
                        <Button
                          asChild
                          variant="cta-orange"
                          size="lg"
                          className="mt-6 bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300]"
                        >
                          <Link to={slide.buttonLink}>{slide.buttonText}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {slides.slides.length > 1 && (
              <>
                <CarouselPrevious className="left-4 bg-white/20 backdrop-blur-sm border-0 text-white hover:bg-white/40" />
                <CarouselNext className="right-4 bg-white/20 backdrop-blur-sm border-0 text-white hover:bg-white/40" />
              </>
            )}
          </Carousel>

          {/* Dot indicators */}
          {count > 1 && (
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Diapositive {current + 1} sur {count}
            </div>
          )}
          {count > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10" role="tablist" aria-label="Diapositives">
              {Array.from({ length: count }).map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  onClick={() => scrollTo(i)}
                  aria-selected={i === current}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    i === current
                      ? "bg-white w-6"
                      : "bg-white/40 hover:bg-white/60 w-2"
                  }`}
                  aria-label={`Diapositive ${i + 1} sur ${count}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeSlider;
