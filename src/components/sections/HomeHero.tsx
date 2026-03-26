import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Search, Zap, FileText, Clock, ShieldCheck, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImage from "@/assets/hero-papeterie.jpg";
import { useState } from "react";

const HomeHero = () => {
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickAdd = () => {
    if (quickSearch.trim()) {
      navigate(`/catalogue?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate("/catalogue");
    }
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
      {/* Subtle tonal gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#e6eeff]/40 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          {/* Left — Text */}
          <div className="space-y-6 order-2 md:order-1">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fd761a]/10 text-[#9d4300] text-[0.75rem] font-semibold uppercase tracking-[0.05em] font-inter animate-fade-in-up">
              Optimisez votre temps
            </span>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#121c2a] leading-[1.1] tracking-[-0.02em] font-poppins animate-fade-in-left">
              Achetez vos fournitures en{" "}
              <span className="text-[#fd761a]">2 minutes.</span>
            </h1>

            {/* Subtext */}
            <p className="text-[0.875rem] md:text-base text-[#121c2a]/60 leading-relaxed font-inter animate-fade-in-up max-w-lg" style={{ animationDelay: "0.15s" }}>
              Accédez à plus de 45 000 références professionnelles. Livraison express en 24h pour toutes vos commandes passées avant 14h.
            </p>

            {/* Quick search bar */}
            <div className="flex items-center gap-0 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <input
                type="text"
                placeholder="Entrez vos codes articles..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                className="flex-1 bg-white text-[#121c2a] text-[0.875rem] font-inter px-5 py-3.5 rounded-l-[0.75rem] border border-r-0 border-[#c5c5d3]/20 focus:outline-none focus:border-[#1e3a8a]/30 transition-all placeholder:text-[#121c2a]/30"
              />
              <Button
                variant="cta-orange"
                size="default"
                className="rounded-l-none rounded-r-[0.75rem] px-5 h-[50px] gap-2 bg-[#fd761a] hover:bg-[#9d4300]"
                onClick={handleQuickAdd}
              >
                Ajout Rapide
                <Zap className="w-4 h-4" />
              </Button>
            </div>

            {/* Micro-badges */}
            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
              <MicroBadge icon={<FileText className="w-3.5 h-3.5" />} text="Devis instantané" />
              <MicroBadge icon={<Clock className="w-3.5 h-3.5" />} text="Facturation mensuelle" />
              <MicroBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} text="Stock en temps réel" />
            </div>

            {/* Listes scolaires CTAs (preserved) */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
              <Button variant="secondary" size="default" className="group" onClick={handleImportList}>
                <Upload className="mr-2 w-4 h-4" />
                Importer ma liste
                <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="ghost" size="default" onClick={handleSearchClass}>
                <Search className="mr-2 w-4 h-4" />
                Trouver une classe
              </Button>
            </div>
          </div>

          {/* Right — Image + Quality badge */}
          <div className="order-1 md:order-2 animate-fade-in-up relative">
            <div className="relative rounded-[1rem] overflow-hidden" style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}>
              <OptimizedImage
                src={heroImage}
                alt="Fournitures de bureau et scolaires"
                className="w-full h-full object-cover"
                wrapperClassName="w-full aspect-[4/3] md:aspect-[4/3]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={700}
                height={525}
                blur={false}
              />
            </div>
            {/* Floating quality badge */}
            <div
              className="absolute -bottom-4 right-4 md:right-8 bg-white/90 backdrop-blur-sm rounded-[0.75rem] p-4 flex items-start gap-3 max-w-[220px]"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.08)" }}
            >
              <div className="w-8 h-8 rounded-full bg-[#fd761a]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4 text-[#fd761a]" />
              </div>
              <div>
                <p className="text-[0.75rem] font-semibold text-[#121c2a] font-poppins">Qualité Certifiée</p>
                <p className="text-[0.65rem] text-[#121c2a]/50 font-inter mt-0.5 leading-snug">
                  Chaque article est rigoureusement testé pour la durabilité.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MicroBadge = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-[#121c2a]/50 font-medium font-inter">
    <span className="text-[#121c2a]/40">{icon}</span>
    {text}
  </span>
);

export default HomeHero;
